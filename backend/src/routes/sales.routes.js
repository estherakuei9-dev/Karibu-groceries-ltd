const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const { recordSale, listSales, getSale } = require("../controllers/sales.controller");

const router = express.Router();

// record sale: manager + sales_agent
router.post("/", requireAuth, allowRoles("manager", "sales_agent"), recordSale);

// list + view: manager + director + sales_agent
router.get("/", requireAuth, allowRoles("manager", "director", "sales_agent"), listSales);
router.get("/:id", requireAuth, allowRoles("manager", "director", "sales_agent"), getSale);

module.exports = router;
