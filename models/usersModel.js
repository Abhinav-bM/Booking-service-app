const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    name: { type: String },
    address: { type: String },
    district: { type: String },
    state: { type: String },
    zip: { type: Number },
    phone: { type: Number },
    email: { type: String },
  },
  { _id: true },
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phoneNumber: { type: String, unique: true },
  password: { type: String },
  addresses: [addressSchema],
  createdAt: { type: Date, default: new Date() },
  otp: { type: String },
  otpExpiration: { type: Date },
  blocked: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("User", userSchema);
