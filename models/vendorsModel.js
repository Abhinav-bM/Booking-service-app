const mongoose = require("mongoose");

const bankSchema = new mongoose.Schema({
  accountNumber: { type: String },
  ifsc: { type: String },
  holderName: { type: String },
});

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
  pan: { type: String },
  panVerified: { type: Boolean, default: false },
  bankDetails: bankSchema,
  profilePicture: { type: String },
});

module.exports = mongoose.model("vendor", vendorSchema);
