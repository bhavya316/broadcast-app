const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NoticeDelivery = sequelize.define("NoticeDelivery", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  notice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }

});

module.exports = NoticeDelivery;