const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MessageRead = sequelize.define("MessageRead", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  message_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  user_role: {
    type: DataTypes.STRING,
    allowNull: false
  },

  read_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: "message_reads",
  timestamps: false
});

module.exports = MessageRead;