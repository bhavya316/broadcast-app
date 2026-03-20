const Batch = require("../models/batch");
const BatchStudent = require("../models/batchStudent");
const Student = require("../models/student");
const Teacher = require("../models/teacher");
const { Sequelize } = require("sequelize");
const { BatchTeacher } = require("../models");


/*
================================================
ADD MULTIPLE STUDENTS TO BATCH
Teacher only
================================================
*/
exports.addStudents = async (req, res) => {
  try {
    const { batch_id, student_ids } = req.body;

    if (!batch_id || !student_ids || !Array.isArray(student_ids)) {
      return res.status(400).json({
        message: "batch_id and student_ids[] required"
      });
    }

    // FIX 3: Batch model has NO teacher_id column.
    // Ownership is stored in BatchTeacher (many-to-many).
    // Old code: batch.teacher_id !== req.user.id → always 403.
    const assignment = await BatchTeacher.findOne({
      where: { batch_id, teacher_id: req.user.id }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "You are not assigned to this batch"
      });
    }

    const records = student_ids.map(student_id => ({ batch_id, student_id }));

    await BatchStudent.bulkCreate(records, { ignoreDuplicates: true });

    res.json({ success: true, message: "Students added to batch" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add students" });
  }
};


/*
================================================
TEACHER VIEW BATCH STUDENTS
================================================
*/
exports.getBatchStudents = async (req, res) => {
  try {
    const { batch_id } = req.params;

    // FIX 4: same teacher_id issue as addStudents — use BatchTeacher
    const assignment = await BatchTeacher.findOne({
      where: { batch_id, teacher_id: req.user.id }
    });

    if (!assignment) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const students = await Student.findAll({
      include: {
        model: BatchStudent,
        where: { batch_id },
        attributes: []
      },
      attributes: ["id", "name", "phone_number", "standard", "profile_image"]
    });

    res.json({ success: true, students });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};


/*
================================================
GET TEACHER BATCHES
FIX 7: The include for Teacher must use through: {attributes:[]}
because Batch↔Teacher is belongsToMany via BatchTeacher.
Without it Sequelize throws "not associated" or generates a wrong JOIN.
================================================
*/
exports.getTeacherBatches = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const batches = await Batch.findAll({
      attributes: [
        "id",
        "name",
        "profile_image",
        [
          Sequelize.fn("COUNT", Sequelize.col("BatchStudents.student_id")),
          "student_count"
        ]
      ],
      include: [
        {
          model: Teacher,
          attributes: [],
          through: { attributes: [] },   // FIX: required for belongsToMany
          where: { id: teacherId }
        },
        {
          model: BatchStudent,
          attributes: []
        }
      ],
      group: ["Batch.id"]
    });

    res.json({ success: true, batches });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch teacher batches" });
  }
};


/*
================================================
GET BATCH DETAILS (Teacher)
Returns students in a specific batch for a teacher.
================================================
*/
exports.getBatchDetails = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { batch_id } = req.body;

    if (!batch_id) {
      return res.status(400).json({
        success: false,
        message: "batch_id is required"
      });
    }

    const batch = await Batch.findOne({
      where: { id: batch_id },
      include: [
        {
          model: Teacher,
          attributes: ["id", "name", "profile_image"],
          through: { attributes: [] },
          where: { id: teacherId }
        }
      ]
    });

    if (!batch) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this batch"
      });
    }

    const students = await BatchStudent.findAll({
      where: { batch_id },
      include: [
        {
          model: Student,
          attributes: ["id", "name", "erp_id", "standard", "profile_image"]
        }
      ]
    });

    const studentList = students.map(s => s.Student).filter(Boolean);

    res.json({
      success: true,
      data: {
        batch_id: batch.id,
        batch_name: batch.name,
        teachers: batch.Teachers.map(t => ({ id: t.id, name: t.name })),
        student_count: studentList.length,
        students: studentList
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


/*
================================================
GET STUDENT BATCH DETAILS (Student)
FIX 2 + FIX 5 + FIX 8:
- Old code returned ALL batches for the student (ignored batch_id param)
- Response shape was { data: [array] } but Flutter expects
  { data: { Batch: { id, name, Teachers: [{id, name}] } } }
- Now filters by the requested batch_id and returns the correct shape
================================================
*/
exports.getStudentBatchDetails = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { batch_id } = req.body;

    if (!batch_id) {
      return res.status(400).json({
        success: false,
        message: "batch_id is required"
      });
    }

    // Verify student is enrolled in this batch
    const enrollment = await BatchStudent.findOne({
      where: { student_id: studentId, batch_id }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this batch"
      });
    }

    // Fetch the batch with its teachers
    const batch = await Batch.findByPk(batch_id, {
      include: [
        {
          model: Teacher,
          attributes: ["id", "name","profile_image"],
          through: { attributes: [] },
          required: false
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found"
      });
    }

    // Return shape that matches what Flutter BatchDetailController expects:
    // { data: { Batch: { id, name, Teachers: [{id, name}] } } }
    return res.status(200).json({
      success: true,
      message: "Batch details fetched successfully",
      data: {
        batch_id: enrollment.id,
        student_id: studentId,
        Batch: {
          id: batch.id,
          name: batch.name,
          profile_image: batch.profile_image,
          Teachers: batch.Teachers.map(t => ({ id: t.id, name: t.name }))
        }
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


/*
================================================
SEND MESSAGE (legacy - kept for batchRoutes.js compatibility)
Teachers only. New path: POST /chat/send via chatController.
================================================
*/
const Message = require("../models/batchMessage");

exports.sendMessage = async (req, res) => {
  try {
    const { batch_id, type, content } = req.body;

    // FIX: use BatchTeacher instead of batch.teacher_id
    const assignment = await BatchTeacher.findOne({
      where: { batch_id, teacher_id: req.user.id }
    });

    if (!assignment) {
      return res.status(403).json({ message: "Not your batch" });
    }

    const message = await Message.create({
      batch_id,
      teacher_id: req.user.id,
      type,
      content
    });

    res.json({ success: true, message });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Message sending failed" });
  }
};


/*
================================================
GET BATCH MESSAGES (legacy - kept for batchRoutes.js compatibility)
New path: POST /chat/history via chatController.
================================================
*/
const MessageRead = require("../models/messageRead");

exports.getBatchMessages = async (req, res) => {
  try {
    const { batch_id } = req.params;

    if (req.user.role === "teacher") {
      const assignment = await BatchTeacher.findOne({
        where: { batch_id, teacher_id: req.user.id }
      });
      if (!assignment) {
        return res.status(403).json({ message: "Not your batch" });
      }
    }

    if (req.user.role === "student") {
      const membership = await BatchStudent.findOne({
        where: { batch_id, student_id: req.user.id }
      });
      if (!membership) {
        return res.status(403).json({ message: "Not part of this batch" });
      }
    }

    const messages = await Message.findAll({
      where: { batch_id },
      include: [{ model: MessageRead, attributes: ["user_id"] }],
      order: [["createdAt", "ASC"]]
    });

    const grouped = {};
    messages.forEach(msg => {
      const date = msg.createdAt.toISOString().split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({
        id: msg.id,
        message: msg.message,
        file_url: msg.file_url,
        file_type: msg.file_type,
        original_name: msg.original_name,
        created_at: msg.createdAt,
        read_count: msg.MessageReads ? msg.MessageReads.length : 0
      });
    });

    res.json({ success: true, grouped_messages: grouped });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};