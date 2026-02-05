const mongoose = require("mongoose");
const { Product } = require("../models/Product");
const { Sale } = require("../models/Sale");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function recordSale(req, res) {
  const session = await mongoose.startSession();
  try {
    const { items, saleType, customerName, customerPhone, amountPaidNow } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items[] is required" });
    }
    if (!["cash", "credit"].includes(saleType)) {
      return res.status(400).json({ message: "saleType must be cash or credit" });
    }
    if (saleType === "credit" && !customerName) {
      return res.status(400).json({ message: "customerName is required for credit sales" });
    }

    // transaction: stock deduction + sale save
    let saleDoc;

    await session.withTransaction(async () => {
      const saleItems = [];
      let total = 0;

      // Load and validate each product
      for (const it of items) {
        const productId = it.productId;
        const qty = num(it.quantity);

        if (!productId || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("INVALID_ITEM");
        }

        const product = await Product.findById(productId).session(session);
        if (!product || !product.isActive) throw new Error("PRODUCT_NOT_FOUND");

        if (product.stockQty < qty) {
          const err = new Error("INSUFFICIENT_STOCK");
          err.details = { product: product.name, available: product.stockQty, requested: qty };
          throw err;
        }

        // Use product sellingPrice (backend source of truth)
        const unitPrice = product.sellingPrice;
        const lineTotal = unitPrice * qty;

        // Deduct stock
        product.stockQty = product.stockQty - qty;
        await product.save({ session });

        saleItems.push({
          productId: product._id,
          name: product.name,
          quantity: qty,
          unitPrice,
          lineTotal,
        });

        total += lineTotal;
      }

      const paidInput = amountPaidNow === undefined ? 0 : num(amountPaidNow);
      if (!Number.isFinite(paidInput) || paidInput < 0) throw new Error("INVALID_PAYMENT");

      let amountPaid = 0;
      let balance = 0;
      let paymentStatus = "paid";

      if (saleType === "cash") {
        amountPaid = total;
        balance = 0;
        paymentStatus = "paid";
      } else {
        amountPaid = Math.min(paidInput, total);
        balance = Math.max(total - amountPaid, 0);
        paymentStatus = balance === 0 ? "paid" : amountPaid > 0 ? "partial" : "credit";
      }

      saleDoc = await Sale.create(
        [
          {
            items: saleItems,
            saleType,
            totalAmount: total,
            amountPaid,
            balance,
            paymentStatus,
            customer:
              saleType === "credit"
                ? { name: String(customerName).trim(), phone: customerPhone ? String(customerPhone).trim() : "" }
                : undefined,
            soldBy: {
              userId: req.user.sub,
              username: req.user.username,
              role: req.user.role,
            },
          },
        ],
        { session }
      );
    });

    return res.status(201).json({
      message: "Sale recorded",
      sale: saleDoc[0],
    });
  } catch (err) {
    // Map known errors to friendly responses
    if (err.message === "INVALID_ITEM") {
      return res.status(400).json({ message: "Each item must have productId and quantity > 0" });
    }
    if (err.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({ message: "Product not found" });
    }
    if (err.message === "INVALID_PAYMENT") {
      return res.status(400).json({ message: "Invalid amountPaidNow" });
    }
    if (err.message === "INSUFFICIENT_STOCK") {
      return res.status(400).json({ message: "Insufficient stock", ...err.details });
    }

    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
}

// GET /api/sales
async function listSales(req, res) {
  try {
    const { from, to, saleType, soldBy } = req.query;

    const filter = {};

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
