const cron = require("node-cron");
const { Op } = require("sequelize");

const Notice = require("../models/notice");

const startNoticeCleanupJob = () => {

  // Run every minute
  cron.schedule("* * * * *", async () => {

    try {

      const now = new Date();

      const deletedCount = await Notice.destroy({
        where: {
          expiry_date: {
            [Op.lt]: now
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} expired notices`);
      }

    } catch (error) {

      console.error("Notice Cleanup Job Error:", error);

    }

  });

};

module.exports = startNoticeCleanupJob;