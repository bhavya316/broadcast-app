const { Notice, Teacher, Student, NoticeDelivery } = require("../models");
const admin = require("../config/firebase");

exports.getPendingInstituteNotices = async (req, res) => {

  try {

    const notices = await Notice.findAll({

      where: {
        target_type: "institute",
        status: "pending"
      },

      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "name"]
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
      message: "Failed to fetch pending notices"
    });

  }

};

exports.approveNotice = async (req, res) => {

  try {

    const { noticeId } = req.params;

    const notice = await Notice.findByPk(noticeId);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    if (notice.status !== "pending") {
      return res.status(400).json({ message: "Notice is not pending approval" });
    }

    // Mark approved
    await notice.update({ status: "approved" });

    // Generate deliveries for ALL students now that it's approved
    const students = await Student.findAll({ attributes: ["id"] });

    const deliveries = students.map(s => ({
      notice_id: notice.id,
      student_id: s.id
    }));

    if (deliveries.length > 0) {
      await NoticeDelivery.bulkCreate(deliveries, { ignoreDuplicates: true });

      // Notify all students via FCM
      const studentsToNotify = await Student.findAll({
        where: { id: deliveries.map(d => d.student_id) },
        attributes: ["fcm_token"]
      });
      const tokens = studentsToNotify.map(s => s.fcm_token).filter(Boolean);
      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "New Notice 📢",
            body: notice.title
          },
          data: {
            type: "notice",
            notice_id: notice.id.toString()
          }
        });
      }
    }

    res.json({
      success: true,
      message: `Notice approved and delivered to ${deliveries.length} student(s)`
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: "Approval failed" });

  }

};

exports.rejectNotice = async (req, res) => {

  try {

    const { noticeId } = req.params;

    const notice = await Notice.findByPk(noticeId);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    await notice.update({ status: "rejected" });

    res.json({
      success: true,
      message: "Notice rejected"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({ message: "Rejection failed" });

  }

};

exports.getPendingInstituteNotices = async (req, res) => {

  try {

    const notices = await Notice.findAll({

      where: {
        target_type: "institute",
        status: "pending"
      },

      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "name"]
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
      message: "Failed to fetch pending notices"
    });

  }

};

exports.approveNotice = async (req, res) => {

  try {

    const { noticeId } = req.params;

    const notice = await Notice.findByPk(noticeId);

    if (!notice) {
      return res.status(404).json({
        message: "Notice not found"
      });
    }

    await notice.update({
      status: "approved"
    });

    res.json({
      success: true,
      message: "Notice approved"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Approval failed"
    });

  }

};

exports.rejectNotice = async (req, res) => {

  try {

    const { noticeId } = req.params;

    const notice = await Notice.findByPk(noticeId);

    if (!notice) {
      return res.status(404).json({
        message: "Notice not found"
      });
    }

    await notice.update({
      status: "rejected"
    });

    res.json({
      success: true,
      message: "Notice rejected"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Rejection failed"
    });

  }

};