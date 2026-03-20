const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const NoticeBatch = sequelize.define("NoticeBatch", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  notice_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }

});

module.exports = NoticeBatch;