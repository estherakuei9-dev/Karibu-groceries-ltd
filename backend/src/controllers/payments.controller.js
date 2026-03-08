const mongoose = require("mongoose");
const { Sale } = require("../models/Sale");
const { Payment } = require("../models/Payment");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function addPayment(req, res) {
  try {
    const saleId = req.params.id;
    const amount = num(req.body.amount);
    const note = req.body.note ? String(req.body.note).trim() : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a number > 0" });
    }

    // 1. Find the sale
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // 2. Validate payment conditions
    if (sale.saleType !== "credit") return res.status(400).json({ message: "Payments are only for credit sales" });
    
    if (req.user.role === "sales_agent" && String(sale.soldBy.userId) !== String(req.user.sub)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    if (amount > sale.balance) {
      return res.status(400).json({ message: "Payment exceeds remaining balance", balance: sale.balance });
    }

    // 3. Create payment document
    const paymentDoc = await Payment.create({
      saleId: sale._id,
      amount,
      note,
      receivedBy: {
        userId: req.user.sub,
        username: req.user.username,
        role: req.user.role,
      },
    });

    // 4. Update sale totals
    sale.amountPaid += amount;
    sale.balance = sale.totalAmount - sale.amountPaid;

    if (sale.balance <= 0) {
      sale.balance = 0;
      sale.paymentStatus = "paid";
    } else {
      sale.paymentStatus = "partial";
    }

    const updatedSale = await sale.save();

    return res.status(201).json({
      message: "Payment added",
      payment: paymentDoc,
      sale: updatedSale,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/sales/:id/payments
async function listPayments(req, res) {
  try {
    const saleId = req.params.id;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // sales_agent can only view payments for their own sale
    if (req.user.role === "sales_agent") {
      if (String(sale.soldBy.userId) !== String(req.user.sub)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }
    }

    const payments = await Payment.find({ saleId }).sort({ createdAt: -1 });
    return res.json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Invalid sale id" });
  }
}

module.exports = { addPayment, listPayments };
