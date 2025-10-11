const express = require("express");
const router = express.Router();
const adminController = require("../controller/adminController");
const { adminAuthMiddleware }  = require("../middleware/jwtMiddleware");
const bodyParser = require("body-parser");
const adminModel = require("../models/adminModel");
const upload = require("../config/multer")


// body parser middleware
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));


// ROUTER
router.get("/login", adminController.loginGetPage);
router.get("/dashboard",adminAuthMiddleware,adminController.dashboardPage)
router.get("/logout",adminController.adminLogout)
router.get("/customersList",adminAuthMiddleware,adminController.customersList)
router.get("/categoryList",adminAuthMiddleware,adminController.categoryList)
router.get("/subcategoryList",adminAuthMiddleware,adminController.subcategoryList)
router.get("/vendorsList",adminAuthMiddleware,adminController.vendorsList)
router.get("/banner",adminAuthMiddleware,adminController.bannerGetPage)

router.post("/loginPost", adminController.loginPostPage);
router.post("/addCategory",adminAuthMiddleware,adminController.addCategory)
router.post("/updateCategory",adminAuthMiddleware,adminController.updateCategory)
router.post("/deleteCategory",adminAuthMiddleware,adminController.deleteCategory)
router.post("/addSubcategory",adminAuthMiddleware,adminController.addSubcategory)
router.post("/updateSubcategory",adminAuthMiddleware,adminController.updateSubcategory)
router.post("/deleteSubcategory",adminAuthMiddleware,adminController.deleteSubcategory)
router.post('/blockUser',adminController.blockUser);
router.post("/vendorVerify",adminController.verifyVendor)
router.post("/bannerAdd",adminAuthMiddleware,upload.array('bannerImage'),adminController.bannerAddPost)


router.delete("/bannerDelete/:bannerId",adminAuthMiddleware,adminController.deleteBanner)


//service related routes
router.get("/servicesList",adminAuthMiddleware,adminController.servicesList)
router.get("/bookings",adminAuthMiddleware,adminController.bookingList)




module.exports = router;
