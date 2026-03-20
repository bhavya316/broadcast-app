const Students = require("../models/student");

exports.getAllStudents = async (req, res) => {
  try {

    const students = await Students.findAll({
      attributes: ["id", "name", "phone_number", "erp_id", "standard", "location", "age", "date_of_birth", "profile_image"]
    });

    res.json(students);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteStudent = async (req, res) => {
  try {

    const { id } = req.params;

    await Students.destroy({
      where: { id }
    });

    res.json({ message: "Student deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone_number, erp_id, standard, location, age, date_of_birth } = req.body;

    const student = await Students.findByPk(id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    await student.update({ name, phone_number, erp_id, standard, location, age, date_of_birth });

    res.json({ success: true, student });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Phone number or ERP ID already in use" });
    }
    res.status(500).json({ error: err.message });
  }
};