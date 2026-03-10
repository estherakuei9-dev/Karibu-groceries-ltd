const mongoose = require("mongoose");
const { Product } = require("../models/Product");
const { Sale } = require("../models/Sale");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function recordSale(req, res) {
  try {
    const { items, saleType, customerName, customerPhone, amountPaidNow, branch } = req.body;

    // 1. Basic Validations
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items[] is required" });
    }
    if (!["cash", "credit"].includes(saleType)) {
      return res.status(400).json({ message: "saleType must be cash or credit" });
    }
    if (saleType === "credit" && !customerName) {
      return res.status(400).json({ message: "customerName is required for credit sales" });
    }

    const saleItems = [];
    let total = 0;

    // 2. Validate all products first (ensure they exist and have stock)
    for (const it of items) {
      const product = await Product.findById(it.productId);
      if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");
      
      const qty = num(it.quantity);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("INVALID_ITEM");
      if (product.stockQty < qty) {
        const err = new Error("INSUFFICIENT_STOCK");
        err.details = { product: product.name, available: product.stockQty, requested: qty };
        throw err;
      }

      // Calculate totals
      const lineTotal = product.sellingPrice * qty;
      total += lineTotal;
      
      // Prepare item data
      saleItems.push({
        productId: product._id,
        name: product.name,
        quantity: qty,
        unitPrice: product.sellingPrice,
        lineTotal
      });
    }

    // 3. Perform Updates (Sequential)
    for (const it of items) {
        await Product.findByIdAndUpdate(it.productId, { $inc: { stockQty: -num(it.quantity) } });
    }

    // 4. Calculate Payment
    const paidInput = amountPaidNow === undefined ? 0 : num(amountPaidNow);
    let amountPaid = (saleType === "cash") ? total : Math.min(paidInput, total);
    let balance = (saleType === "cash") ? 0 : Math.max(total - amountPaid, 0);
    let paymentStatus = balance === 0 ? "paid" : (amountPaid > 0 ? "partial" : "credit");

    // 5. Create Sale Record
    const saleDoc = await Sale.create({
      items: saleItems,
      branch,
      saleType,
      totalAmount: total,
      amountPaid,
      balance,
      paymentStatus,
      branch: req.user.branch,
      customer: saleType === "credit" ? { name: String(customerName).trim(), phone: customerPhone || "" } : undefined,
      soldBy: { userId: req.user.sub, username: req.user.username, role: req.user.role },
    });

    return res.status(201).json({ message: "Sale recorded", sale: saleDoc });

  } catch (err) {
    // ... (Keep your existing error handling here) ...
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

// GET /api/sales
async function listSales(req, res) {
  try {
    const { from, to, saleType, soldBy } = req.query;

    const filter = {};
    filter.branch = req.body.branch || undefined;

    // Directors/Managers can see everything.
    // Sales agents should only see their own sales.
    if (req.user.role === "sales_agent") {
      filter["soldBy.userId"] = req.user.sub;
    } else {
      // Optional: manager/director can filter by soldBy userId
      if (soldBy) filter["soldBy.userId"] = soldBy;
    }

    if (saleType) {
      if (!["cash", "credit"].includes(saleType)) {
        return res.status(400).json({ message: "saleType must be cash or credit" });
      }
      filter.saleType = saleType;
    }

    // Date range filtering on createdAt
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const sales = await Sale.find(filter).sort({ createdAt: -1 });

    return res.json({ sales });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/sales/:id
async function getSale(req, res) {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.branch !== req.user.branch) {
    return res.status(403).json({ message: "Forbidden: wrong branch" });
  }

    // sales_agent can only view their own sale
    if (req.user.role === "sales_agent") {
      if (String(sale.soldBy.userId) !== String(req.user.sub)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }
    }

    return res.json({ sale });
  } catch (err) {
    return res.status(400).json({ message: "Invalid sale id" });
  }
}

module.exports = {
  recordSale,
  listSales,
  getSale,
};
