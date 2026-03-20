const sequelize = require("../config/database");

const Teacher      = require("./teacher");
const Student      = require("./student");

const Notice         = require("./notice");
const NoticeStudent  = require("./noticeStudent");
const NoticeBatch    = require("./noticeBatch");
const NoticeDelivery = require("./noticeDelivery");

const Batch        = require("./batch");
const BatchStudent = require("./batchStudent");
const BatchMessage = require("./batchMessage");
const MessageRead  = require("./messageRead");
const BatchTeacher = require("./BatchTeacher");

const PrivateMessage = require("./privateMessage");

/*
==============================
Notice Associations
==============================
*/

Notice.hasMany(NoticeDelivery, { foreignKey: "notice_id", onDelete: "CASCADE" });
NoticeDelivery.belongsTo(Notice,   { foreignKey: "notice_id" });
NoticeDelivery.belongsTo(Student,  { foreignKey: "student_id" });
Student.hasMany(NoticeDelivery,    { foreignKey: "student_id" });

Notice.hasMany(NoticeStudent,      { foreignKey: "notice_id" });
NoticeStudent.belongsTo(Notice,    { foreignKey: "notice_id" });
NoticeStudent.belongsTo(Student,   { foreignKey: "student_id" });
Student.hasMany(NoticeStudent,     { foreignKey: "student_id" });

Notice.hasMany(NoticeBatch,        { foreignKey: "notice_id" });
NoticeBatch.belongsTo(Notice,      { foreignKey: "notice_id" });
NoticeBatch.belongsTo(Batch,       { foreignKey: "batch_id" });

Notice.belongsTo(Teacher,  { foreignKey: "teacher_id", as: "teacher" });
Teacher.hasMany(Notice,    { foreignKey: "teacher_id", as: "notices" });

/*
==============================
Batch & Student Associations
==============================
*/

Batch.hasMany(BatchStudent,        { foreignKey: "batch_id" });
BatchStudent.belongsTo(Batch,      { foreignKey: "batch_id" });
BatchStudent.belongsTo(Student,    { foreignKey: "student_id" });
Student.hasMany(BatchStudent,      { foreignKey: "student_id" });

Batch.belongsToMany(Student, {
  through:    BatchStudent,
  foreignKey: "batch_id",
  otherKey:   "student_id"
});
Student.belongsToMany(Batch, {
  through:    BatchStudent,
  foreignKey: "student_id",
  otherKey:   "batch_id"
});

/*
==============================
Batch ↔ Teacher (Many-to-Many)
==============================
*/

Batch.belongsToMany(Teacher, {
  through:    BatchTeacher,
  foreignKey: "batch_id",
  otherKey:   "teacher_id"
});
Teacher.belongsToMany(Batch, {
  through:    BatchTeacher,
  foreignKey: "teacher_id",
  otherKey:   "batch_id"
});

BatchTeacher.belongsTo(Batch,   { foreignKey: "batch_id" });
BatchTeacher.belongsTo(Teacher, { foreignKey: "teacher_id" });

/*
==============================
Batch Chat
==============================
*/

Batch.hasMany(BatchMessage,    { foreignKey: "batch_id" });
BatchMessage.belongsTo(Batch,  { foreignKey: "batch_id" });

Teacher.hasMany(BatchMessage,      { foreignKey: "teacher_id" });
BatchMessage.belongsTo(Teacher,    { foreignKey: "teacher_id" });

/*
==============================
MessageRead
FIX: actual model columns are message_id, user_id, user_role — NOT student_id.
The old associations used foreignKey: "student_id" which doesn't exist on the
MessageRead table, causing Sequelize to JOIN on a non-existent column whenever
read receipts were included in a query.
==============================
*/

BatchMessage.hasMany(MessageRead, { foreignKey: "message_id" });
MessageRead.belongsTo(BatchMessage, { foreignKey: "message_id" });

// MessageRead.user_id can refer to either a Teacher or Student (role-agnostic).
// We do NOT set up a belongsTo Student/Teacher association here because
// user_id is polymorphic (role stored in user_role column).
// Queries that need the user name fetch Teacher/Student separately.

/*
==============================
Private Chat
==============================
*/

// constraints: false because sender_id can be either Teacher or Student
Teacher.hasMany(PrivateMessage, { foreignKey: "sender_id", constraints: false });
PrivateMessage.belongsTo(Teacher, { foreignKey: "sender_id", constraints: false });

Student.hasMany(PrivateMessage, { foreignKey: "sender_id", constraints: false });
PrivateMessage.belongsTo(Student, { foreignKey: "sender_id", constraints: false });

/*
==============================
Exports
==============================
*/

module.exports = {
  sequelize,
  Teacher,
  Student,
  Notice,
  NoticeStudent,
  NoticeBatch,
  NoticeDelivery,
  Batch,
  BatchStudent,
  BatchMessage,
  MessageRead,
  PrivateMessage,
  BatchTeacher
};