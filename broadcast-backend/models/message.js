const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define("Message", {

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

  type: {
    type: DataTypes.ENUM("text", "image", "video", "file")
  },

  content: {
    type: DataTypes.TEXT
  }

});

module.exports = Message;