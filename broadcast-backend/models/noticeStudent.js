const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NoticeStudent = sequelize.define("NoticeStudent", {

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
  }

});

module.exports = NoticeStudent;