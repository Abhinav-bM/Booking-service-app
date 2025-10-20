const User = require("../models/usersModel");
const Vendor = require("../models/vendorsModel");
const Admin = require("../models/adminModel");
const Services = require("../models/services");
const Booking = require("../models/booking");
const Reviews = require("../models/review");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const smsService = require("../helpers/smsService");
const {
  sendOtpEmail,
  sendBookingEmail,
  scheduleReminderEmail,
} = require("../helpers/emailService");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
require("dotenv").config();
const generateSlots = require("../helpers/booking").generateSlots;

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// home page display
let homePage = async (req, res) => {
  const token = req.cookies.jwt;

  try {
    let vendors = await Vendor.find().select("products");
    let services = await Services.find({ isActive: true });

    const admin = await Admin.findOne();
    const bannerHome = admin.banner.filter(
      (banner) => banner.placement === "Home Page",
    );

    let user;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded.id;
      user = await User.findById(userId);
    }

    res.status(200).render("user/home", {
      services,
      bannerHome,
      user,
    });
  } catch (error) {
    console.error("Failed to get home:", error);
    res.status(500).send("Internal Server Error");
  }
};

// auth
const loadAuth = (req, res) => [res.render("auth")];

// signup page get
let signupGetPage = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.error("Failed to get login page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// signup post
let signupPostPage = async (req, res) => {
  try {
    const { userName, email, phoneNumber, password } = req.body;
    let phone = phoneNumber;

    const hashedPassword = await bcrypt.hash(password, 10);

    if (!phone.startsWith("+91")) {
      phone = "+91" + phone;
    }

    const existingEmailUser = await User.findOne({ email });
    if (existingEmailUser) {
      return res.status(400).json({ error: "Email already exists." });
    }

    const existingPhoneUser = await User.findOne({ phoneNumber: phone });
    if (existingPhoneUser) {
      return res.status(400).json({ error: "Phone number already exists." });
    }

    // Generate a random 4-digit OTPs
    const emailOtp = generateOTP();

    // Send OTP via Email
    const emailMessage = `your otp for verification is ${emailOtp}`;
    sendOtpEmail(email, emailMessage);

    console.log("otps send successfully");

    req.session.emailOtp = emailOtp;

    return res.status(200).json({ message: "OTP sent to phone and email." });
  } catch (error) {
    console.error("Signup failed:", error);
    res.status(500).json({ error: "Signup failed. Please try again later." });
  }
};

let signupVerify = async (req, res) => {
  try {
    const { userName, email, phoneNumber, password, phoneOtp, emailOtp } =
      req.body;

    let phone = phoneNumber;

    const sessionEmailOtp = req.session.emailOtp;

    if (!phone.startsWith("+91")) {
      phone = "+91" + phone;
    }

    if (emailOtp === sessionEmailOtp) {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name: userName,
        email,
        phoneNumber: phone,
        password: hashedPassword,
      });

      await newUser.save();

      const user = await User.findOne({ email });

      const token = jwt.sign(
        {
          id: user._id,
          name: user.name,
          email: user.email,
        },
        process.env.JWT_KEY,
        {
          expiresIn: "24h",
        },
      );

      res.cookie("jwt", token, { httpOnly: true, maxAge: 86400000 }); // 24 hour expiry

      return res
        .status(200)
        .json({ success: true, message: "User created successfully" });
    } else {
      res.status(400).json({ error: "Invalid OTPs. Please try again." });
    }
  } catch (error) {
    console.error("Verification failed:", error);
    res
      .status(500)
      .json({ error: "Verification failed. Please try again later." });
  }
};

// login page get
let loginGetPage = async (req, res) => {
  try {
    if (req.cookies.jwt) {
      return res.redirect("/");
    }

    res.render("user/login", { error: " " });
  } catch (error) {
    console.error("Failed to get login page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// user login
let loginPostPage = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    if (user.blocked) {
      return res.status(403).json({ error: "You are restricted by admin" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "24h",
      },
    );

    res.cookie("jwt", token, { httpOnly: true, maxAge: 86400000 }); // 24 hour expiry

    res.status(200).json({ message: "Login successful", token });
    console.log("user logged in with email and password : jwt created");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// login with otp page get
let loginWithOtpGetPage = async (req, res) => {
  try {
    res.render("user/loginOtpPhone");
  } catch (error) {
    res.status(404).send("page not found");
  }
};

// forgot password get page
let forgotGetPage = async (req, res) => {
  try {
    res.render("user/forgotemail");
  } catch (error) {
    res.status(404).send("page not found");
  }
};

// forgot email post and otp generation and email sending
let forgotEmailPostPage = async (req, res) => {
  const { emailOrPhone } = req.body;

  try {
    let user;
    let message;
    const otp = generateOTP();
    // Check if input is an email or phone number
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone)) {
      //find user by email
      user = await User.findOne({ email: emailOrPhone });
      if (!user) {
        return res
          .status(404)
          .render("user/forgotemail", { error: "User not found" });
      }
      message = `Your OTP to reset your password is: ${otp}`;
      await sendOtpEmail(emailOrPhone, message);
    } else if (/^(\+91)?\d{10}$/.test(emailOrPhone)) {
      let phone = emailOrPhone;

      if (!phone.startsWith("+91")) {
        phone = "+91" + phone;
      }
      // find user by phone
      user = await User.findOne({ phoneNumber: phone });
      if (!user) {
        return res
          .status(404)
          .render("user/forgotemail", { error: "User not found" });
      }
      smsService.sendOTP(emailOrPhone, otp);
    } else {
      return res.status(400).json({ message: "Invalid email or phone number" });
    }

    // Update user with OTP and expiration time
    user.otp = otp;
    user.otpExpiration = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();

    res.render("user/forgototp", { emailOrPhone });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// reset password
let resetPassword = async (req, res) => {
  const { emailOrPhone, otp, newPassword, confirmPassword } = req.body;

  try {
    let user;

    // Check if emailOrPhone is an email or phone number
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone)) {
      user = await User.findOne({ email: emailOrPhone });
    } else if (/^(\+91)?\d{10}$/.test(emailOrPhone)) {
      let phone = emailOrPhone;
      if (!phone.startsWith("+91")) {
        phone = "+91" + emailOrPhone;
      }
      user = await User.findOne({ phoneNumber: phone });
    } else {
      return res.status(400).render("user/forgototp", {
        error: "Invalid Email or Phone format",
        emailOrPhone: emailOrPhone,
      });
    }

    if (!user) {
      return res.status(404).render("user/forgototp", {
        error: "User not found",
        emailOrPhone: emailOrPhone,
      });
    }

    // Check OTP and its expiration
    if (user.otp !== otp || Date.now() > user.otpExpiration) {
      return res.status(400).render("user/forgototp", {
        error: "Invalid or expired OTP",
        emailOrPhone: emailOrPhone,
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).render("user/forgototp", {
        error: "Passwords do NOT match",
        emailOrPhone: emailOrPhone,
      });
    }

    // Hash the new password
    const bcryptedNewPassword = await bcrypt.hash(newPassword, 10);

    // Reset password and clear OTP fields
    user.password = bcryptedNewPassword;
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    res.status(200).redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// user logout
let userLogout = async (req, res) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect("/login"); // If no token, redirect to login
  }

  try {
    // Clear the JWT cookie
    res.clearCookie("jwt");

    res.redirect("/");
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).send("Internal Server Error");
  }
};

// get services listing page
const getServicesPage = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const admin = await Admin.findOne({});
    const allCategories = admin.categories.map((c) => c.categoryName);

    let user;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded.id;
      user = await User.findById(userId);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const search = req.query.search ? req.query.search.trim() : "";
    const sort = req.query.sort || "default";
    const category = req.query.category || null;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (category) {
      query.category = category;
    }

    // sorting
    let sortOption = {};
    if (sort === "latest") sortOption = { createdAt: -1 };
    else if (sort === "low_to_high") sortOption = { sellingPrice: 1 };
    else if (sort === "high_to_low") sortOption = { sellingPrice: -1 };

    const totalServices = await Services.countDocuments(query);
    const services = await Services.find({ ...query, isActive: true })
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(totalServices / limit);

    res.status(200).render("user/services", {
      services,
      allCategories,
      currentCategory: category || null,
      user,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      lastPage: totalPages,
      request: req,
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Service details get page
const serviceDetailsGetPage = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    const serviceId = req.params.id;

    const service = await Services.findById(serviceId);

    if (!service) {
      return res.status(404).send("Service not found");
    }

    const relatedServices = await Services.find({
      _id: { $ne: serviceId },
      category: service.category,
    }).limit(4);

    let user;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded.id;
      user = await User.findById(userId);
    }

    const reviews = await Reviews.find({ serviceId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.render("user/serviceDetails", {
      service,
      user,
      relatedServices,
      reviews,
    });
  } catch (error) {
    console.error(error);
    res.status(404).send("page not found");
  }
};

// Service booking page — shows service details + date picker (GET)
const bookServiceGetPage = async (req, res) => {
  try {
    console.log("called me for booking page");
    const serviceId = req.params.id;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const service = await Services.findById(serviceId);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    console.log("called me for booking page");

    return res
      .status(200)
      .render("user/bookService", { service, date: todayStr, user });
  } catch (error) {
    console.error("Error fetching service:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// API to get available slots for a service on a given date
const getServiceSlots = async (req, res) => {
  console.log("called me for get slots");
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "date required" });

    const service = await Services.findById(req.params.id).lean();
    if (!service) return res.status(404).json({ error: "service not found" });

    // fetch all bookings for this service on this date
    const bookings = await Booking.find({
      serviceId: service._id,
      date,
    }).lean();
    const bookedSlots = bookings.map((b) => b.slot);

    const slots = generateSlots(service, date, bookedSlots); // returns objects {slot,...}
    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }
};

// checkout page display with address and payment options
const checkoutServiceGetPage = async (req, res) => {
  try {
    const { serviceId, date, slot } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    const addresses = user.addresses;

    const service = await Services.findById(serviceId).lean();
    if (!service) return res.status(404).send("Service not found");

    // double-check slot is still available: check Booking collection
    const existing = await Booking.findOne({ serviceId, date, slot });

    res.render("user/checkout", {
      service,
      date,
      slot,
      user,
      addresses,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      existing,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// add address
let addAddress = async (req, res) => {
  const { name, address, district, state, zip, email, phone } = req.body;
  const userId = req.user.id;

  try {
    // new address
    const newAddress = {
      name,
      address,
      district,
      state,
      zip,
      email,
      phone,
    };

    const user = await User.findById({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.addresses.push(newAddress);

    await user.save();

    const addedAddress = user.addresses[user.addresses.length - 1];

    res
      .status(200)
      .json({ message: "Address added successfully", user, addedAddress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// get address for edit
let getAddressForEdiit = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = req.params.addressId;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addresses = user.addresses;

    return res.status(200).json({ addresses });
  } catch (error) {
    console.error(error);
    res.staus(500).json({ error: "an error occured" });
  }
};

// edit address
let editAddress = async (req, res) => {
  const addressId = req.params.id;
  const { name, address, district, state, zip, email, phone } = req.body;
  7;
  try {
    const userForEditAddress = await User.findOne({ _id: req.user.id });

    if (!userForEditAddress) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = userForEditAddress.addresses.findIndex(
      (addr) => addr._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    // Update the address with new values
    userForEditAddress.addresses[addressIndex].name = name;
    userForEditAddress.addresses[addressIndex].address = address;
    userForEditAddress.addresses[addressIndex].district = district;
    userForEditAddress.addresses[addressIndex].state = state;
    userForEditAddress.addresses[addressIndex].zip = zip;
    userForEditAddress.addresses[addressIndex].email = email;
    userForEditAddress.addresses[addressIndex].phone = phone;

    let addressEdited = {
      name,
      address,
      district,
      state,
      zip,
      email,
      phone,
    };

    await userForEditAddress.save();

    res.status(200).json({ message: "address updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occured" });
  }
};

// delete address
let deleteAddress = async (req, res) => {
  const addressId = req.params.addressId;

  const userId = req.user.id;

  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const addressIndex = user.addresses.findIndex(
      (address) => address._id.toString() === addressId,
    );

    if (addressIndex === -1) {
      return res.status(404).json({ error: "Address not found" });
    }

    user.addresses.splice(addressIndex, 1);

    await user.save();

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// book service through COD
const bookServiceWithCod = async (req, res) => {
  try {
    const { serviceId, date, slot, selectedAddressId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const address = user.addresses.find(
      (addr) => addr._id.toString() === selectedAddressId,
    );
    const service = await Services.findById(serviceId).lean();
    if (!service) return res.status(404).send("Service not found");

    const amount = service
      ? service.sellingPrice || service.actualPrice || 0
      : 0;

    // create booking (unique index will protect against duplicate)
    const booking = new Booking({
      serviceId,
      userId,
      date,
      slot,
      status: "pending",
      paymentMethod: "COD",
      paymentStatus: "pending",
      amount,
      address,
    });

    await booking.save();

    await sendBookingEmail(user.email, {
      serviceName: service.title,
      date: booking.date,
      slot: booking.slot,
      price: booking.price,
    });

    // Schedule reminder email 30 min before
    scheduleReminderEmail(req.user.email, {
      serviceName: service.title,
      date: booking.date,
      slot: booking.slot,
    });

    res.redirect("/userProfile");
  } catch (error) {
    if (error.code === 11000) {
      return res.send("Slot already booked. Please choose another slot.");
    }
    console.error(error);
    res.status(500).send("Error creating booking");
  }
};

// place order through razorpay - starts here
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});
const placeOrderPostRazorpay = async (req, res) => {
  try {
    const { selectedAddressId, serviceId, date, slot } = req.body;
    const keyId = process.env.RAZORPAY_ID_KEY;

    const service = await Services.findById(serviceId).lean();
    if (!service) return res.status(404).send("Service not found");

    const totalPrice = service
      ? service.sellingPrice || service.actualPrice || 0
      : 0;

    const options = {
      amount: totalPrice * 100,
      currency: "INR",
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount, keyId });
  } catch (error) {
    console.error("Error creating order :", error);
    res.status(500).json({ error: "Failed to create order" });
  }
};
const successfulRazorpayOrder = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body.response;
    const { serviceId, date, slot, selectedAddressId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = user.addresses.find(
      (addr) => addr._id.toString() === selectedAddressId,
    );
    if (!address) {
      return res.status(404).json({ message: "Selected address not found" });
    }

    const service = await Services.findById(serviceId).lean();
    if (!service) return res.status(404).send("Service not found");

    const amount = service
      ? service.sellingPrice || service.actualPrice || 0
      : 0;

    // create booking (unique index will protect against duplicate)
    const booking = new Booking({
      serviceId,
      userId,
      date,
      slot,
      status: "confirmed",
      paymentMethod: "ONLINE",
      paymentStatus: "paid",
      amount,
      address,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    await booking.save();

    await sendBookingEmail(user.email, {
      serviceName: service.title,
      date: booking.date,
      slot: booking.slot,
      price: booking.price,
    });

    // Schedule reminder email 30 min before
    scheduleReminderEmail(req.user.email, {
      serviceName: service.title,
      date: booking.date,
      slot: booking.slot,
    });

    // Send a response with the new booking details
    res.status(201).json({
      message: "Order placed successfully!",
      bookingId: booking._id,
      totalAmount: booking.amount,
      shippingAddress: booking.address,
      paymentMethod: booking.paymentMethod,
    });
  } catch (error) {
    console.error("Error placing order throught razorpat payment :", error);
    res.status(500).json({ error: "An error occured" });
  }
};

// user profile get page with bookings and addresses
const userProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const addresses = user.addresses;
    const bookings = await Booking.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: "$service" },
      { $sort: { createdAt: -1 } },
    ]);

    res.status(200).render("user/account", {
      addresses,
      user,
      bookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// service cancel request post
let serviceCancelRequestPost = async (req, res) => {
  const { orderId, productId } = req.params;
  const { cancelReason } = req.body;
  const userId = req.user.id;

  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the order in the user's orders
    const order = user.orders.find((order) => order.orderId === orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the product in the order
    const product = order.products.find(
      (prod) => prod.productId.toString() === productId,
    );
    if (!product) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    // Update the order status and set the cancellation reason
    product.orderStatus = "Requested for Cancellation";
    product.cancelReason = cancelReason;

    // Save the user with the updated order
    await user.save();

    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// change password post
let changePasswordPost = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validatedPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!validatedPassword) {
      return res.status(400).json({ error: "Current password in incorrect" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedPassword;

    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// updated user details
let updateUserDetails = async (req, res) => {
  const { newName, newEmail, newPhone } = req.body;

  const userId = req.user.id;
  try {
    const user = await User.findOne({ _id: userId });

    if (!user) {
      res.status(404).json({ error: "User Not found" });
    }

    user.name = newName;
    user.email = newEmail;
    user.phoneNumber = newPhone;

    await user.save();
    res.status(200).json({ message: "User details updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server side error" });
  }
};

// contact page get
let getContactPage = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    let user;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const userId = decoded.id;
      user = await User.findById(userId);
    }

    res.status(200).render("user/contact", {
      user,
      wishlistProducts: user?.wishlist.products,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect(" ");
  }
};

// create review - POST
const postServiceReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId, bookingId, rating, description } = req.body;
    console.log(req.body);

    console.log("called md", rating, description);

    const review = new Reviews({
      userId,
      serviceId,
      bookingId,
      rating,
      description,
    });

    await review.save();

    res.status(200).send({ message: "Review created successfully" });
  } catch (error) {
    console.error("Error while creating review : ", error);
  }
};

module.exports = {
  homePage,
  signupGetPage,
  signupPostPage,
  signupVerify,
  loginGetPage,
  loginPostPage,
  userLogout,
  userProfile,
  loadAuth,
  loginWithOtpGetPage,
  forgotGetPage,
  forgotEmailPostPage,
  resetPassword,
  addAddress,
  getAddressForEdiit,
  editAddress,
  deleteAddress,
  placeOrderPostRazorpay,
  successfulRazorpayOrder,
  changePasswordPost,
  updateUserDetails,
  getContactPage,
  getServicesPage,
  bookServiceGetPage,
  getServiceSlots,
  checkoutServiceGetPage,
  bookServiceWithCod,
  serviceDetailsGetPage,
  serviceCancelRequestPost,
  postServiceReview,
};
