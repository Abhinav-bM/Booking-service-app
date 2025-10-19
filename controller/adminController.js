const Admin = require("../models/adminModel");
const User = require("../models/usersModel");
const Vendor = require("../models/vendorsModel");
const Services = require("../models/services");
const Booking = require("../models/booking");
const Review = require("../models/review");
const {
  calculateTotalSales,
  getOrdersCountForLast10Days,
  getLatest10Orders,
} = require("../helpers/adminDashboard");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// ADMIN LOGIN PAGE DISPLAY
let loginGetPage = (req, res) => {
  try {
    res.render("admin/adminlogin");
  } catch (error) {
    res.status(500).json({ msg: "Internal server error" });
  }
};

// ADMIN LOGIN
let loginPostPage = async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });

    if (admin) {
      if (req.body.password === admin.password) {
        const token = jwt.sign(
          {
            id: admin._id,
            name: admin.name,
            email: admin.email,
          },
          process.env.JWT_KEY,
          {
            expiresIn: "24h",
          },
        );
        res.cookie("admin_jwt", token, { httpOnly: true, maxAge: 86400000 }); // 24 hour expiry

        res.redirect("/admin/dashboard");
        console.log("Admin logged in successfully, jwt created");
        return;
      } else {
        res.status(401).render("admin/adminlogin", { error: "Wrong password" });
        return;
      }
    } else {
      console.log("User not found:", req.body.email);
      res.status(404).render("admin/adminlogin", { error: "User not found" });
      return;
    }
  } catch (error) {
    console.error("Internal server error:", error);
    res
      .status(500)
      .render("admin/adminlogin", { error: "Internal server error" });
    return;
  }
};

// Admin dashboard display
let dashboardPage = async (req, res) => {
  try {
    const user = req.user;
    const vendors = await Vendor.find();
    const admin = await Admin.findOne();
    const allbookings = await Booking.find()
      .populate("userId", "name email phone")
      .populate("serviceId", "title category sellingPrice images")
      .sort({ createdAt: -1 });

    let totalSales = allbookings.reduce((sum, b) => sum + b.amount, 0);

    // const salesData = calculateTotalSales(vendorOrders);
    // const ordersCountForLast10Days = getOrdersCountForLast10Days(vendorOrders);
    const latest10Bookings = allbookings.slice(0, 10);

    res.render("admin/dashboard", {
      user,
      vendors,
      totalSales,
      // salesData,
      // ordersCountForLast10Days,
      latest10Bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "server side error" });
  }
};

// CUSTOMERS LIST
let customersList = async (req, res) => {
  try {
    let users = await User.find();
    const admin = await Admin.findOne();
    res.render("admin/customersList", { user: users, admin });
  } catch (error) {
    console.log(error);
  }
};

let blockUser = async (req, res) => {
  let email = req.body.email;
  try {
    const user = await User.findOne({ email });
    console.log(user);
    if (user) {
      user.blocked = !user.blocked;
      await user.save();
    }
    res.redirect("/admin/customersList");
  } catch (error) {
    res.status(500).send("Error on admin Changing User status");
  }
};

// CATEGORY LIST DISPLAY
let categoryList = async (req, res) => {
  try {
    let admin = await Admin.findOne();
    let data = admin.categories;
    res.render("admin/category-list", { data, user: admin });
  } catch (error) {
    console.error(error);
    res.status(404).send("page not found");
  }
};

// ADD CATEGORY POST PAGE
let addCategory = async (req, res) => {
  let { categoryName } = req.body;
  try {
    let admin = await Admin.findOne();
    const newCategory = {
      categoryName: categoryName,
    };
    admin.categories.push(newCategory);
    console.log("category added successfully :", categoryName);
    admin.save();
    res.redirect("/admin/categoryList");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error adding new category" });
  }
};

// UPDATE CATEGORY
let updateCategory = async (req, res) => {
  let categoryId = req.body.editCategoryId;
  let categoryName = req.body.editCategoryName;

  try {
    const admin = await Admin.updateOne(
      { "categories._id": categoryId },
      { $set: { "categories.$.categoryName": categoryName } },
    );
    console.log("category updated successfully : ", categoryName);

    if (!admin) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).redirect("/admin/categoryList");
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
};

// CATEGORY DELETE
let deleteCategory = async (req, res) => {
  const deleteCategoryId = req.body.deleteCategoryId;

  try {
    let admin = await Admin.findOne();

    const categoryIndex = admin.categories.findIndex(
      (cat) => cat._id.toString() === deleteCategoryId,
    );

    if (categoryIndex === -1) {
      // Category not found
      return res.status(404).json({ error: "Category not found" });
    }

    admin.categories.splice(categoryIndex, 1);
    console.log("category deleted successfully");

    await admin.save();

    res.status(200).redirect("/admin/categoryList");
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// SUBCATEGORY PAGE DISPLAY
let subcategoryList = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    const categories = admin.categories;
    const subcategoriesWithCategories = admin.categories.reduce(
      (acc, category) => {
        const subcategories = category.subcategories.map((subcategory) => {
          return {
            id: subcategory._id,
            subcategoryName: subcategory.subcategoryName,
            categoryName: category.categoryName,
            createdAt: subcategory.createdAt,
          };
        });
        return acc.concat(subcategories);
      },
      [],
    );

    res.render("admin/subcategory-list", {
      subcategories: subcategoriesWithCategories,
      categories,
      user: admin,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("page not found");
  }
};

let addSubcategory = async (req, res) => {
  const { categoryId, subcategoryName } = req.body;
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      res.status(404).json({ error: "Admin not found" });
    }
    // FIND CATEGORY BY ID
    const category = admin.categories.id(categoryId);
    if (!category) {
      res.status(404).json({ error: "Categroy not found" });
    }

    category.subcategories.push({ subcategoryName });

    admin.save();

    res.redirect("/admin/subcategoryList");
  } catch (error) {
    console.error(error);
  }
};

let updateSubcategory = async (req, res) => {
  let subcategoryId = req.body.editSubcategoryId;
  let subcategoryName = req.body.editSubcategoryName;

  console.log("subcategoryID : ", subcategoryId);
  console.log("subcategoryName :", subcategoryName);

  try {
    let admin = await Admin.findOne();
    if (!admin) {
      return res.status(400).send("Admin Not Found");
    }
    let foundSubcategory = null;
    let foundCategory = null;

    // Search through categories and subcategories to find the subcategory with the given ID
    admin.categories.forEach((category) => {
      const subcategory = category.subcategories.find(
        (sub) => sub._id.toString() === subcategoryId,
      );
      if (subcategory) {
        foundSubcategory = subcategory;
        foundCategory = category;
      }
    });

    // Update the found subcategory name
    foundSubcategory.subcategoryName = subcategoryName;

    await admin.save();
    console.log("subcategory updated successfully");

    res.redirect("/admin/subcategoryList");
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
};

let deleteSubcategory = async (req, res) => {
  const { deleteSubcategoryId } = req.body;
  console.log(deleteSubcategoryId);
  try {
    // Find the admin document
    let admin = await Admin.findOne();

    let categoryIndex = -1;
    let subcategoryIndex = -1;

    admin.categories.forEach((category, i) => {
      const index = category.subcategories.findIndex(
        (sub) => sub._id.toString() === deleteSubcategoryId,
      );
      if (index !== -1) {
        categoryIndex = i;
        subcategoryIndex = index;
        return;
      }
    });

    admin.categories[categoryIndex].subcategories.splice(subcategoryIndex, 1);
    admin.save();
    console.log("subcategory deleted successfully");
    res.status(200).redirect("/admin/subcategoryList");
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// VENODRS LIST
let vendorsList = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    const admin = await Admin.findOne({});
    res.status(200).render("admin/vendorsList", { vendors, user: admin });
  } catch (error) {
    console.error(error);
    res.status(500).send("server error");
  }
};

// services list page
const servicesList = async (req, res) => {
  try {
    const user = await Admin.findOne();
    const services = await Services.find();
    res.status(200).render("admin/services-list", { services, user });
  } catch (error) {
    console.error("vendor product list error", error);
    res.status(404).send("page not found");
  }
};

// BLOCK AND UNBLOCK VENDORS
let verifyVendor = async (req, res) => {
  try {
    let email = req.body.email;
    const vendor = await Vendor.findOne({ email });
    if (vendor) {
      vendor.status = !vendor.status;
      await vendor.save();
    }
    res.redirect("/admin/vendorsList");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error on vendor verification");
  }
};

// BANNER GET PAGE
let bannerGetPage = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    const banner = admin.banner;
    res.status(200).render("admin/banner", { banner, user: admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
  }
};

// BANNER ADD POST
let bannerAddPost = async (req, res) => {
  const { placement } = req.body;
  let imageData = req.files;

  try {
    let admin = await Admin.findOne();
    console.log(placement, admin);

    let imageUrl = ""; // Variable to store single image URL

    if (placement) {
      if (imageData.length > 0) {
        const result = await cloudinary.uploader.upload(imageData[0].path);
        imageUrl = result.secure_url;
      } else {
        console.log("No image data found");
      }
    } else {
      console.log("No placement data found");
    }

    const newBanner = {
      image: imageUrl, // Assign single image URL
      placement,
    };

    admin.banner.push(newBanner);

    await admin.save();
    res.status(200).redirect("/admin/banner");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

// DELETE BANNER
let deleteBanner = async (req, res) => {
  const bannerId = req.params.bannerId;
  try {
    const admin = await Admin.findOne();
    const banner = admin.banner;
    const index = banner.findIndex((ban) => ban._id.toString() === bannerId);
    banner.splice(index, 1);
    await admin.save();
    res.status(200).json({ message: "Banner deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//ADMIN LOGOUT
let adminLogout = (req, res) => {
  try {
    // Clear the JWT cookie
    res.clearCookie("admin_jwt");

    res.redirect("/admin/login");
    console.log("Admin logged out");
    return;
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).send("Internal Server Error");
  }
};

// booking list page
const bookingList = async (req, res) => {
  try {
    const bookings = await Booking.aggregate([
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },
      {
        $sort: { "orders.orderDate": -1 },
      },
    ]);

    const admin = await Admin.findOne();

    res.status(200).render("admin/bookings-list", { bookings, admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getReviews = async (req, res) => {
  try {
    const admin = await Admin.findOne();
    const vendorServices = await Services.find().select("_id title");
    const serviceIds = vendorServices.map((s) => s._id);
    const reviews = await Review.find({ serviceId: { $in: serviceIds } })
      .populate("serviceId", "title")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.render("admin/reviewsList", {
      reviews,
      user: admin,
    });
  } catch (error) {}
};

module.exports = {
  loginGetPage,
  loginPostPage,
  dashboardPage,
  customersList,
  blockUser,
  adminLogout,
  categoryList,
  addCategory,
  updateCategory,
  deleteCategory,
  subcategoryList,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  vendorsList,
  verifyVendor,
  bannerGetPage,
  bannerAddPost,
  deleteBanner,

  // services related controller
  servicesList,
  bookingList,
  getReviews,
};
