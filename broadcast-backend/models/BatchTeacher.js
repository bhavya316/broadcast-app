const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BatchTeacher = sequelize.define("BatchTeacher", {
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
  }
});

module.exports = BatchTeacher;