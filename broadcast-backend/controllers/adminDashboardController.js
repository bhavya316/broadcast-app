const Teacher = require("../models/teacher");
const Student = require("../models/student");
const Notice = require("../models/notice");
const BatchMessage = require("../models/batchMessage");
const PrivateMessage = require("../models/privateMessage");
const { Op } = require("sequelize");

exports.getDashboardStats = async (req, res) => {
  try {
    const teachers = await Teacher.count();
    const students = await Student.count();

    // Count files from both batch chats and private chats
    const [batchFiles, privateFiles] = await Promise.all([
      BatchMessage.count({ where: { file_url: { [Op.ne]: null } } }),
      PrivateMessage.count({ where: { file_url: { [Op.ne]: null } } })
    ]);
    const materials = batchFiles + privateFiles;

    // Only count notices pending admin approval
    const pendingNotices = await Notice.count({
      where: { target_type: "institute", status: "pending" }
    });

    res.json({
      teachers,
      students,
      materials,
      pendingNotices,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};