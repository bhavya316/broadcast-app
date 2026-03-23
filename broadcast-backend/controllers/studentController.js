// FIX 1: was require("../models") which imports the whole index object,
// not the Student model. Student.findByPk was undefined, causing every
// getStudentBatches call to return 404 — student saw NO batches, NO teachers.
const Student = require("../models/student");
const Batch = require("../models/batch");
const BatchStudent = require("../models/batchStudent");
const Teacher = require("../models/teacher");
const { BatchTeacher, BatchStudent: BS, Student: S } = require("../models");
const { Op } = require("sequelize");

/*
GET STUDENT BATCHES
Returns all batches the student is enrolled in, including teachers per batch.
*/
exports.getStudentBatches = async (req, res) => {
  try {
    const studentId = req.user.id;

    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: Batch,
          attributes: ["id", "name"],
          through: { attributes: [] },
          include: [
            {
              model: Teacher,
              attributes: ["id", "name"],
              through: { attributes: [] },
              required: false
            }
          ]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    res.json({
      success: true,
      batches: student.Batches
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch student batches" });
  }
};

/*
GET STUDENT BY ID
*/
exports.getStudentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const role   = req.user.role;

    // Only teachers may fetch another student's full profile card
    if (role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can view student profiles"
      });
    }

    const { student_id } = req.body;
    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: "student_id is required"
      });
    }

    const studentId = Number(student_id);

    // Load student with all their batches via association (avoids raw table name issues)
    const student = await Student.findByPk(studentId, {
      attributes: { exclude: ["id_proof", "fcm_token"] },
      include: [{
        model: Batch,
        attributes: ["id", "name"],
        through: { attributes: [] },
        required: false
      }]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Load teacher's batches via association too
    const teacher = await Teacher.findByPk(userId, {
      include: [{
        model: Batch,
        attributes: ["id"],
        through: { attributes: [] },
        required: false
      }]
    });

    const teacherBatchIds = new Set((teacher?.Batches ?? []).map(b => b.id));
    const studentBatches  = student.Batches ?? [];

    // Shared batches = batches the student is in AND the teacher teaches
    const sharedBatches = studentBatches
      .filter(b => teacherBatchIds.has(b.id))
      .map(b => ({ id: b.id, name: b.name }));

    if (sharedBatches.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Student is not in any of your batches"
      });
    }

    res.json({
      success: true,
      data: { ...student.toJSON(), shared_batches: sharedBatches }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/*
GET TEACHER STUDENTS
All unique students across all batches assigned to the teacher.
*/
exports.getTeacherStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const teacherBatches = await BatchTeacher.findAll({
      where: { teacher_id: teacherId },
      attributes: ["batch_id"]
    });

    const batchIds = teacherBatches.map(b => b.batch_id);

    if (!batchIds.length) {
      return res.json({ success: true, students: [] });
    }

    const batchStudents = await BatchStudent.findAll({
      where: { batch_id: { [Op.in]: batchIds } },
      attributes: ["student_id"]
    });

    const studentIds = [...new Set(batchStudents.map(s => s.student_id))];

    if (!studentIds.length) {
      return res.json({ success: true, students: [] });
    }

    const students = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      attributes: ["id", "name", "erp_id", "standard"]
    });

    res.json({
      success: true,
      total_students: students.length,
      students
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch teacher students" });
  }
};

exports.signup = async (req, res) => {
  const Student = require("../models/student");
  try {
    const { name, phone_number, erp_id, location, date_of_birth, age, standard, id_proof } = req.body;

    if (!name || !phone_number || !erp_id) {
      return res.status(400).json({ message: "name, phone_number and erp_id are required" });
    }

    const existingPhone = await Student.findOne({ where: { phone_number } });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const existingERP = await Student.findOne({ where: { erp_id } });
    if (existingERP) {
      return res.status(400).json({ message: "ERP ID already exists" });
    }

    const student = await Student.create({ name, phone_number, erp_id, location, date_of_birth, age, standard, id_proof });

    res.status(201).json({ success: true, student });

  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Phone number or ERP ID already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Student signup failed" });
  }
};