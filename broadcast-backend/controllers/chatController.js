const Batch = require("../models/batch");
const BatchMessage = require("../models/batchMessage");
const MessageRead = require("../models/messageRead");
const StudentBatch = require("../models/batchStudent");
const PrivateMessage = require("../models/privateMessage");
const { Teacher, Student, BatchTeacher, BatchStudent } = require("../models");
const { Op } = require("sequelize");

// FIX 1: these were missing — caused ReferenceError: admin/sendNotification is not defined
const sendNotification = require("../utils/sendNotification");
const admin = require("../config/firebase");

/*
================================================
Permission helper — Teacher ↔ Student relation
Confirms teacher and student share at least one batch.
================================================
*/
async function verifyTeacherStudentRelation(teacherId, studentId) {
  const relation = await StudentBatch.findOne({
    where: { student_id: studentId },
    include: [
      {
        model: Batch,
        include: [
          {
            model: Teacher,
            where: { id: teacherId },
            attributes: [],
            through: { attributes: [] }
          }
        ]
      }
    ]
  });
  return !!relation;
}

/*
================================================
Send Batch Message
POST /api/chat/send — Teacher only
================================================
*/
exports.sendBatchMessage = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id, message } = req.body || {};

    if (!batch_id) {
      return res.status(400).json({ success: false, message: "batch_id is required" });
    }

    const batch = await Batch.findByPk(batch_id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const assignment = await BatchTeacher.findOne({
      where: { batch_id, teacher_id: teacherId }
    });
    if (!assignment) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const createdMessages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let file_type = "file";
        if (file.mimetype.startsWith("image")) file_type = "image";
        else if (file.mimetype.includes("pdf") || file.mimetype.includes("document"))
          file_type = "document";

        const msg = await BatchMessage.create({
          batch_id,
          teacher_id: teacherId,
          message:    message || null,
          file_url:   `uploads/chat/${file.filename}`,
          file_type,
          original_name: file.originalname
        });
        createdMessages.push(msg);
      }
    } else {
      const msg = await BatchMessage.create({
        batch_id,
        teacher_id: teacherId,
        message
      });
      createdMessages.push(msg);
    }

    // Push notifications to all students
    const batchStudents = await StudentBatch.findAll({
      where:   { batch_id },
      include: [{ model: Student }]
    });

    const tokens = batchStudents.map(bs => bs.Student?.fcm_token).filter(Boolean);

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: "New Batch Message 📚",
          body:  message || "New file shared"
        },
        data: { type: "batch_chat", batch_id: batch_id.toString() }
      });
    }

    // FIX 6: emit is_mine per recipient, not true for everyone.
    // Teacher room → is_mine: true. Batch room (students) → is_mine: false.
    const io = req.app.get("io");
    createdMessages.forEach(msg => {
      const payload = msg.toJSON();
      io.to(`user_${teacherId}`).emit("new_batch_message", { ...payload, is_mine: true });
      io.to(`batch_${batch_id}`).except(`user_${teacherId}`)
        .emit("new_batch_message", { ...payload, is_mine: false });
    });

    res.json({
      success: true,
      data: createdMessages.map(msg => ({ ...msg.toJSON(), is_mine: true }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Get Batch Messages
POST /api/chat/history — Both roles, paginated
================================================
*/
exports.getBatchMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { batch_id, page = 1, limit = 20 } = req.body;

    if (!batch_id) {
      return res.status(400).json({ success: false, message: "batch_id is required" });
    }

    const batchId = Number(batch_id);

    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    if (role === "teacher") {
      const assignment = await BatchTeacher.findOne({
        where: { batch_id: batchId, teacher_id: userId }
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: "Not allowed" });
      }
    }

    if (role === "student") {
      const studentBatch = await StudentBatch.findOne({
        where: { student_id: userId, batch_id: batchId }
      });
      if (!studentBatch) {
        return res.status(403).json({ success: false, message: "You are not part of this batch" });
      }
    }

    const pageNumber  = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset      = (pageNumber - 1) * limitNumber;

    const [messages, totalMessages] = await Promise.all([
      BatchMessage.findAll({
        where:  { batch_id: batchId },
        order:  [["createdAt", "DESC"]],
        limit:  limitNumber,
        offset
      }),
      BatchMessage.count({ where: { batch_id: batchId } })
    ]);

    const formattedMessages = [];
    for (const msg of messages) {
      const data       = msg.toJSON();
      const isSender   = role === "teacher" && data.teacher_id === userId;
      const isReceiver = role === "student";
      if (!isSender && !isReceiver) continue;
      formattedMessages.push({ ...data, is_mine: isSender });
    }

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limitNumber),
      data: formattedMessages
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Mark Private Message As Read
POST /api/chat/read — Student only

FIX 2: MessageRead columns are message_id, user_id, user_role.
Old code passed student_id → ValidationError: user_id cannot be null.
================================================
*/
exports.markMessageRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { message_id } = req.body;

    if (!message_id) {
      return res.status(400).json({ success: false, message: "message_id is required" });
    }

    const message = await PrivateMessage.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.receiver_id !== userId || message.receiver_role !== role) {
      return res.status(403).json({ success: false, message: "Not allowed to mark this message" });
    }

    const [, created] = await MessageRead.findOrCreate({
      where:    { message_id, user_id: userId, user_role: role },
      defaults: { message_id, user_id: userId, user_role: role }
    });

    return res.json({
      success: true,
      message: created ? "Message marked as read" : "Already marked as read"
    });

  } catch (error) {
    console.error("markMessageRead error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Send Private Message
POST /api/chat/private/send — Both roles
================================================
*/
exports.sendPrivateMessage = async (req, res) => {
  try {
    const senderId   = req.user.id;
    const senderRole = req.user.role;
    const { receiver_id, message } = req.body;

    if (!receiver_id) {
      return res.status(400).json({ success: false, message: "receiver_id required" });
    }

    const teacherId = senderRole === "teacher" ? senderId    : receiver_id;
    const studentId = senderRole === "teacher" ? receiver_id : senderId;

    const allowed = await verifyTeacherStudentRelation(teacherId, studentId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You can only chat with users in your batches"
      });
    }

    const createdMessages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const msg = await PrivateMessage.create({
          sender_id:     senderId,
          sender_role:   senderRole,
          receiver_id,
          receiver_role: senderRole === "teacher" ? "student" : "teacher",
          message:       message || null,
          file_url:      `uploads/chat/${file.filename}`
        });
        createdMessages.push(msg);
      }
    } else {
      const msg = await PrivateMessage.create({
        sender_id:     senderId,
        sender_role:   senderRole,
        receiver_id,
        receiver_role: senderRole === "teacher" ? "student" : "teacher",
        message:       message || null,
        file_url:      null
      });
      createdMessages.push(msg);
    }

    const io = req.app.get("io");
    for (const msg of createdMessages) {
      const formatted = msg.toJSON();
      io.to(`user_${senderId}`).emit("private_message",    { ...formatted, is_mine: true  });
      io.to(`user_${receiver_id}`).emit("private_message", { ...formatted, is_mine: false });
    }

    const receiver = senderRole === "teacher"
      ? await Student.findByPk(receiver_id)
      : await Teacher.findByPk(receiver_id);

    if (receiver?.fcm_token) {
      await sendNotification({
        token: receiver.fcm_token,
        title: "New Message 💬",
        body:  message || "New file received",
        data:  { type: "private_chat", sender_id: senderId.toString() }
      });
    }

    res.json({
      success: true,
      data: createdMessages.map(msg => ({ ...msg.toJSON(), is_mine: true }))
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Get Private Messages
POST /api/chat/private/history — Both roles, paginated
================================================
*/
exports.getPrivateMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { other_user_id, page = 1, limit = 20 } = req.body;

    if (!other_user_id) {
      return res.status(400).json({ success: false, message: "other_user_id is required" });
    }

    const pageNumber  = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset      = (pageNumber - 1) * limitNumber;

    const whereClause = {
      [Op.or]: [
        { sender_id: userId,   sender_role: role,   receiver_id: other_user_id },
        { receiver_id: userId, receiver_role: role,  sender_id: other_user_id  }
      ]
    };

    const [messages, totalMessages] = await Promise.all([
      PrivateMessage.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: limitNumber,
        offset
      }),
      PrivateMessage.count({ where: whereClause })
    ]);

    const formattedMessages = [];
    for (const msg of messages) {
      const data       = msg.toJSON();
      const isSender   = data.sender_id   === userId && data.sender_role   === role;
      const isReceiver = data.receiver_id === userId && data.receiver_role === role;
      if (!isSender && !isReceiver) continue;
      formattedMessages.push({ ...data, is_mine: isSender });
    }

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limitNumber),
      data: formattedMessages
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Get Conversations List  (unified)
POST /api/chat/conversations — Both roles

Returns all private chats + all batch chats
merged and sorted by most recent activity.
Each item has a `type` field ("private" | "batch")
so the frontend can render them uniformly.
================================================
*/
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    // ── 1. PRIVATE CONVERSATIONS ──────────────────────────────────────
    const privateMessages = await PrivateMessage.findAll({
      where: {
        [Op.or]: [
          { sender_id:   userId, sender_role:   role },
          { receiver_id: userId, receiver_role: role }
        ]
      },
      order: [["createdAt", "DESC"]]
    });

    // Deduplicate — keep only the most recent message per other user
    const privateMap = new Map();
    const otherUserIds = { teacher: new Set(), student: new Set() };

    for (const msg of privateMessages) {
      const isSender   = msg.sender_id === userId && msg.sender_role === role;
      const isReceiver = msg.receiver_id === userId && msg.receiver_role === role;
      if (!isSender && !isReceiver) continue;

      const otherUserId = isSender ? msg.receiver_id   : msg.sender_id;
      const otherRole   = isSender ? msg.receiver_role : msg.sender_role;
      const mapKey      = `${otherRole}_${otherUserId}`;

      if (!privateMap.has(mapKey)) {
        privateMap.set(mapKey, {
          type:         "private",
          other_user_id:   otherUserId,
          other_user_role: otherRole,
          last_message: msg.message,
          file:         msg.file_url,
          time:         msg.createdAt,
          is_mine:      isSender,
          unread_count: 0
        });
        otherUserIds[otherRole]?.add(otherUserId);
      }
    }

    // Batch-fetch all other users in 2 queries instead of N
    const [otherTeachers, otherStudents] = await Promise.all([
      otherUserIds.teacher.size > 0
        ? Teacher.findAll({ where: { id: [...otherUserIds.teacher] }, attributes: ["id", "name", "profile_image"] })
        : [],
      otherUserIds.student.size > 0
        ? Student.findAll({ where: { id: [...otherUserIds.student] }, attributes: ["id", "name", "profile_image"] })
        : []
    ]);

    const teacherMap = new Map(otherTeachers.map(t => [t.id, t]));
    const studentMap = new Map(otherStudents.map(s => [s.id, s]));

    const privateConversations = Array.from(privateMap.values()).map(c => ({
      ...c,
      user: c.other_user_role === "teacher"
        ? teacherMap.get(c.other_user_id)
        : studentMap.get(c.other_user_id)
    }));

    // ── 2. BATCH CONVERSATIONS ────────────────────────────────────────
    const batchRows = role === "teacher"
      ? await BatchTeacher.findAll({ where: { teacher_id: userId }, include: [{ model: Batch }] })
      : await BatchStudent.findAll({ where: { student_id: userId }, include: [{ model: Batch }] });

    const batches = batchRows.map(r => r.Batch).filter(Boolean);

    const batchConversations = await Promise.all(
      batches.map(async batch => {
        const lastMessage = await BatchMessage.findOne({
          where: { batch_id: batch.id },
          order: [["createdAt", "DESC"]]
        });
        return {
          type:         "batch",
          batch: {
            id:            batch.id,
            name:          batch.name,
            profile_image: batch.profile_image || null
          },
          last_message: lastMessage?.message   || null,
          file:         lastMessage?.file_url  || null,
          file_type:    lastMessage?.file_type || null,
          time:         lastMessage?.createdAt || null,
          is_mine:      lastMessage ? lastMessage.teacher_id === userId : false
        };
      })
    );

    // ── 3. MERGE + SORT by most recent ────────────────────────────────
    const conversations = [
      ...privateConversations,
      ...batchConversations
    ].sort((a, b) => {
      const tA = a.time ? new Date(a.time).getTime() : 0;
      const tB = b.time ? new Date(b.time).getTime() : 0;
      return tB - tA;
    });

    res.json({ success: true, data: conversations });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};