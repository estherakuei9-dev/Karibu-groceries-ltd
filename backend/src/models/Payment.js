const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true, index: true },

    amount: { type: Number, required: true, min: 0.01 },

    receivedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      username: { type: String, required: true },
      role: { type: String, required: true },
    },

    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = { Payment: mongoose.model("Payment", paymentSchema) };
