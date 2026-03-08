const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { allowRoles } = require("../middlewares/roles");
const {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  adjustStock,
} = require("../controllers/products.controller");
const upload = require("../middlewares/upload");
const router = express.Router();

// any logged-in user can view products
router.get("/", requireAuth, listProducts);
router.get("/:id", requireAuth, getProduct);

// manager-only changes
router.post("/", requireAuth, allowRoles("manager"), upload.single("image"), createProduct);
router.patch("/:id", requireAuth, allowRoles("manager"), upload.single("image"), updateProduct);
router.patch("/:id/stock", requireAuth, allowRoles("manager"), adjustStock);

module.exports = router;
