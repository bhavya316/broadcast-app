const path = require("path");
const fs   = require("fs");

const Batch = require("../models/batch");
const BatchMessage = require("../models/batchMessage");
const MessageRead = require("../models/messageRead");
const StudentBatch = require("../models/batchStudent");
const PrivateMessage = require("../models/privateMessage");
const { Teacher, Student, BatchTeacher, BatchStudent } = require("../models");
const { Op } = require("sequelize");

const sendNotification = require("../utils/sendNotification");
const admin = require("../config/firebase");

// Ensure uploads/chat directory exists so file saves never throw ENOENT
const uploadDir = path.join(__dirname, "..", "uploads", "chat");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
    const teacher = await Teacher.findByPk(teacherId, { attributes: ["name"] });
    const teacherName = teacher?.name ?? null;
    const { batch_id, message, reply_to_id } = req.body || {};

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
          original_name: file.originalname,
          reply_to_id: reply_to_id ? parseInt(reply_to_id) : null
        });
        createdMessages.push(msg);
      }
    } else {
      const msg = await BatchMessage.create({
        batch_id,
        teacher_id: teacherId,
        message,
        reply_to_id: reply_to_id ? parseInt(reply_to_id) : null
      });
      createdMessages.push(msg);
    }

    // Push notifications to all students in the batch
    const batchStudents = await StudentBatch.findAll({
      where:   { batch_id },
      include: [{ model: Student }]
    });

    const tokens = batchStudents.map(bs => bs.Student?.fcm_token).filter(Boolean);

    if (tokens.length > 0) {
      const batch = await Batch.findByPk(batch_id, { attributes: ["name"] });
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
          title: batch?.name ?? "Batch Chat",
          body:  `${teacherName || "Teacher"}: ${message || "New file shared"}`,
        },
        data: {
          type:       "batch_chat",
          batch_id:   batch_id.toString(),
          batch_name: batch?.name ?? "",
        },
        android: { priority: "high" },
        apns:    { payload: { aps: { sound: "default" } } },
      });
    }

    /*
    FIX: is_mine broadcast
    Previously: emitted is_mine:true to the sender's user room AND to the
    batch room, meaning every recipient got is_mine:true on the socket event.
    Flutter was working around this by comparing teacher_id to current user,
    but the root cause was on the backend.

    Now:
      - Teacher's own user room → is_mine: true  (sender echo)
      - Batch room except teacher → is_mine: false (recipients)
    The teacher_id field is always included so Flutter can double-check
    ownership without relying solely on is_mine.
    */
    // Mark the sent messages as read for the sender immediately.
    // Without this the sender's own messages show as unread in getConversations.
    await MessageRead.bulkCreate(
      createdMessages.map(msg => ({
        message_id: msg.id,
        user_id:    teacherId,
        user_role:  "teacher"
      })),
      { ignoreDuplicates: true }
    );

    const io = req.app.get("io");

    const enrichedBatch = await Promise.all(createdMessages.map(m =>
      BatchMessage.findByPk(m.id, { include: [{ model: BatchMessage, as: "replyTo", required: false }] })
    ));

    enrichedBatch.forEach(msg => {
      const payload = msg.toJSON();
      const reply_to = payload.replyTo ? {
        id: payload.replyTo.id, message: payload.replyTo.message,
        file_url: payload.replyTo.file_url ?? null, file_type: payload.replyTo.file_type ?? null,
        sender_name: teacherName, is_mine: payload.replyTo.teacher_id === teacherId,
      } : null;
      const ep = { ...payload, reply_to, sender_name: teacherName };
      io.to(`user_${teacherId}`).emit("new_batch_message", { ...ep, is_mine: true });
      io.to(`batch_${batch_id}`).except(`user_${teacherId}`).emit("new_batch_message", { ...ep, is_mine: false });
    });

    res.json({
      success: true,
      data: enrichedBatch.map(msg => {
        const p = msg.toJSON();
        const reply_to = p.replyTo ? {
          id: p.replyTo.id, message: p.replyTo.message,
          file_url: p.replyTo.file_url ?? null, file_type: p.replyTo.file_type ?? null,
          sender_name: teacherName, is_mine: p.replyTo.teacher_id === teacherId,
        } : null;
        return { ...p, reply_to, sender_name: teacherName, is_mine: true };
      })
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
        offset,
        include: [{ model: BatchMessage, as: "replyTo", required: false }]
      }),
      BatchMessage.count({ where: { batch_id: batchId } })
    ]);

    const formattedMessages = [];
    for (const msg of messages) {
      const data     = msg.toJSON();
      // Any teacher in the batch sees all messages.
      // is_mine is true only for the message they personally sent.
      const isMine  = role === "teacher" && data.teacher_id === userId;
      const visible = role === "teacher" || role === "student";
      if (!visible) continue;

      let reply_to = null;
      if (data.replyTo) {
        const r = data.replyTo;
        reply_to = {
          id:        r.id,
          message:   r.message,
          file_url:  r.file_url  ?? null,
          file_type: r.file_type ?? null,
          is_mine:   r.teacher_id === userId,
        };
      }

      formattedMessages.push({ ...data, is_mine: isMine, reply_to });
    }

    // Mark all fetched messages as read for this user.
    // We use INSERT IGNORE so duplicate reads don't cause errors.
    // This is what powers the real unread_count in getConversations.
    const allMessages = await BatchMessage.findAll({
      where:      { batch_id: batchId },
      attributes: ["id"]
    });
    if (allMessages.length > 0) {
      const reads = allMessages.map(m => ({
        message_id: m.id,
        user_id:    userId,
        user_role:  role
      }));
      await MessageRead.bulkCreate(reads, { ignoreDuplicates: true });
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
Mark Private Messages As Read
POST /api/chat/read

FIX: Removed requireRole("student") restriction from the route so that
teachers can also mark messages as read when a student sends to them.
Both roles now use the same bulk/single-mark logic.

Accepts either:
  { other_user_id }  — bulk mark all unread from that user (used by Flutter)
  { message_id }     — single message mark (legacy, kept for compatibility)
================================================
*/
exports.markMessageRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { message_id, other_user_id } = req.body;

    // ── BULK: mark all unread private messages from other_user_id ──────────
    if (other_user_id && !message_id) {
      const [updatedCount] = await PrivateMessage.update(
        { is_read: true },
        {
          where: {
            sender_id:     other_user_id,
            receiver_id:   userId,
            receiver_role: role,
            is_read:       false
          }
        }
      );

      // Tell the sender their messages were read → blue ticks
      if (updatedCount > 0) {
        const io = req.app.get("io");
        io.to(`user_${other_user_id}`).emit("messages_read", {
          reader_id:   userId,
          reader_role: role,
        });
      }

      return res.json({
        success: true,
        message: `Marked ${updatedCount} messages as read`
      });
    }

    // ── SINGLE: mark one private message by message_id ──────────────────────
    if (!message_id) {
      return res.status(400).json({
        success: false,
        message: "message_id or other_user_id is required"
      });
    }

    const message = await PrivateMessage.findByPk(message_id);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.receiver_id !== userId || message.receiver_role !== role) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to mark this message"
      });
    }

    await message.update({ is_read: true });

    return res.json({
      success: true,
      message: "Message marked as read"
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

FIX: Added file_type and original_name fields to PrivateMessage.create()
so that the private history endpoint returns the same shape as batch
history. Previously private messages had no file_type, forcing Flutter to
sniff the type from the URL extension — which fails for edge-case formats.

NOTE: This requires the private_messages table to have file_type and
original_name columns. Run the migration in migrations/add_file_meta_to_private_messages.sql
before deploying this change.
================================================
*/
exports.sendPrivateMessage = async (req, res) => {
  try {
    const senderId   = req.user.id;
    const senderRole = req.user.role;
    const { receiver_id, message, reply_to_id } = req.body;

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

    const receiverRole = senderRole === "teacher" ? "student" : "teacher";
    const createdMessages = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // FIX: resolve file_type the same way batch messages do
        let file_type = "file";
        if (file.mimetype.startsWith("image")) file_type = "image";
        else if (file.mimetype.includes("pdf") || file.mimetype.includes("document"))
          file_type = "document";

        const msg = await PrivateMessage.create({
          sender_id:     senderId,
          sender_role:   senderRole,
          receiver_id,
          receiver_role: receiverRole,
          message:       message || null,
          file_url:      `uploads/chat/${file.filename}`,
          file_type,
          original_name: file.originalname,
          reply_to_id: reply_to_id ? parseInt(reply_to_id) : null
        });
        createdMessages.push(msg);
      }
    } else {
      const msg = await PrivateMessage.create({
        sender_id:     senderId,
        sender_role:   senderRole,
        receiver_id,
        receiver_role: receiverRole,
        message:       message || null,
        file_url:      null,
        reply_to_id: reply_to_id ? parseInt(reply_to_id) : null
      });
      createdMessages.push(msg);
    }

    // conversation_key: sorted user IDs — both sides always compute same key
    const convKey = [senderId, Number(receiver_id)].sort((a, b) => a - b).join("_");

    const io = req.app.get("io");

    const enrichedPriv = await Promise.all(createdMessages.map(m =>
      PrivateMessage.findByPk(m.id, { include: [{ model: PrivateMessage, as: "replyTo", required: false }] })
    ));

    for (const msg of enrichedPriv) {
      const formatted = msg.toJSON();
      const reply_to = formatted.replyTo ? {
        id: formatted.replyTo.id, message: formatted.replyTo.message,
        file_url: formatted.replyTo.file_url ?? null, file_type: formatted.replyTo.file_type ?? null,
        is_mine: formatted.replyTo.sender_id === senderId && formatted.replyTo.sender_role === senderRole,
      } : null;
      const ep = { ...formatted, reply_to };
      io.to(`user_${senderId}`).emit("private_message", { ...ep, is_mine: true, conversation_key: convKey });
      io.to(`user_${receiver_id}`).emit("private_message", { ...ep, is_mine: false, conversation_key: convKey });
    }

    // Push notification to receiver
    const receiver = senderRole === "teacher"
      ? await Student.findByPk(receiver_id)
      : await Teacher.findByPk(receiver_id);

    if (receiver?.fcm_token) {
      const senderModel  = senderRole === "teacher"
        ? require("../models/teacher")
        : require("../models/student");
      const senderRecord = await senderModel.findByPk(senderId, { attributes: ["name"] });
      const senderName   = senderRecord?.name ?? "Someone";

      await sendNotification({
        token: receiver.fcm_token,
        title: senderName,
        body:  message || "📷 Sent a photo",
        data:  {
          type:        "private_chat",
          sender_id:   senderId.toString(),
          sender_name: senderName,
        },
      });
    }

    res.json({
      success: true,
      data: enrichedPriv.map(msg => {
        const f = msg.toJSON();
        const reply_to = f.replyTo ? {
          id: f.replyTo.id, message: f.replyTo.message,
          file_url: f.replyTo.file_url ?? null, file_type: f.replyTo.file_type ?? null,
          is_mine: f.replyTo.sender_id === senderId && f.replyTo.sender_role === senderRole,
        } : null;
        return { ...f, reply_to, is_mine: true };
      })
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
        offset,
        include: [{ model: PrivateMessage, as: "replyTo", required: false }]
      }),
      PrivateMessage.count({ where: whereClause })
    ]);

    const formattedMessages = [];
    for (const msg of messages) {
      const data       = msg.toJSON();
      const isSender   = data.sender_id   === userId && data.sender_role   === role;
      const isReceiver = data.receiver_id === userId && data.receiver_role === role;
      if (!isSender && !isReceiver) continue;

      let reply_to = null;
      if (data.replyTo) {
        const r = data.replyTo;
        reply_to = {
          id:        r.id,
          message:   r.message,
          file_url:  r.file_url  ?? null,
          file_type: r.file_type ?? null,
          is_mine:   r.sender_id === userId && r.sender_role === role,
        };
      }

      formattedMessages.push({ ...data, is_mine: isSender, reply_to });
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
Get Conversations List (unified)
POST /api/chat/conversations — Both roles

FIX: Added unread_count to private conversations.
Previously this always returned 0. Now it counts private_messages where
receiver_id = userId AND is_read = false, grouped per sender.

Batch conversations still return 0 — there is no per-user read tracking
for batch messages (message_reads is batch-message-scoped, not per-user
for whole conversations). The Flutter app manages batch unread badges
in-memory via socket events, which is acceptable behaviour.
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
          type:            "private",
          other_user_id:   otherUserId,
          other_user_role: otherRole,
          last_message:    msg.message,
          file:            msg.file_url,
          time:            msg.createdAt,
          is_mine:         isSender,
          unread_count:    0       // will be filled below
        });
        otherUserIds[otherRole]?.add(otherUserId);
      }
    }

    // FIX: compute real unread counts from private_messages.is_read
    // One query that groups by sender_id — O(1) DB round trips regardless
    // of how many conversations the user has.
    const unreadRows = await PrivateMessage.findAll({
      attributes: [
        "sender_id",
        [require("sequelize").fn("COUNT", require("sequelize").col("id")), "cnt"]
      ],
      where: {
        receiver_id:   userId,
        receiver_role: role,
        is_read:       false
      },
      group: ["sender_id"],
      raw: true
    });

    // Build a quick lookup: senderId → unread count
    const unreadMap = {};
    for (const row of unreadRows) {
      unreadMap[row.sender_id] = parseInt(row.cnt, 10);
    }

    // Determine the other user's role for each sender so we can match the map key
    // We need to find sender_role per sender_id. Pull from the messages we
    // already have (they're still in memory above).
    const senderRoleMap = {};
    for (const msg of privateMessages) {
      const isIncoming = msg.receiver_id === userId && msg.receiver_role === role;
      if (isIncoming && !senderRoleMap[msg.sender_id]) {
        senderRoleMap[msg.sender_id] = msg.sender_role;
      }
    }

    // Apply unread counts to the conversation map
    for (const [senderId, count] of Object.entries(unreadMap)) {
      const senderRole = senderRoleMap[senderId];
      if (!senderRole) continue;
      const mapKey = `${senderRole}_${senderId}`;
      if (privateMap.has(mapKey)) {
        const conv = privateMap.get(mapKey);
        privateMap.set(mapKey, { ...conv, unread_count: count });
      }
    }

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
          is_mine:      lastMessage ? lastMessage.teacher_id === userId : false,
          // Real unread count: batch messages not yet read by this user.
          // message_reads tracks which messages each user has seen.
          unread_count: await BatchMessage.count({
            where: { batch_id: batch.id },
            include: [{
              model:    MessageRead,
              required: false,
              where:    { user_id: userId, user_role: role }
            }],
            // Count rows where no MessageRead exists for this user
            having: require("sequelize").literal(
              "COUNT(MessageReads.id) = 0"
            ),
            group: ["BatchMessage.id"]
          }).then(r => r.length)
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
/*
================================================
Get which page a specific message is on
POST /api/chat/message-page
Body: { message_id, chat_type: "batch"|"private", batch_id?, other_user_id?, limit? }
Returns: { success, page }
================================================
*/
exports.getMessagePage = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { message_id, chat_type, batch_id, other_user_id, limit = 20 } = req.body;

    if (!message_id || !chat_type) {
      return res.status(400).json({ success: false, message: "message_id and chat_type are required" });
    }

    const limitNumber = parseInt(limit);
    let position; // 0-based rank of the message (0 = newest)

    if (chat_type === "batch") {
      if (!batch_id) {
        return res.status(400).json({ success: false, message: "batch_id is required for batch chat" });
      }

      // Count how many messages are NEWER than (or equal to) the target message
      // ORDER is DESC by createdAt, so position = count of messages with createdAt >= target
      const targetMsg = await BatchMessage.findOne({ where: { id: message_id, batch_id } });
      if (!targetMsg) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }

      // Count messages that come BEFORE this one in DESC order (i.e. newer)
      const newerCount = await BatchMessage.count({
        where: {
          batch_id,
          createdAt: { [Op.gt]: targetMsg.createdAt }
        }
      });

      // position is 0-based index in the DESC ordered list
      position = newerCount;

    } else if (chat_type === "private") {
      if (!other_user_id) {
        return res.status(400).json({ success: false, message: "other_user_id is required for private chat" });
      }

      const whereClause = {
        [Op.or]: [
          { sender_id: userId,   sender_role: role,   receiver_id: other_user_id },
          { receiver_id: userId, receiver_role: role,  sender_id: other_user_id  }
        ]
      };

      const targetMsg = await PrivateMessage.findOne({
        where: { id: message_id, ...whereClause[Op.or] ? { [Op.or]: whereClause[Op.or] } : {} }
      });

      // Simpler: just find the message directly by id and verify it belongs to this conversation
      const targetMsgDirect = await PrivateMessage.findOne({
        where: {
          id: message_id,
          [Op.or]: [
            { sender_id: userId,   receiver_id: other_user_id },
            { receiver_id: userId, sender_id: other_user_id  }
          ]
        }
      });

      if (!targetMsgDirect) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }

      const newerCount = await PrivateMessage.count({
        where: {
          [Op.or]: [
            { sender_id: userId,   receiver_id: other_user_id },
            { receiver_id: userId, sender_id: other_user_id  }
          ],
          createdAt: { [Op.gt]: targetMsgDirect.createdAt }
        }
      });

      position = newerCount;

    } else {
      return res.status(400).json({ success: false, message: "chat_type must be 'batch' or 'private'" });
    }

    // Page is 1-based. Position 0 = newest = page 1.
    const page = Math.floor(position / limitNumber) + 1;

    return res.json({ success: true, page });

  } catch (error) {
    console.error("getMessagePage error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
================================================
Get Chat Media (images, files, links)
POST /api/chat/media
Body: { chat_type: "batch"|"private", batch_id?, other_user_id?, page?, limit? }
Returns: { success, page, totalPages, data: [...messages with file_url] }
================================================
*/
exports.getChatMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;
    const { chat_type, batch_id, other_user_id, page = 1, limit = 30 } = req.body;

    if (!chat_type) {
      return res.status(400).json({ success: false, message: "chat_type is required" });
    }

    const pageNumber  = parseInt(page);
    const limitNumber = parseInt(limit);
    const offset      = (pageNumber - 1) * limitNumber;

    const mediaWhere = { file_url: { [Op.ne]: null } };

    if (chat_type === "batch") {
      if (!batch_id) {
        return res.status(400).json({ success: false, message: "batch_id is required" });
      }

      const [messages, total] = await Promise.all([
        BatchMessage.findAll({
          where:  { batch_id, ...mediaWhere },
          order:  [["createdAt", "DESC"]],
          limit:  limitNumber,
          offset,
        }),
        BatchMessage.count({ where: { batch_id, ...mediaWhere } }),
      ]);

      const data = messages.map(m => {
        const d = m.toJSON();
        return {
          id:            d.id,
          file_url:      d.file_url,
          file_type:     d.file_type,
          original_name: d.original_name,
          message:       d.message,
          is_mine:       role === "teacher" && d.teacher_id === userId,
          createdAt:     d.createdAt,
        };
      });

      return res.json({
        success: true,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        data,
      });

    } else if (chat_type === "private") {
      if (!other_user_id) {
        return res.status(400).json({ success: false, message: "other_user_id is required" });
      }

      const whereClause = {
        ...mediaWhere,
        [Op.or]: [
          { sender_id: userId,   receiver_id: other_user_id },
          { receiver_id: userId, sender_id:   other_user_id },
        ],
      };

      const [messages, total] = await Promise.all([
        PrivateMessage.findAll({
          where:  whereClause,
          order:  [["createdAt", "DESC"]],
          limit:  limitNumber,
          offset,
        }),
        PrivateMessage.count({ where: whereClause }),
      ]);

      const data = messages.map(m => {
        const d       = m.toJSON();
        const isMine  = d.sender_id === userId;
        return {
          id:            d.id,
          file_url:      d.file_url,
          file_type:     d.file_type,
          original_name: d.original_name,
          message:       d.message,
          is_mine:       isMine,
          createdAt:     d.createdAt,
        };
      });

      return res.json({
        success: true,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        data,
      });

    } else {
      return res.status(400).json({ success: false, message: "chat_type must be 'batch' or 'private'" });
    }

  } catch (error) {
    console.error("getChatMedia error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }

  
};

/*
================================================
Submit a report (app users)
POST /api/chat/report
Body: { reported_id, reported_role, reason? }
================================================
*/
exports.submitReport = async (req, res) => {
  try {
    const reporterId   = req.user.id;
    const reporterRole = req.user.role;
    const { reported_id, reported_role, reason } = req.body;

    if (!reported_id || !reported_role) {
      return res.status(400).json({ success: false, message: "reported_id and reported_role are required" });
    }

    const Report = require("../models/report");

    await Report.create({
      reporter_id:   reporterId,
      reporter_role: reporterRole,
      reported_id:   Number(reported_id),
      reported_role,
      reason:        reason || null,
    });

    return res.json({ success: true, message: "Report submitted" });

  } catch (error) {
    console.error("submitReport error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
