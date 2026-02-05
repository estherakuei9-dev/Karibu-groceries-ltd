const bcrypt = require("bcryptjs");
const { User, USER_ROLES } = require("../models/User");

function sanitizeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/users  (manager only)
async function createUser(req, res) {
  try {
    const { fullName, username, password, role } = req.body;

    if (!fullName || !username || !password || !role) {
      return res.status(400).json({ message: "fullName, username, password, role are required" });
    }

    const cleanUsername = String(username).toLowerCase().trim();

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Allowed: ${USER_ROLES.join(", ")}` });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      fullName: String(fullName).trim(),
      username: cleanUsername,
      passwordHash,
      role,
      isActive: true,
    });

    return res.status(201).json({ message: "User created", user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/users  (manager only)
async function listUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.json({ users: users.map(sanitizeUser) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { createUser, listUsers };
