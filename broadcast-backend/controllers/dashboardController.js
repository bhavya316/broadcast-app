const Batch = require("../models/batch");
const BatchStudent = require("../models/batchStudent");
const { Op } = require("sequelize");
const Notice = require("../models/notice");

exports.recentNotices = async (req, res) => {

  try {

    const teacherId = req.user.id;

    const notices = await Notice.findAll({

      where: {

        teacher_id: teacherId,

        [Op.or]: [
          { expiry_date: null },
          { expiry_date: { [Op.gt]: new Date() } }
        ]

      },

      attributes: [
        "id",
        "title",
        "pin_message",
        "high_priority",
        "target_type",
        "createdAt"
      ],

      order: [
        ["createdAt", "DESC"]
      ],

      limit: 5

    });

    res.json({
      success: true,
      notices
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch recent notices"
    });

  }

};