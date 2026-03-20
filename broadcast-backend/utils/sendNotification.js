const admin = require('../config/firebase');

const sendNotification = async ({ token, title, body, data = {} }) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
    };

    await admin.messaging().send(message);

  } catch (error) {
    console.error("FCM Error:", error);
  }
};

module.exports = sendNotification;