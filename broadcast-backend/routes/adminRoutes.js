const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const dashboardController = require("../controllers/adminDashboardController");
const teacherController = require("../controllers/adminTeacherController");
const studentController = require("../controllers/adminStudentController");
const subjectController = require("../controllers/adminSubjectController");
const adminBatchController = require("../controllers/adminBatchController");
const adminReminderController = require("../controllers/adminReminderController");
const adminNoticeController = require("../controllers/adminNoticeController");
const adminNoticeApprovalController = require("../controllers/adminNoticeApprovalController");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const batchUpload = require("../middleware/batchUpload");

// Login is public — no token needed
router.post("/login", adminController.loginAdmin);

// All routes below require a valid admin token
router.use(verifyAdminToken);

router.get("/dashboard", dashboardController.getDashboardStats);
router.get("/teachers", teacherController.getAllTeachers);
router.delete("/teachers/:id", teacherController.deleteTeacher);
router.put("/teachers/:id", teacherController.updateTeacher);
router.get("/students", studentController.getAllStudents);
router.delete("/students/:id", studentController.deleteStudent);
router.put("/students/:id", studentController.updateStudent);
router.get("/subjects", subjectController.getAssignments);
router.put("/subjects/:batchId", subjectController.updateBatchTeachers);
router.post("/batches", adminBatchController.createBatch);
router.delete("/batches/:batchId", adminBatchController.deleteBatch);
router.get("/batches", adminBatchController.getAllBatches);
router.get("/batches/:batchId/students", adminBatchController.getBatchStudents);
router.post("/batches/:batchId/students", adminBatchController.assignStudents);
router.delete("/batches/:batchId/students/:studentId", adminBatchController.removeStudent);
router.post("/batches/:batchId/image", batchUpload.single("image"), adminBatchController.uploadBatchImage);
router.get("/study-materials", adminBatchController.getStudyMaterials);
router.get("/reminders", adminReminderController.getReminders);
router.put("/reminders/:reminderId", adminReminderController.updateReminder);
router.delete("/reminders/:reminderId", adminReminderController.deleteReminder);
router.get("/notices", adminNoticeController.getNotices);
router.get("/notice-approvals", adminNoticeApprovalController.getPendingInstituteNotices);
router.put("/notice-approvals/:noticeId/approve", adminNoticeApprovalController.approveNotice);
router.put("/notice-approvals/:noticeId/reject", adminNoticeApprovalController.rejectNotice);
router.post("/institute-notice", adminNoticeController.createInstituteNotice);
router.delete("/notices/:noticeId", adminNoticeController.deleteNotice);

module.exports = router;