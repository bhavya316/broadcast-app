const { Batch, Teacher, BatchTeacher } = require("../models");

/*
==============================
Get Subject Assignments
==============================
*/

exports.getAssignments = async (req, res) => {

  try {

    const batches = await Batch.findAll({

      attributes: ["id", "name"],

      include: [
        {
          model: Teacher,
          attributes: ["id", "name"],
          through: { attributes: [] }
        }
      ]

    });

    res.json(batches);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch subject assignments"
    });

  }

};


/*
==============================
Update Teachers For Batch
==============================
*/

exports.updateBatchTeachers = async (req, res) => {

  try {

    const { batchId } = req.params;
    const { teacher_ids } = req.body;

    if (!Array.isArray(teacher_ids)) {
      return res.status(400).json({
        message: "teacher_ids must be an array"
      });
    }

    /*
    Remove old assignments
    */

    await BatchTeacher.destroy({
      where: { batch_id: batchId }
    });

    /*
    Insert new assignments
    */

    const records = teacher_ids.map((teacherId) => ({
      batch_id: batchId,
      teacher_id: teacherId
    }));

    await BatchTeacher.bulkCreate(records);

    res.json({
      success: true,
      message: "Teachers updated successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update teachers"
    });

  }

};