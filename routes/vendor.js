const express = require("express");
const router = express.Router();
const vendorController = require("../controller/vendorController");
const { vendorAuthMiddleware } = require("../middleware/jwtMiddleware");
const upload = require("../config/multer")
const bodyParser = require("body-parser");

router.use(bodyParser.json({ limit: "10mb" }));
router.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

router.get("/dashboard",vendorAuthMiddleware,vendorController.dashboard)
router.get("/login", vendorController.loginGetPage);
router.get("/forgotPassword",vendorController.forgotEmail)
router.get("/register",vendorController.registerGetPage)
router.get("/logout",vendorController.vendorLogout)

router.get("/addService",vendorAuthMiddleware,vendorController.addService)
router.get("/servicesList",vendorAuthMiddleware,vendorController.servicesList)
router.get("/bookings", vendorAuthMiddleware, vendorController.getbookings)
router.get("/editService/:id",vendorAuthMiddleware,vendorController.editService)
router.get(`/reviews`,vendorAuthMiddleware, vendorController.getReviews)

router.post("/register",vendorController.vendorRegisterPostPage) 
router.post("/login",vendorController.vendorLoginPostPage)
router.post("/forgotEmail",vendorController.forgotPassEmailPost)
router.post("/forgotOtpPost",vendorController.forgotOrpVerify)

router.post("/addService",vendorAuthMiddleware,upload.fields([{ name: 'mainImage', maxCount: 1 }, { name: 'secondImage', maxCount: 1 }, { name: 'thirdImage', maxCount: 1 }, { name: 'fourthImage', maxCount: 1 }]),vendorController.addServicePost)
router.post("/editService/:id",vendorAuthMiddleware,upload.array('productImages',4),vendorController.editServicePost)
router.post("/updateBookingStatus/:bookingId",vendorAuthMiddleware,vendorController.updateBookingStatus);

router.post("/deleteService/:id",vendorAuthMiddleware,vendorController.deleteService)
router.post("/uploadProfilePicture", vendorAuthMiddleware, vendorController.uploadProfilePicture);






router.get("/sales-report/excel/:startDate/:endDate",vendorAuthMiddleware,vendorController.salesExcel)




// services routes








module.exports = router;    