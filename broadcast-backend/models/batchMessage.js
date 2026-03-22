const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BatchMessage = sequelize.define("BatchMessage", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  file_url: {
    type: DataTypes.STRING,
    allowNull: true
  },

  file_type: {
    type: DataTypes.STRING,
    allowNull: true
  },

  original_name: {
    type: DataTypes.STRING,
    allowNull: true
  },

  reply_to_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }

}, {
  tableName: "batch_messages",
  timestamps: true
});

module.exports = BatchMessage;

// Self-referential association for reply-to-message feature
BatchMessage.belongsTo(BatchMessage, { foreignKey: "reply_to_id", as: "replyTo" });