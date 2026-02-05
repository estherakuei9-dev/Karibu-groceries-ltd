const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true }, // snapshot
    quantity: { type: Number, required: true, min: 0.000001 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    items: { type: [saleItemSchema], required: true },

    saleType: { type: String, enum: ["cash", "credit"], required: true },

    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },

    paymentStatus: { type: String, enum: ["paid", "partial", "credit"], required: true },

    customer: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    soldBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
      role: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = { Sale: mongoose.model("Sale", saleSchema) };
