const { Notice, Teacher } = require("../models");

exports.getReminders = async (req, res) => {

  try {

    const reminders = await Notice.findAll({

      include: [
        {
          model: Teacher,
          as: "teacher",
          attributes: ["id", "name"]
        }
      ],

      order: [["createdAt", "DESC"]]

    });

    res.json({
      success: true,
      reminders
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to fetch reminders"
    });

  }

};

exports.updateReminder = async (req, res) => {

  try {

    const { reminderId } = req.params;
    const { body, expiry_date } = req.body;

    const reminder = await Notice.findByPk(reminderId);

    if (!reminder) {
      return res.status(404).json({
        message: "Reminder not found"
      });
    }

    await reminder.update({
      body,
      expiry_date
    });

    res.json({
      success: true,
      message: "Reminder updated"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update reminder"
    });

  }

};

exports.deleteReminder = async (req, res) => {

  try {

    const { reminderId } = req.params;

    const reminder = await Notice.findByPk(reminderId);

    if (!reminder) {
      return res.status(404).json({
        message: "Reminder not found"
      });
    }

    await reminder.destroy();

    res.json({
      success: true,
      message: "Reminder deleted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to delete reminder"
    });

  }

};