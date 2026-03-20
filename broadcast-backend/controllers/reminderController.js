const {
  Notice,
  NoticeDelivery
} = require("../models");

exports.sendReminder = async (req, res) => {
  try {

    const teacherId = req.user.id;

    const { notice_id, body, expiry_date } = req.body;

    if (!notice_id) {
      return res.status(400).json({
        success: false,
        message: "notice_id is required"
      });
    }

    const notice = await Notice.findByPk(notice_id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found"
      });
    }

    // Permission check
    if (Number(notice.teacher_id) !== Number(teacherId)) {
      return res.status(403).json({
        success: false,
        message: "You can only send reminders for your own notices"
      });
    }

    /*
    --------------------------------
    🆕 CREATE REMINDER NOTICE
    Strip any existing "Reminder N" prefix from the original title,
    find the highest reminder number already sent for this base title,
    then increment it. e.g. "Reminder 2: Fees Due" → "Reminder 3: Fees Due"
    --------------------------------
    */

    // If the notice already has a "Reminder N:" prefix, extract N and increment.
    // If it's an original notice (no prefix), start at 1.
    // This works even after the previous reminder is deleted.
    const match = notice.title.match(/^Reminder (\d+):\s*/i);
    const baseTitle = match ? notice.title.replace(/^Reminder \d+:\s*/i, "") : notice.title;
    const reminderNumber = match ? parseInt(match[1]) + 1 : 1;

    const reminderNotice = await Notice.create({
      teacher_id: teacherId,
      title: `Reminder ${reminderNumber}: ${baseTitle}`,
      body: body || notice.body,
      pin_message: false,
      high_priority: true,
      target_type: notice.target_type,
      expiry_date: expiry_date || notice.expiry_date
    });


    /*
    ----------------------------------------------------------------
    📦 COPY DELIVERY LINKS
    createNotice writes ONLY to NoticeDelivery (never NoticeStudent).
    Copying these rows is the only thing needed to make the reminder
    appear for every student who received the original notice.
    The old code also copied NoticeStudent rows which are always
    empty, so students never saw reminder notices.
    ----------------------------------------------------------------
    */
    const noticeDeliveries = await NoticeDelivery.findAll({
      where: { notice_id }
    });

    if (noticeDeliveries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Original notice has no delivery records — no students to remind"
      });
    }

    const deliveryLinks = noticeDeliveries.map(nd => ({
      notice_id: reminderNotice.id,
      student_id: nd.student_id
    }));

    await NoticeDelivery.bulkCreate(deliveryLinks);


    /*
    --------------------------------
    🗑️ DELETE ORIGINAL NOTICE
    --------------------------------
    */
    await NoticeDelivery.destroy({ where: { notice_id } });
    await Notice.destroy({ where: { id: notice_id } });

    /*
    --------------------------------
    */
    res.json({
      success: true,
      message: "Reminder sent successfully",
      data: {
        reminder_notice_id: reminderNotice.id,
        title: reminderNotice.title,
        expiry_date: reminderNotice.expiry_date
      }
    });

  } catch (error) {

    console.error("Reminder Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
};