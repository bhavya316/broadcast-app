const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Teacher = sequelize.define("Teacher", {

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

  education: {type: DataTypes.STRING,
    allowNull: false
  },

  degree: {type: DataTypes.STRING,
    allowNull: false
  },

  subject_taught: {type: DataTypes.STRING,
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

module.exports = Teacher;