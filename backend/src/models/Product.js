const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "kg", trim: true },
    stockQty: { type: Number, default: 0, min: 0 },
    buyingPrice: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    image: {type: String,required: true, default: ""},
  },
  { timestamps: true }
);

module.exports = { Product: mongoose.model("Product", productSchema) };
