const { Notice, Teacher, NoticeBatch, NoticeStudent, Batch, Student } = require("../models");

exports.getNotices = async (req, res) => {

  try {

    const notices = await Notice.findAll({

      include: [

        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "name"]
        },

        {
          model: NoticeBatch,
          include: [
            {
              model: Batch,
              attributes: ["id", "name"]
            }
          ]
        },

        {
          model: NoticeStudent,
          include: [
            {
              model: Student,
              attributes: ["id", "name"]
            }
          ]
        }

      ],

      order: [["createdAt", "DESC"]]

    });

    res.json({
      success: true,
      notices
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch notices"
    });

  }

};

exports.deleteNotice = async (req, res) => {

  try {

    const { noticeId } = req.params;

    const notice = await Notice.findByPk(noticeId);

    if (!notice) {
      return res.status(404).json({
        message: "Notice not found"
      });
    }

    await notice.destroy();

    res.json({
      success: true,
      message: "Notice deleted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to delete notice"
    });

  }

};

exports.createInstituteNotice = async (req, res) => {

  try {

    const { title, body, high_priority, pin_message, expiry_date } = req.body;

    const notice = await Notice.create({

      title,
      body,

      teacher_id: null, // Admin-created notice — not tied to any teacher

      target_type: "institute",

      high_priority,
      pin_message,

      expiry_date,

      status: "approved"

    });

    res.json({
      success: true,
      notice
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to create notice"
    });

  }

};