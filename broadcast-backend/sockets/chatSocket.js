module.exports = (io) => {

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    /*
    JOIN USER ROOM
    Each user joins a personal room keyed by their ID.
    The HTTP chat endpoints emit to these rooms directly.
    */
    socket.on("join", ({ user_id, role }) => {
      socket.user_id = user_id;
      socket.role    = role;
      socket.join(`user_${user_id}`);
      console.log(`✅ user_${user_id} (${role}) joined personal room`);
    });

    /*
    JOIN BATCH ROOM
    */
    socket.on("join_batch", ({ batch_id }) => {
      socket.join(`batch_${batch_id}`);
      console.log(`✅ socket ${socket.id} joined batch_${batch_id}`);
    });

    /*
    LEAVE BATCH ROOM
    */
    socket.on("leave_batch", ({ batch_id }) => {
      socket.leave(`batch_${batch_id}`);
      console.log(`👋 socket ${socket.id} left batch_${batch_id}`);
    });

    /*
    TYPING INDICATOR

    FIX: Flutter sends { receiver_id, sender_id, is_typing }.
    Old code destructured { receiver_id, sender_id, is_typing } correctly
    on the server side but emitted { sender_id, is_typing } to the receiver.
    Flutter was reading msg['from_user_id'] — a field that never existed —
    so the typing indicator never worked on either end.

    Now: emit { sender_id, is_typing } and Flutter reads 'sender_id' directly.
    Both sides now agree on field names.
    */
    socket.on("typing", ({ receiver_id, sender_id, is_typing }) => {
      io.to(`user_${receiver_id}`).emit("typing", {
        sender_id,
        sender_role: socket.role,   // needed to distinguish same-id users
        is_typing,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });
};