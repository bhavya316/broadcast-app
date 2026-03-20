const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Notice = sequelize.define("Notice", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true   // NULL for admin-created notices; teacher-created notices set this to the teacher's id
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false
  },

  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  pin_message: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  high_priority: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  target_type: {
    type: DataTypes.ENUM(
      "student",
      "batch",
      "multiple_batches",
      "institute"
    ),
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM(
      "pending",
      "approved",
      "rejected"
    ),
    defaultValue: "approved",
    allowNull: true
  },

  expiry_date: {
    type: DataTypes.DATE,
    allowNull: true
  }

});

module.exports = Notice;