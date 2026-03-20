const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Batch = sequelize.define("Batch", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  profile_image: {
    type: DataTypes.STRING,
    allowNull: true
  }

});

module.exports = Batch;