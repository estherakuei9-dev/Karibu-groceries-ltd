const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const { addPayment, listPayments } = require("../controllers/payments.controller");

const router = express.Router();

// add payment: manager + sales_agent
router.post("/sales/:id/payments", requireAuth, allowRoles("manager", "sales_agent"), addPayment);

// view payments: manager + director + sales_agent (agent restricted inside controller)
router.get("/sales/:id/payments", requireAuth, allowRoles("manager", "director", "sales_agent"), listPayments);

module.exports = router;
