const mongoose = require("mongoose");

const subcategorySchema = new mongoose.Schema({
  subcategoryName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  subcategories: [subcategorySchema],
});

const bannerSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    required: true,
  },
});

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  categories: [categorySchema],
  banner: [bannerSchema],
});

module.exports = mongoose.model("Admin", adminSchema);
