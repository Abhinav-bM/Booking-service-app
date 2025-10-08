// models/Booking.js
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  name: { type: String },
  address: { type: String },
  district: { type: String },
  state: { type: String },
  zip: { type: Number },
  phone: { type: Number },
  email: { type: String },
});

const bookingSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true }, // store as YYYY-MM-DD for easy matching
    slot: { type: String, required: true }, // "09:00 - 09:30"
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled", "confirmed", "delivered"],
      default: "pending",
    },
    paymentMethod: { type: String, enum: ["COD", "ONLINE"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    amount: { type: Number, default: 0 },
    address: { type: addressSchema, required: true },
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String },
    razorpay_signature: { type: String },
  },
  { timestamps: true },
);

// Unique constraint: one booking per service/date/slot
bookingSchema.index({ serviceId: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model("Booking", bookingSchema);
