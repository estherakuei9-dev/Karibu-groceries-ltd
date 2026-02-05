const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const { createUser, listUsers } = require("../controllers/users.controller");

const router = express.Router();

// manager-only user management
router.use(requireAuth, allowRoles("manager"));

router.post("/", createUser);
router.get("/", listUsers);

module.exports = router;
