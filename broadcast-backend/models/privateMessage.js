const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");

const PrivateMessage = sequelize.define("PrivateMessage", {

  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  sender_role: {
    type: DataTypes.ENUM("teacher", "student"),
    allowNull: false
  },

  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  receiver_role: {
    type: DataTypes.ENUM("teacher", "student"),
    allowNull: false
  },

  message: {
    type: DataTypes.TEXT
  },

  file_url: {
    type: DataTypes.STRING
  },

  // Tracks whether the receiver has read this message.
  // We do NOT use the message_reads table for private messages —
  // that table has a FK to batch_messages and cannot hold private IDs.
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }

}, {
  tableName: "private_messages",
  timestamps: true
});

module.exports = PrivateMessage;