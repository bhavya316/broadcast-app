const { PrivateMessage } = require("../models");

exports.createPrivateMessage = async ({
  sender_id,
  sender_role,
  receiver_id,
  message,
  file_url = null
}) => {
  return await PrivateMessage.create({
    sender_id,
    sender_role,
    receiver_id,
    receiver_role:
      sender_role === "teacher" ? "student" : "teacher",
    message,
    file_url
  });
};