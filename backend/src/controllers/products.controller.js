const { Product } = require("../models/Product");

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// POST /api/products (manager)
async function createProduct(req, res) {
  try {
    const { name, category, unit, sellingPrice, buyingPrice, stockQty } = req.body;

    if (!name || sellingPrice === undefined) {
      return res.status(400).json({ message: "name and sellingPrice are required" });
    }

    const sp = toNumber(sellingPrice);
    const bp = buyingPrice === undefined ? 0 : toNumber(buyingPrice);
    const sq = stockQty === undefined ? 0 : toNumber(stockQty);

    if (!Number.isFinite(sp) || sp < 0) return res.status(400).json({ message: "Invalid sellingPrice" });
    if (!Number.isFinite(bp) || bp < 0) return res.status(400).json({ message: "Invalid buyingPrice" });
    if (!Number.isFinite(sq) || sq < 0) return res.status(400).json({ message: "Invalid stockQty" });

    const product = await Product.create({
      name: String(name).trim(),
      category: category ? String(category).trim() : undefined,
      unit: unit ? String(unit).trim() : "kg",
      sellingPrice: sp,
      buyingPrice: bp,
      stockQty: sq,
    });

    return res.status(201).json({ message: "Product created", product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/products (any logged in)
async function listProducts(req, res) {
  try {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
    return res.json({ products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/products/:id (any logged in)
async function getProduct(req, res) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    return res.json({ product });
  } catch (err) {
    return res.status(400).json({ message: "Invalid product id" });
  }
}

// PATCH /api/products/:id (manager)
async function updateProduct(req, res) {
  try {
    const updates = {};
    const allowed = ["name", "category", "unit", "sellingPrice", "buyingPrice", "isActive"];

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.name) updates.name = String(updates.name).trim();
    if (updates.category) updates.category = String(updates.category).trim();
    if (updates.unit) updates.unit = String(updates.unit).trim();

    if (updates.sellingPrice !== undefined) {
      const sp = toNumber(updates.sellingPrice);
      if (!Number.isFinite(sp) || sp < 0) return res.status(400).json({ message: "Invalid sellingPrice" });
      updates.sellingPrice = sp;
    }

    if (updates.buyingPrice !== undefined) {
      const bp = toNumber(updates.buyingPrice);
      if (!Number.isFinite(bp) || bp < 0) return res.status(400).json({ message: "Invalid buyingPrice" });
      updates.buyingPrice = bp;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });

    return res.json({ message: "Product updated", product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/products/:id/stock (manager)  { delta: +10 } or { set: 50 }
async function adjustStock(req, res) {
  try {
    const { delta, set } = req.body;

    if (delta === undefined && set === undefined) {
      return res.status(400).json({ message: "Provide delta or set" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (set !== undefined) {
      const val = toNumber(set);
      if (!Number.isFinite(val) || val < 0) return res.status(400).json({ message: "Invalid set value" });
      product.stockQty = val;
    } else {
      const d = toNumber(delta);
      if (!Number.isFinite(d)) return res.status(400).json({ message: "Invalid delta value" });
      const newQty = product.stockQty + d;
      if (newQty < 0) return res.status(400).json({ message: "Stock cannot go below 0" });
      product.stockQty = newQty;
    }

    await product.save();
    return res.json({ message: "Stock updated", product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { createProduct, listProducts, getProduct, updateProduct, adjustStock };
