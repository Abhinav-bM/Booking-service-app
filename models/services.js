// models/Service.js
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    // Reference to Vendor
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    title: { type: String, required: true },
    actualPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    duration: { type: Number, required: true }, // minutes
    availableFrom: { type: String, required: true }, // "09:00"
    availableUntil: { type: String, required: true }, // "17:00"
    description: { type: String },
    images: [{ type: String }], // filenames or cloud URLs
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
