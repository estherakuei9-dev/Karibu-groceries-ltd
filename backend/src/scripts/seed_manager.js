require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const { User } = require("../models/User");

async function seedManager() {
  try {
    await connectDB();

    const username = "manager";
    const password = "manager123";

    // check if already exists
    const existing = await User.findOne({ username });
    if (existing) {
      console.log("⚠️ Manager user already exists:", username);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      fullName: "Default Manager",
      username,
      passwordHash,
      role: "manager",
      isActive: true,
    });

    console.log("✅ Seeded manager user:");
    console.log("   username:", username);
    console.log("   password:", password);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seedManager();
