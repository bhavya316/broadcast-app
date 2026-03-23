const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Report = sequelize.define("Report", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  reporter_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reporter_role: {
    type: DataTypes.ENUM("teacher", "student"),
    allowNull: false
  },
  reported_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reported_role: {
    type: DataTypes.ENUM("teacher", "student"),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM("pending", "resolved", "dismissed"),
    defaultValue: "pending"
  }
}, {
  tableName: "reports",
  timestamps: true
});

module.exports = Report;