const Vendor = require("../models/vendorsModel");
const Admin = require("../models/adminModel");
const User = require("../models/usersModel");
const Service = require("../models/services");
const Booking = require("../models/booking");
const Reviews = require(`../models/review`);
const bcrypt = require("bcryptjs");
const { vendorOrders } = require("../helpers/vendorOrders");
const jwt = require("jsonwebtoken");
const { sendOtpEmail } = require("../helpers/emailService");
const cloudinary = require("../config/cloudinary");
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
require("dotenv").config();
const Excel = require("exceljs");

// vendor dashboard page display
const dashboard = async (req, res) => {
  try {
    let vendorId = req.user.id;

    let vendor = await Vendor.findById(vendorId);

    const vendorServices = await Service.find({ vendorId });

    const serviceIds = vendorServices.map((service) => service._id);

    const vendorBookings = await Booking.find({
      serviceId: { $in: serviceIds },
    })
      .populate({ path: "serviceId", select: "title images" })
      .lean();

    const totalSales = vendorBookings.length;

    const totalRevenue = vendorBookings.reduce(
      (sum, booking) => sum + (booking.price || 0) * (booking.quantity || 1),
      0,
    );

    const today = new Date();
    const last10DaysSales = {};

    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      last10DaysSales[dateStr] = 0;
    }

    for (const booking of vendorBookings) {
      const dateStr = new Date(booking.createdAt).toISOString().split("T")[0];
      if (last10DaysSales[dateStr] !== undefined) {
        last10DaysSales[dateStr] +=
          (booking.price || 0) * (booking.quantity || 1);
      }
    }

    const salesData = Object.entries(last10DaysSales)
      .map(([date, total]) => ({ date, total }))
      .reverse();

    const latestTenBookings = vendorBookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.status(200).render("vendor/dashboard", {
      vendor,
      salesData,
      vendorBookings,
      latestTenBookings,
      totalRevenue,
      vendorServices,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("page not found");
  }
};

// Vendor login page display
const loginGetPage = (req, res) => {
  try {
    res.status(200).render("vendor/vendorlogin");
  } catch (error) {
    res.status(500).send("server error : ", error);
  }
};

// Vendor register page display
const registerGetPage = async (req, res) => {
  try {
    res.status(200).render("vendor/vendorRegister");
  } catch (error) {
    res.status(404).send("page not found");
  }
};

// Vendor register post page
const vendorRegisterPostPage = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newVendor = new Vendor({
      vendorName: name,
      email,
      phoneNumber: phone,
      password: hashedPassword,
    });

    await newVendor.save();

    res.status(201).redirect("/vendor/login");
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ error: "Signup failed. Please try again later." });
  }
};

// Vendor login post page
const vendorLoginPostPage = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ email: req.body.email });

    if (vendor?.status) {
      return res.render("vendor/vendorlogin", {
        error: "You are restricted by admin",
      });
    } else if (vendor) {
      const passwordMatch = await bcrypt.compare(
        req.body.password,
        vendor.password,
      );

      if (passwordMatch) {
        const token = jwt.sign(
          {
            id: vendor._id,
            name: vendor.name,
            email: vendor.email,
          },
          process.env.JWT_KEY,
          {
            expiresIn: "24h",
          },
        );

        res.cookie("vendor_jwt", token, { httpOnly: true, maxAge: 86400000 }); // 24 hour expiry

        res.status(200).redirect("/vendor/dashboard");
        console.log("Vendor logged in successfully");
      } else {
        res
          .status(200)
          .render("vendor/Vendorlogin", { error: "Wrong password" });
      }
    } else if (!vendor) {
      console.log("Vendor not found:", req.body.email);
      res.status(200).render("vendor/vendorlogin", { error: "User not found" });
    }
  } catch (error) {
    console.error("Internal server error:", error);
    res
      .status(500)
      .render("vendor/vendorlogin", { error: "Internal server error" });
  }
};

// Add service page display
const addService = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findOne({ _id: vendorId });
    const admin = await Admin.findOne();
    const categories = admin.categories.map((category) => ({
      categoryName: category.categoryName,
      subcategories: category.subcategories.map(
        (subcategory) => subcategory.subcategoryName,
      ),
    }));

    res.status(200).render("vendor/service-add", { categories, vendor });
  } catch (error) {
    console.error(error);
    res.status(404).send("page not found");
  }
};

// Add service post page
const addServicePost = async (req, res) => {
  try {
    const {
      croppedMainImage,
      croppedSecondImage,
      croppedThirdImage,
      croppedFourthImage,
    } = req.body;

    let { email } = req.user;

    let vendor = await Vendor.findOne({ email });

    const mainImage = await cloudinary.uploader.upload(croppedMainImage);
    const secondImage = await cloudinary.uploader.upload(croppedSecondImage);
    const thirdImage = await cloudinary.uploader.upload(croppedThirdImage);
    const fourthImage = await cloudinary.uploader.upload(croppedFourthImage);

    const imageUrls = [
      mainImage.secure_url,
      secondImage.secure_url,
      thirdImage.secure_url,
      fourthImage.secure_url,
    ];

    const newService = new Service({
      title: req.body.title,
      actualPrice: req.body.actualPrice,
      sellingPrice: req.body.sellingPrice,
      category: req.body.category,
      subcategory: req.body.subcategory,
      duration: req.body.duration,
      availableFrom: req.body.startTime,
      availableUntil: req.body.endTime,
      description: req.body.description,
      images: imageUrls,
      vendorId: vendor._id,
    });

    await newService.save();
    res.redirect("/vendor/servicesList");
  } catch (error) {
    console.error("Error adding service:", error);
    res.status(500).send("Server error");
  }
};

// List services
const servicesList = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findOne({ _id: vendorId });
    const services = await Service.find({
      vendorId: vendor._id,
      isActive: true,
    });
    res.status(200).render("vendor/services-list", { vendor, services });
  } catch (error) {
    console.error("vendor service list error", error);
    res.status(404).send("page not found");
  }
};

// Edit service get page
const editService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Service.findById(serviceId);

    const vendor = await Vendor.findById(req?.user?.id);
    if (!vendor) {
      res.status(400).send("Vendor not found");
    }

    const admin = await Admin.findOne();

    if (!service) {
      return res.status(404).send("service Not Found");
    }

    const categories = admin.categories.map((category) => ({
      categoryName: category.categoryName,
      subcategories: category.subcategories.map(
        (subcategory) => subcategory.subcategoryName,
      ),
    }));
    res.render("vendor/service-edit", { service, categories, vendor });
  } catch (error) {
    console.error(error);
    res.status(500).send("failed to get editproduct page");
  }
};

// edit service post
const editServicePost = async (req, res) => {
  try {
    const {
      serviceId,
      title,
      actualPrice,
      sellingPrice,
      category,
      subcategory,
      duration,
      startTime,
      endTime,
      description,
      croppedMainImage,
      croppedSecondImage,
      croppedThirdImage,
      croppedFourthImage,
    } = req.body;

    if (!serviceId) return res.status(400).send("Service ID missing");

    // Find the service
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).send("Service not found");

    // update fields if they have new values
    service.title = title || service.title;
    service.actualPrice = actualPrice || service.actualPrice;
    service.sellingPrice = sellingPrice || service.sellingPrice;
    service.category = category || service.category;
    service.subcategory = subcategory || service.subcategory;
    service.duration = duration || service.duration;
    service.availableFrom = startTime || service.availableFrom;
    service.availableUntil = endTime || service.availableUntil;
    service.description = description || service.description;

    const updatedImages = [...service.images];

    // Main image
    if (croppedMainImage) {
      const uploaded = await cloudinary.uploader.upload(croppedMainImage);
      updatedImages[0] = uploaded.secure_url;
    }
    if (croppedSecondImage) {
      const uploaded = await cloudinary.uploader.upload(croppedSecondImage);
      updatedImages[1] = uploaded.secure_url;
    }
    if (croppedThirdImage) {
      const uploaded = await cloudinary.uploader.upload(croppedThirdImage);
      updatedImages[2] = uploaded.secure_url;
    }
    if (croppedFourthImage) {
      const uploaded = await cloudinary.uploader.upload(croppedFourthImage);
      updatedImages[3] = uploaded.secure_url;
    }

    service.images = updatedImages;

    await service.save();

    res.redirect("/vendor/servicesList");
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).send("Server error");
  }
};

module.exports = { editServicePost };

// Delete a service
const deleteService = async (req, res) => {
  try {
    const { id: serviceId } = req.params;

    if (!serviceId) return res.status(400).send("Service ID missing");

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).send("Service not found");

    // Soft delete: disable the service
    service.isActive = false;
    await service.save();

    res.redirect("/vendor/servicesList");
  } catch (error) {
    console.error("Error disabling service:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// forgot password
let forgotEmail = async (req, res) => {
  try {
    res.status(200).render("vendor/vendorForgotEmail");
  } catch (error) {
    res.statusf(404).send("page not found");
  }
};
let forgotPassEmailPost = async (req, res) => {
  try {
    const email = req.body.email;
    const vendor = await Vendor.find({ email });
    if (!vendor) {
      return res
        .status(404)
        .render("vendor/vendorForgotEmail", { error: "User not found" });
    }
    const otp = generateOTP();
    req.session.otp = otp;
    req.session.email = email;
    const message = `your otp for reset password is ${otp}`;
    await sendOtpEmail(email, message);

    res.status(200).render("vendor/forgotOtp");
  } catch (error) {
    console.error(error);
    res.status(500).send("error occured try after some time");
  }
};
let forgotOrpVerify = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const email = req.session.email;
    const storedOTP = req.session.otp;
    const vendor = await Vendor.findOne({ email });
    const bcryptedPass = await bcrypt.hash(newPassword, 10);
    if (otp == storedOTP) {
      vendor.password = bcryptedPass;
      vendor.save();

      delete req.session.otp;
      delete req.session.email;
      res.render("vendor/vendorlogin");
    } else {
      res.status(400).render("vendor/forgotOtp", { error: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occured try again later");
  }
};

// Vendor logout
let vendorLogout = (req, res) => {
  try {
    // Clear the JWT cookie
    res.clearCookie("vendor_jwt");

    res.redirect("/vendor/login");
    return;
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).send("Internal Server Error");
  }
};

// get bookings
const getbookings = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);
    const vendorServices = await Service.find({ vendorId });
    const serviceIds = vendorServices.map((service) => service._id);

    const vendorBookings = await Booking.find({
      serviceId: { $in: serviceIds },
    })
      .populate({ path: "serviceId", select: "title images" })
      .lean();
    res.render("vendor/booking-list", { vendorBookings, vendor });
  } catch (error) {
    console.error(error);
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    const vendorId = req.user?.id;

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "refunded",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Find booking and populate service to verify vendor
    const booking = await Booking.findById(bookingId).populate("serviceId");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Ensure vendor owns the service
    if (booking.serviceId.vendorId.toString() !== vendorId.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not your booking" });
    }

    // Update booking status
    booking.status = status;

    // If completed, mark completed date
    if (status === "completed") {
      booking.completedAt = new Date();
    }

    // If cancelled after payment, refund logic can go here
    if (status === "cancelled" && booking.paymentStatus === "paid") {
      booking.paymentStatus = "refunded";
    }

    await booking.save();

    res.status(200).json({
      message: "Booking status updated successfully",
      bookingId: booking._id,
      newStatus: booking.status,
      paymentStatus: booking.paymentStatus,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// reviews get page
const getReviews = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const vendor = await Vendor.findById(vendorId);
    const vendorServices = await Service.find({ vendorId }).select("_id title");
    const serviceIds = vendorServices.map((s) => s._id);
    const reviews = await Reviews.find({ serviceId: { $in: serviceIds } })
      .populate("serviceId", "title")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.render("vendor/reviewsList", {
      reviews,
      vendor,
    });
  } catch (error) {}
};

// SALES REPORT EXCEL
let salesExcel = async (req, res) => {
  const { startDate, endDate } = req.params;
  const vendorId = req.user.id;

  try {
    const vendorProducts = await Vendor.findOne({ _id: vendorId }).populate(
      "products",
    );
    const usersWithOrders = await User.find({ "orders.0": { $exists: true } });

    if (!vendorProducts || !usersWithOrders) {
      return res.status(404).json({ error: "Vendor or users data not found" });
    }

    const orders = vendorOrders(vendorProducts, usersWithOrders);

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const deliveredOrders = orders.filter(
      (order) =>
        order.orderStatus === "Delivered" &&
        new Date(order.orderDate) >= startDateObj &&
        new Date(order.orderDate) <= endDateObj,
    );

    if (deliveredOrders.length === 0) {
      return res.status(404).json({ error: "No orders found" });
    }

    // CREATE NEW WORK BOOK
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // HEADERS TO WORK SHEET
    worksheet.columns = [
      { header: "Order ID", key: "orderId", width: 20 },
      { header: "Product Name", key: "product", width: 20 },
      { header: "Order Date", key: "orderDate", width: 20 },
      { header: "Price", key: "price", width: 20 },
      { header: "Quantity", key: "quantity", width: 20 },
      { header: "Total", key: "total", width: 20 },
    ];

    // DATA ROWS TO WORK SHEET
    deliveredOrders.forEach((item) => {
      worksheet.addRow({
        orderId: item.orderId,
        product: item.productName,
        orderDate: item.orderDate,
        price: item.price,
        quantity: item.quantity,
        total: item.quantity * item.price,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sales_report.xlsx",
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("Error generating Excel report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  loginGetPage,
  registerGetPage,
  vendorRegisterPostPage,
  vendorLoginPostPage,
  forgotEmail,
  forgotPassEmailPost,
  forgotOrpVerify,
  dashboard,
  vendorLogout,
  addService,
  addServicePost,
  servicesList,
  getbookings,
  getReviews,
  updateBookingStatus,
  editService,
  editServicePost,
  deleteService,

  salesExcel,
};
