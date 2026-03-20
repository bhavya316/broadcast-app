const express = require("express");
const cors    = require("cors");
const http    = require("http");
require("dotenv").config();

const { Server }               = require("socket.io");
const { sequelize }            = require("./models");
const authRoutes               = require("./routes/authRoutes");
const teacherRoutes            = require("./routes/teacherRoutes");
const studentRoutes            = require("./routes/studentRoutes");
const batchRoutes              = require("./routes/batchRoutes");
const noticeRoutes             = require("./routes/noticeRoutes");
const dashboardRoutes          = require("./routes/dashboardRoutes");
const reminderRoutes           = require("./routes/reminderRoutes");
const chatSocket               = require("./sockets/chatSocket");
const chatRoutes               = require("./routes/chatRoutes");
const startNoticeCleanupJob    = require("./jobs/noticeCleanupJob");
const adminRoutes              = require("./routes/adminRoutes");

const app = express();

// FIX 5: was restricted to localhost:5173 which blocks Flutter via ngrok.
// Open to all origins for development. Restrict to your domain in production.
app.use(cors({ origin: "*" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically so Flutter can fetch them by URL
app.use("/uploads", express.static("uploads"));

const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: "*" }
});

app.set("io", io);
chatSocket(io);

app.use("/api/auth",      authRoutes);
app.use("/api/teacher",   teacherRoutes);
app.use("/api/student",   studentRoutes);
app.use("/api/batch",     batchRoutes);
app.use("/api/notice",    noticeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reminder",  reminderRoutes);
app.use("/api/chat",      chatRoutes);
app.use("/api/admin",     adminRoutes);

const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  startNoticeCleanupJob();
});
