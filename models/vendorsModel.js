const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  password: { type: String, required: true },
  JoinedAt: {
    type: Date,
    default: Date.now,
  },
  status: { type: Boolean, default: true },
});

module.exports = mongoose.model("vendor", vendorSchema);
