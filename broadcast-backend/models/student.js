const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Student = sequelize.define("Student", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: DataTypes.STRING,

  phone_number: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },

  erp_id: {type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  location: {type: DataTypes.STRING,
    allowNull: false
  },

  date_of_birth: {type: DataTypes.DATE,
    allowNull: false
  },

  age: {type: DataTypes.INTEGER,
    allowNull: false
  },

  standard: {type: DataTypes.STRING,
    allowNull: false
  },

  profile_image: {
    type: DataTypes.STRING,
    allowNull: true
  },

  id_proof: {
    type: DataTypes.STRING,
    allowNull: true
  },

  fcm_token: {
    type: DataTypes.STRING,
    allowNull: true
  }

});

module.exports = Student;