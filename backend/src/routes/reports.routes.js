const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const { salesSummary, stockReport, salesByAgent } = require("../controllers/reports.controller");

const router = express.Router();

// director + manager only
router.use(requireAuth, allowRoles("director", "manager"));

router.get("/summary", salesSummary);
router.get("/stock", stockReport);
router.get("/sales-by-agent", salesByAgent);


module.exports = router;
