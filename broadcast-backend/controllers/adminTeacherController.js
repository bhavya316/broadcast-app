const Teachers = require("../models/teacher");

exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teachers.findAll({
      attributes: ["id", "name", "phone_number", "erp_id", "subject_taught", "education", "degree", "profile_image"]
    });

    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    await Teachers.destroy({
      where: { id }
    });

    res.json({ message: "Teacher deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, erp_id, subject_taught, education, degree } = req.body;

    const teacher = await Teachers.findByPk(id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    await teacher.update({ name, phone_number, erp_id, subject_taught, education, degree });

    res.json({ success: true, teacher });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Phone number or ERP ID already in use" });
    }
    res.status(500).json({ error: err.message });
  }
};