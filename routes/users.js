const express = require("express");
const router = express.Router();
const userController = require("../controller/usersController");
require("dotenv").config();
const bodyParser = require("body-parser");
const {verifyToken} = require('../middleware/jwtMiddleware');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
const upload = require("../config/multer");

// ROUTER
router.get("/", userController.homePage);
router.get("/login",verifyToken, userController.loginGetPage);
router.get("/signup", userController.signupGetPage);
router.get("/userProfile", verifyToken, userController.userProfile);
router.get("/user/logout", userController.userLogout);
router.get("/", userController.loadAuth);
router.get("/forgotPassword", userController.forgotGetPage);
router.get("/services", userController.getServicesPage);
router.get("/service/:id", userController.serviceDetailsGetPage);
router.get("/service/:id/book", verifyToken, userController.bookServiceGetPage);
router.get("/service/:id/slots", verifyToken, userController.getServiceSlots);
router.get("/userProfile", verifyToken, userController.userProfile);


router.get("/getAddressEdit/:addressId",verifyToken,userController.getAddressForEdiit)
router.get("/contact", userController.getContactPage)

router.post("/user/send-otp", userController.signupPostPage);
router.post('/verify-otp', userController.signupVerify)
router.post("/user/login", userController.loginPostPage);
router.post("/forgotPassword", userController.forgotEmailPostPage);
router.post("/resetPassword", userController.resetPassword);
router.post("/add-address",verifyToken,userController.addAddress)
router.post("/cancelOrder/:orderId/:productId",verifyToken,userController.serviceCancelRequestPost)
router.post("/change-password",verifyToken,userController.changePasswordPost)
router.post("/update-user-details",verifyToken,userController.updateUserDetails)
router.post("/book/checkout", verifyToken, userController.checkoutServiceGetPage);
router.post("/book/cod", verifyToken, userController.bookServiceWithCod)
router.post("/booking/razorPay",verifyToken,userController.placeOrderPostRazorpay)
router.post("/razorpay-verify",verifyToken,userController.successfulRazorpayOrder)
router.post("/create/review",verifyToken,upload.array("reviewImages"),userController.postServiceReview,);

router.put("/update-address/:id",verifyToken,userController.editAddress)

router.delete("/delete-address/:addressId",verifyToken,userController.deleteAddress)


module.exports = router;