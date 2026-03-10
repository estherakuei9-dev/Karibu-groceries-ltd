const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

async function login(req, res) {
  try {
    const { username, password, branch } = req.body;

    if (!username || !password || !branch) {
      return res.status(400).json({ message: "username, password and branch are required" });
    }

    const user = await User.findOne({ username: String(username).toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { sub: user._id.toString(), role: user.role, username: user.username, branch: branch },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        branch: branch
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function me(req, res) {
  return res.json({ user: req.user });
}

async function logout(req, res) {
  // JWT is stateless; logout is handled on the client by deleting the token
  return res.json({ message: "Logged out" });
}

module.exports = { login, me, logout };
