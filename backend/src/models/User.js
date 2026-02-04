const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const USER_ROLES = ["manager", "sales_agent", "director"];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// helper method for checking password
userSchema.methods.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

const User = mongoose.model("User", userSchema);

module.exports = { User, USER_ROLES };
