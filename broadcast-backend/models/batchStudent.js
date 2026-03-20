const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BatchStudent = sequelize.define("BatchStudent", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }

});

module.exports = BatchStudent;