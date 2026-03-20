const Notice = require("../models/notice");
const NoticeDelivery = require("../models/noticeDelivery");
const BatchTeacher = require("../models/BatchTeacher");
const BatchStudent = require("../models/batchStudent");
const Batch = require("../models/batch");
const Student = require("../models/student");
const NoticeBatch = require("../models/noticeBatch");
const Teacher = require("../models/teacher");
const { Op } = require("sequelize");
const admin = require("../config/firebase");


/*
CREATE NOTICE
*/

exports.createNotice = async (req, res) => {

  try {

    const {
      title,
      body,
      pin_message,
      high_priority,
      target_type,
      student_ids,
      batch_ids,
      expiry_date
    } = req.body;

    /*
    ================================================
    🧠 TITLE VALIDATION
    ================================================
    */

    if (title.trim().split(/\s+/).length > 10) {
      return res.status(400).json({
        message: "Title cannot exceed 10 words"
      });
    }

    /*
    ================================================
    🔥 NORMALIZE INPUT (IMPORTANT FOR FORMDATA)
    ================================================
    */

    const normalizedBatchIds = batch_ids
      ? batch_ids.map(id => Number(id))
      : [];

    const normalizedStudentIds = student_ids
      ? student_ids.map(id => Number(id))
      : [];

    /*
    ================================================
    🔐 VALIDATE BATCH OWNERSHIP (FIXED)
    ================================================
    */

    if (["batch", "multiple_batches"].includes(target_type)) {

      if (!normalizedBatchIds.length) {
        return res.status(400).json({
          message: "batch_ids required"
        });
      }

      const assignments = await BatchTeacher.findAll({
        where: {
          batch_id: normalizedBatchIds,
          teacher_id: req.user.id
        }
      });

      if (assignments.length !== normalizedBatchIds.length) {
        return res.status(403).json({
          message: "You are not allowed to send notice to one or more batches"
        });
      }
    }

    /*
    ================================================
    💾 CREATE NOTICE
    For institute-wide notices created by a teacher,
    set status "pending" and skip delivery creation —
    deliveries are generated only when admin approves.
    ================================================
    */

    const isInstituteByTeacher = target_type === "institute";

    const notice = await Notice.create({
      teacher_id: req.user.id,
      title,
      body,
      pin_message,
      high_priority,
      target_type,
      expiry_date,
      status: isInstituteByTeacher ? "pending" : "approved"
    });

    // Institute notices go to approval queue — no deliveries yet
    if (isInstituteByTeacher) {
      return res.json({
        success: true,
        notice,
        message: "Notice submitted for admin approval"
      });
    }

    /*
    ================================================
    📦 GENERATE DELIVERIES
    ================================================
    */

    let deliveries = [];

    /*
    👤 DIRECT STUDENTS
    */

    if (target_type === "student" && normalizedStudentIds.length) {

      deliveries = normalizedStudentIds.map(id => ({
        notice_id: notice.id,
        student_id: id
      }));
    }

    /*
    👥 SINGLE BATCH
    */

    if (target_type === "batch" && normalizedBatchIds.length) {

      const students = await BatchStudent.findAll({
        where: { batch_id: normalizedBatchIds[0] }
      });

      deliveries = students.map(s => ({
        notice_id: notice.id,
        student_id: s.student_id
      }));
    }

    /*
    👥 MULTIPLE BATCHES
    */

    if (target_type === "multiple_batches" && normalizedBatchIds.length) {

      const students = await BatchStudent.findAll({
        where: { batch_id: normalizedBatchIds }
      });

      deliveries = students.map(s => ({
        notice_id: notice.id,
        student_id: s.student_id
      }));
    }

    /*
    🏫 INSTITUTE WIDE
    */

    if (target_type === "institute") {

      const students = await Student.findAll({
        attributes: ["id"]
      });

      deliveries = students.map(s => ({
        notice_id: notice.id,
        student_id: s.id
      }));
    }

    /*
    ================================================
    🔥 REMOVE DUPLICATES (IMPORTANT)
    ================================================
    */

    const uniqueMap = new Map();

    deliveries.forEach(d => {
      uniqueMap.set(d.student_id, d);
    });

    const uniqueDeliveries = Array.from(uniqueMap.values());

    /*
    ================================================
    📥 INSERT DELIVERIES
    ================================================
    */

    if (uniqueDeliveries.length > 0) {
      await NoticeDelivery.bulkCreate(uniqueDeliveries);
    }

    /*
    ================================================
    🔔 SEND FCM NOTIFICATIONS TO STUDENTS
    ================================================
    */
    const studentIds = uniqueDeliveries.map(d => d.student_id);
    if (studentIds.length > 0) {
      const studentsToNotify = await Student.findAll({
        where: { id: studentIds },
        attributes: ["fcm_token"]
      });
      const tokens = studentsToNotify.map(s => s.fcm_token).filter(Boolean);
      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: "New Notice 📢",
            body: title,
          },
          data: {
            type: "notice",
            notice_id: notice.id.toString()
          }
        });
      }
    }

    /*
    ================================================
    📤 RESPONSE
    ================================================
    */

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


/*
GET NOTICES
Teacher + Student
*/

exports.getNotices = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    /*
    --------------------------------
    TEACHER VIEW
    --------------------------------
    */
    if (role === "teacher") {
      const { Op } = require("sequelize");

      const notices = await Notice.findAll({
        where: {
          [Op.or]: [
            // Their own notices that are NOT pending institute approval
            {
              teacher_id: userId,
              [Op.not]: { target_type: "institute", status: "pending" }
            },
            // Admin institute-wide notices (always approved)
            { teacher_id: null, target_type: "institute" }
          ]
        },
        order: [
          ["pin_message", "DESC"],
          ["high_priority", "DESC"],
          ["createdAt", "DESC"]
        ]
      });

      return res.json({
        success: true,
        notices
      });
    }

    /*
    --------------------------------
    STUDENT VIEW
    --------------------------------
    */
    if (role === "student") {

      /*
      --------------------------------
      📦 DELIVERY-BASED NOTICES
      --------------------------------
      */
      const deliveries = await NoticeDelivery.findAll({
        where: { student_id: userId },
        include: [
          {
            model: Notice,
            include: [
              {
                model: Teacher,
                as: "teacher",
                attributes: ["id", "name"]
              }
            ]
          }
        ]
      });

      const deliveryNotices = deliveries.map(d => d.Notice);


      /*
      --------------------------------
      🏫 INSTITUTE NOTICES
      --------------------------------
      */
      const instituteNotices = await Notice.findAll({
        where: {
          target_type: "institute",
          status: "approved"
        },
        include: [
          {
            model: Teacher,
            as: "teacher",
            attributes: ["id", "name"]
          }
        ]
      });


      /*
      --------------------------------
      👥 BATCH NOTICES
      --------------------------------
      */

      // Step 1: get student batch IDs
      const batchMappings = await BatchStudent.findAll({
        where: { student_id: userId }
      });

      const batchIds = batchMappings.map(b => b.batch_id);

      let batchNotices = [];

      if (batchIds.length > 0) {
        const batchNoticeLinks = await NoticeBatch.findAll({
          where: {
            batch_id: {
              [Op.in]: batchIds
            }
          },
          include: [
            {
              model: Notice,
              include: [
                {
                  model: Teacher,
                  as: "teacher",
                  attributes: ["id", "name"]
                }
              ]
            }
          ]
        });

        batchNotices = batchNoticeLinks.map(b => b.Notice);
      }


      /*
      --------------------------------
      🔥 MERGE + REMOVE DUPLICATES
      --------------------------------
      */
      const noticeMap = new Map();

      [...deliveryNotices, ...instituteNotices, ...batchNotices].forEach(n => {
        if (n) noticeMap.set(n.id, n);
      });

      const notices = Array.from(noticeMap.values());


      /*
      --------------------------------
      ⏳ FILTER EXPIRED
      --------------------------------
      */
      const filteredNotices = notices.filter(n => {
        if (!n.expiry_date) return true;
        return new Date(n.expiry_date) > new Date();
      });


      /*
      --------------------------------
      📊 SORT
      --------------------------------
      */
      filteredNotices.sort((a, b) => {
        if (a.pin_message !== b.pin_message)
          return b.pin_message - a.pin_message;

        if (a.high_priority !== b.high_priority)
          return b.high_priority - a.high_priority;

        return new Date(b.createdAt) - new Date(a.createdAt);
      });


      return res.json({
        success: true,
        notices: filteredNotices
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch notices"
    });
  }
};