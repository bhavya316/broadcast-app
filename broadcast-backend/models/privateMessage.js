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

  /*
  FIX: Added file_type and original_name to match the batch_messages schema.
  These columns must be added via migration before deploying.
  See: migrations/add_file_meta_to_private_messages.sql
  */
  file_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  original_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },

  // Tracks whether the receiver has read this message.
  // We do NOT use the message_reads table for private messages —
  // that table has a FK to batch_messages and cannot hold private IDs.
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  reply_to_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }

}, {
  tableName: "private_messages",
  timestamps: true
});

module.exports = PrivateMessage;

// Self-referential association for reply-to-message feature
PrivateMessage.belongsTo(PrivateMessage, { foreignKey: "reply_to_id", as: "replyTo" });