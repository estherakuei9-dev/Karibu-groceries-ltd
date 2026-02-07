const mongoose = require("mongoose");
const { Sale } = require("../models/Sale");
const { Payment } = require("../models/Payment");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// POST /api/sales/:id/payments
async function addPayment(req, res) {
  const session = await mongoose.startSession();
  try {
    const saleId = req.params.id;
    const amount = num(req.body.amount);
    const note = req.body.note ? String(req.body.note).trim() : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "amount must be a number > 0" });
    }

    let updatedSale;
    let paymentDoc;

    await session.withTransaction(async () => {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) throw new Error("SALE_NOT_FOUND");

      // only credit sales should accept payments (cash is already paid)
      if (sale.saleType !== "credit") throw new Error("NOT_CREDIT_SALE");

      // sales_agent can only add payment to their own sale (optional but realistic)
      if (req.user.role === "sales_agent") {
        if (String(sale.soldBy.userId) !== String(req.user.sub)) {
          const err = new Error("FORBIDDEN");
          throw err;
        }
      }

      // cannot pay more than remaining balance
      if (amount > sale.balance) {
        const err = new Error("PAY_TOO_MUCH");
        err.details = { balance: sale.balance };
        throw err;
      }

      // create payment
      paymentDoc = await Payment.create(
        [
          {
            saleId: sale._id,
            amount,
            note,
            receivedBy: {
              userId: req.user.sub,
              username: req.user.username,
              role: req.user.role,
            },
          },
        ],
        { session }
      );

      // update sale totals
      sale.amountPaid = sale.amountPaid + amount;
      sale.balance = sale.totalAmount - sale.amountPaid;

      if (sale.balance <= 0) {
        sale.balance = 0;
        sale.paymentStatus = "paid";
      } else if (sale.amountPaid > 0) {
        sale.paymentStatus = "partial";
      } else {
        sale.paymentStatus = "credit";
      }

      updatedSale = await sale.save({ session });
    });

    return res.status(201).json({
      message: "Payment added",
      payment: paymentDoc[0],
      sale: updatedSale,
    });
  } catch (err) {
    if (err.message === "SALE_NOT_FOUND") return res.status(404).json({ message: "Sale not found" });
    if (err.message === "NOT_CREDIT_SALE") return res.status(400).json({ message: "Payments are only for credit sales" });
    if (err.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden: insufficient role" });
    if (err.message === "PAY_TOO_MUCH") {
      return res.status(400).json({ message: "Payment exceeds remaining balance", ...err.details });
    }

    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
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
