module.exports = (sequelize, DataTypes) => {
  const Reminder = sequelize.define(
    "Reminder",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      notice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      reminder_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("pending", "sent"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "reminders",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  Reminder.associate = (models) => {
    Reminder.belongsTo(models.Notice, {
      foreignKey: "notice_id",
      as: "notice",
    });
  };

  return Reminder;
};