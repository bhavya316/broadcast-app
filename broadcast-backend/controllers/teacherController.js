const { BatchTeacher, BatchStudent, Student } = require("../models");
const { Op } = require("sequelize");

exports.getTeacherStudents = async (req, res) => {

  try {

    const teacherId = req.user.id;

    /*
    1️⃣ Get batches assigned to teacher
    */

    const teacherBatches = await BatchTeacher.findAll({
      where: { teacher_id: teacherId },
      attributes: ["batch_id"]
    });

    const batchIds = teacherBatches.map(b => b.batch_id);

    if (!batchIds.length) {
      return res.json({
        success: true,
        students: []
      });
    }

    /*
    2️⃣ Get students from those batches
    */

    const batchStudents = await BatchStudent.findAll({
      where: {
        batch_id: { [Op.in]: batchIds }
      },
      attributes: ["student_id"]
    });

    const studentIds = [
      ...new Set(batchStudents.map(s => s.student_id))
    ];

    if (!studentIds.length) {
      return res.json({
        success: true,
        students: []
      });
    }

    /*
    3️⃣ Fetch student details
    */

    const students = await Student.findAll({
      where: {
        id: { [Op.in]: studentIds }
      },
      attributes: [
        "id",
        "name",
        "erp_id",
        "standard"
      ]
    });

    res.json({
      success: true,
      total_students: students.length,
      students
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch teacher students"
    });

  }

};

exports.signup = async (req, res) => {
  const Teacher = require("../models/teacher");
  try {
    const { name, phone_number, erp_id, education, degree, subject_taught, id_proof } = req.body;

    if (!name || !phone_number || !erp_id) {
      return res.status(400).json({ message: "name, phone_number and erp_id are required" });
    }

    const existingPhone = await Teacher.findOne({ where: { phone_number } });
    if (existingPhone) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const existingERP = await Teacher.findOne({ where: { erp_id } });
    if (existingERP) {
      return res.status(400).json({ message: "ERP ID already exists" });
    }

    const teacher = await Teacher.create({ name, phone_number, erp_id, education, degree, subject_taught, id_proof });

    res.status(201).json({ success: true, teacher });

  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Phone number or ERP ID already exists" });
    }
    console.error(error);
    res.status(500).json({ message: "Teacher signup failed" });
  }
};