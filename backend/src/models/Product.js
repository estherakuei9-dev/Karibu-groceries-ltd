const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // e.g. Maize, Beans, Rice
    unit: { type: String, default: "kg", trim: true }, // kg, bag, tin, etc.

    stockQty: { type: Number, default: 0, min: 0 },

    buyingPrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = { Product: mongoose.model("Product", productSchema) };
