const { Batch, BatchStudent, Student } = require("../models");

/*
Create Batch
*/

exports.createBatch = async (req, res) => {

  try {

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Batch name is required"
      });
    }

    const batch = await Batch.create({
      name
    });

    res.json({
      success: true,
      batch
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to create batch"
    });

  }

};


/*
Delete Batch
*/

exports.deleteBatch = async (req, res) => {

  try {

    const { batchId } = req.params;

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({
        message: "Batch not found"
      });
    }

    await batch.destroy();

    res.json({
      success: true,
      message: "Batch deleted successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to delete batch"
    });

  }

}; 

/*
Get All Batches (with student count)
*/

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.findAll({
      include: [
        {
          model: BatchStudent,
          attributes: []
        }
      ],
      attributes: {
        include: [
          [
            require("../config/database").fn("COUNT", require("../config/database").col("BatchStudents.id")),
            "student_count"
          ]
        ]
      },
      group: ["Batch.id"],
      order: [["createdAt", "DESC"]]
    });

    res.json({ success: true, batches });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch batches" });
  }
};


/*
Get Students in a Batch (Admin)
*/

exports.getBatchStudents = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const records = await BatchStudent.findAll({
      where: { batch_id: batchId },
      include: [
        {
          model: Student,
          attributes: ["id", "name", "erp_id", "standard", "phone_number"]
        }
      ]
    });

    const students = records.map(r => r.Student).filter(Boolean);

    res.json({
      success: true,
      batch_id: Number(batchId),
      batch_name: batch.name,
      student_count: students.length,
      students
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch batch students" });
  }
};


/*
Assign Students to Batch (Admin)
POST /admin/batches/:batchId/students
body: { student_ids: [1, 2, 3] }
*/

exports.assignStudents = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { student_ids } = req.body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ message: "student_ids[] is required" });
    }

    const batch = await Batch.findByPk(batchId);

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const records = student_ids.map((student_id) => ({
      batch_id: Number(batchId),
      student_id: Number(student_id),
    }));

    await BatchStudent.bulkCreate(records, { ignoreDuplicates: true });

    res.json({
      success: true,
      message: `${student_ids.length} student(s) assigned to batch`,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to assign students" });
  }
};


/*
GET ALL STUDY MATERIALS (Admin)
Returns all file-type messages from batch chats + private chats,
grouped by batch, with teacher and file metadata.
*/

exports.getStudyMaterials = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const BatchMessage = require("../models/batchMessage");
    const PrivateMessage = require("../models/privateMessage");
    const Teacher = require("../models/teacher");

    // Batch chat files
    const batchFiles = await BatchMessage.findAll({
      where: {
        file_url: { [Op.ne]: null }
      },
      include: [
        { model: Batch, attributes: ["id", "name"] },
        { model: Teacher, attributes: ["id", "name"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Private chat files
    const privateFiles = await PrivateMessage.findAll({
      where: {
        file_url: { [Op.ne]: null }
      },
      order: [["createdAt", "DESC"]]
    });

    const materials = batchFiles.map(m => ({
      id: m.id,
      source: "batch",
      batch_id: m.Batch?.id || null,
      batch_name: m.Batch?.name || "Unknown Batch",
      teacher_id: m.Teacher?.id || null,
      teacher_name: m.Teacher?.name || "Unknown Teacher",
      file_url: m.file_url,
      file_type: m.file_type || "file",
      original_name: m.original_name || m.file_url,
      message: m.message,
      sent_at: m.createdAt
    }));

    const privateMaterials = privateFiles.map(m => ({
      id: m.id,
      source: "private",
      batch_id: null,
      batch_name: "Private Chat",
      teacher_id: m.sender_role === "teacher" ? m.sender_id : m.receiver_id,
      teacher_name: "Private",
      file_url: m.file_url,
      file_type: "file",
      original_name: m.file_url?.split("/").pop() || "file",
      message: m.message,
      sent_at: m.createdAt
    }));

    res.json({
      success: true,
      total: materials.length + privateMaterials.length,
      materials: [...materials, ...privateMaterials]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch study materials" });
  }
};


/*
Remove Student from Batch (Admin)
DELETE /admin/batches/:batchId/students/:studentId
*/

exports.removeStudent = async (req, res) => {
  try {
    const { batchId, studentId } = req.params;

    const deleted = await BatchStudent.destroy({
      where: {
        batch_id: Number(batchId),
        student_id: Number(studentId)
      }
    });

    if (!deleted) {
      return res.status(404).json({ message: "Student not found in this batch" });
    }

    res.json({ success: true, message: "Student removed from batch" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove student" });
  }
};


/*
Upload / Update Batch Profile Image (Admin)
POST /admin/batches/:batchId/image
*/

exports.uploadBatchImage = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const imageUrl = `uploads/batch/${req.file.filename}`;
    await batch.update({ profile_image: imageUrl });

    res.json({
      success: true,
      message: "Batch image updated",
      profile_image: imageUrl
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to upload batch image" });
  }
};