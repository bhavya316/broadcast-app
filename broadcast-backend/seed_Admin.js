require("dotenv").config();
const bcrypt = require("bcrypt");
const sequelize = require("./config/database");
const Admin = require("./models/admin");

async function seedAdmin() {
  await sequelize.sync();

  const email = "admin@broadcast.com";
  const password = "Admin@123";

  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  await Admin.create({ email, password: hashed });

  console.log("✅ Admin created!");
  console.log("   Email:   ", email);
  console.log("   Password:", password);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Seeder failed:", err);
  process.exit(1);
});