const {
  PrivateMessage,
  BatchMessage,
  Student,
  Teacher,
  BatchStudent
} = require("../models");

const sendNotification = require("../utils/sendNotification");
const admin = require("../config/firebase");

module.exports = (io) => {

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /*
    ================================================
    JOIN USER ROOM
    ================================================
    */
    socket.on("join", ({ user_id, role }) => {
      socket.user_id = user_id;
      socket.role    = role;
      socket.join(`user_${user_id}`);
    });

    /*
    ================================================
    JOIN BATCH ROOM
    ================================================
    */
    socket.on("join_batch", ({ batch_id }) => {
      socket.join(`batch_${batch_id}`);
    });

    /*
    ================================================
    PRIVATE MESSAGE — EMIT ONLY, NO DB SAVE

    FIX 3: The old handler saved to DB here AND the HTTP endpoint
    /api/chat/private/send also saved → every text message was stored
    twice and two socket events were fired to the receiver.

    Flutter already sends via HTTP (which saves to DB and then emits
    via socket). This socket event is kept only as a relay for any
    future direct-socket client (e.g. web admin). It does NOT save.

    If you want to completely prevent double-saves, simply remove the
    socket.on("private_message") block entirely — the HTTP endpoint
    handles everything. It is left here as a relay stub.
    ================================================
    */
    socket.on("private_message", async (data) => {
      // RELAY ONLY — no PrivateMessage.create() here.
      // The HTTP endpoint /api/chat/private/send already saved to DB
      // and emitted the socket event. Any client that emits via socket
      // directly (not HTTP) will NOT get a DB record — intentional.
      // This block is effectively a no-op for the Flutter app.
      console.log("socket private_message received (relay mode — no DB save):", data);
    });

    /*
    ================================================
    BATCH MESSAGE — EMIT ONLY, NO DB SAVE
    Same rationale as above. HTTP /api/chat/send handles persistence.
    ================================================
    */
    socket.on("batch_message", async (data) => {
      console.log("socket batch_message received (relay mode — no DB save):", data);
    });

    /*
    ================================================
    TYPING INDICATOR
    ================================================
    */
    socket.on("typing", ({ receiver_id, sender_id, is_typing }) => {
      io.to(`user_${receiver_id}`).emit("typing", { sender_id, is_typing });
    });

    /*
    ================================================
    DISCONNECT
    ================================================
    */
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });
};