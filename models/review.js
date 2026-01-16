const mongoose = require("mongoose");
const { required } = require("nodemon/lib/config");

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    rating: { type: Number, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);
