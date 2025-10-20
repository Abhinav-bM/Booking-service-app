const express = require("express");
const router = express.Router();
const vendorController = require("../controller/vendorController");
const { vendorAuthMiddleware } = require("../middleware/jwtMiddleware");
const upload = require("../config/multer")
const bodyParser = require("body-parser");

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.get("/dashboard",vendorAuthMiddleware,vendorController.dashboard)
router.get("/login", vendorController.loginGetPage);
router.get("/forgotPassword",vendorController.forgotEmail)
router.get("/register",vendorController.registerGetPage)
router.get("/logout",vendorController.vendorLogout)
router.get("/editProduct/:id",vendorAuthMiddleware,vendorController.editProduct)
router.get("/orders",vendorAuthMiddleware,vendorController.getOrdersForVendor)
router.get("/sales-report/excel/:startDate/:endDate",vendorAuthMiddleware,vendorController.salesExcel)
router.get("/returnRepayment",vendorAuthMiddleware,vendorController.returnRepaymentGetPage)
router.get(`/reviews`,vendorAuthMiddleware, vendorController.getReviews)

router.post("/register",vendorController.vendorRegisterPostPage) 
router.post("/login",vendorController.vendorLoginPostPage)
router.post("/forgotEmail",vendorController.forgotPassEmailPost)
router.post("/forgotOtpPost",vendorController.forgotOrpVerify)
router.post("/editProduct/:id",vendorAuthMiddleware,upload.array('productImages',4),vendorController.editProductPost)
router.post("/deleteProduct/:id",vendorAuthMiddleware,vendorController.deleteProduct)
// services routes
router.get("/addService",vendorAuthMiddleware,vendorController.addService)
router.get("/servicesList",vendorAuthMiddleware,vendorController.servicesList)
router.get("/bookings", vendorAuthMiddleware, vendorController.getbookings)


router.post("/addService",vendorAuthMiddleware,upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'secondImage', maxCount: 1 }, { name: 'thirdImage', maxCount: 1 }, { name: 'fourthImage', maxCount: 1 }]),vendorController.addServicePost)
router.post("/updateBookingStatus/:bookingId",vendorAuthMiddleware,vendorController.updateBookingStatus);


module.exports = router;    