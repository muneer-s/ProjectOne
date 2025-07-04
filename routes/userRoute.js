const express = require("express");
const user_route = express();
const { isUserLogout,isUserLogin } = require("../middleware/authUser");

// user controllers
const userController = require("../controllers/userController");
const userOtpLoginController = require("../controllers/userOtpLoginController");
const userCartController = require("../controllers/userCartController");
const userProfileController = require("../controllers/userProfileController");
const orderController = require("../controllers/orderController");
const wishlistController = require("../controllers/wishlistController");
const userCouponController = require("../controllers/userCouponController");

user_route.get("/register", isUserLogout, userController.loadRegister);
user_route.post("/register", userController.insertUser);

user_route.get("/otp", isUserLogout, userController.otpload); //
user_route.post("/otp", userController.verifyOtp);

//resend otp
user_route.post("/resendOtp", userController.resendOtp);

// OTP login
user_route.post("/check-email-registration", userOtpLoginController.otpLogin);
user_route.get("/otploginload", userOtpLoginController.otpload);
user_route.post("/otpLoginLoad", userOtpLoginController.otpLoginLoad);

// user login
user_route.get("/login", isUserLogout, userController.loginload);
user_route.post("/login", userController.userlogin);

// user home and logout
user_route.get("/", userController.homeload);
user_route.get("/logout", userController.logOut);

//product
user_route.get("/productPage", userController.loadProductPage);
user_route.get("/singleProductPage/:id", userController.loadSingleProductPage);
// filter
user_route.get("/filter", userController.filter);
user_route.get("/search", userController.search);

//cart
user_route.get("/Cart",isUserLogin, userCartController.loadCart);
user_route.post("/addToCart",isUserLogin, userCartController.addToCart);
user_route.post("/change-product-quantity",isUserLogin, userCartController.quantityUpdate);
user_route.post("/submitQuantity",isUserLogin, userCartController.submitQuantity);
user_route.post("/removeItem",isUserLogin, userCartController.removeItem);

//user profile

user_route.get("/userprofile",isUserLogin, userProfileController.userProfileLoad);
// Update user data route
// user_route.post("/updateProfile",isUserLogin, userProfileController.updateProfile);

user_route.post("/updateProfile", isUserLogin, (req, res, next) => {
  console.log("✔ Router received POST /updateProfile");
  next(); // ensure the controller runs after this
}, userProfileController.updateProfile);

//password change
user_route.post("/check-password",isUserLogin, userProfileController.checkPassword);
user_route.post("/change-password",isUserLogin, userProfileController.changePassword);

user_route.post("/addAddress", isUserLogin,userProfileController.addAddress);
//delete address form user profile
user_route.delete(
  "/deleteAddress/:userId/:addressId",isUserLogin,
  userProfileController.deleteAddress
);
//load view item page in my orders
user_route.get("/viewItems/:id", isUserLogin, userProfileController.loadViewItems);
//edit address
user_route.get("/user/:userId/address/:id",isUserLogin, userProfileController.editAddress);
user_route.put("/address/:id",isUserLogin, userProfileController.saveEditAddress);
//download invoice
user_route.get("/download-invoice/:id",isUserLogin, userProfileController.downloadInvoice);

//checkout page load
user_route.get("/CheckOutPage",isUserLogin, userProfileController.loadCheckOutPage);

//order
user_route.get("/order",isUserLogin, orderController.loadOrder);
user_route.post("/placeOrder",isUserLogin, orderController.placeOrder);
user_route.post("/verifyPayment",isUserLogin, orderController.verifyPayment);
user_route.post("/failedOrders",isUserLogin, orderController.failedOrders);
user_route.post("/retryPayment", isUserLogin,orderController.retryPayment);
// user_route.post("/retry-callback", isUserLogin,orderController.verifyPayment);
user_route.post("/retry-callback", isUserLogin,orderController.retryCallback);
user_route.post("/removeCoupon", isUserLogin,orderController.removeCoupon);

//userprofule order details page
user_route.get("/orderDetailsPage",isUserLogin, orderController.orderDetailsPage);
//update status
user_route.post(
  "/updateOrderStatus/:orderId",isUserLogin,
  orderController.userupdatestatus
);

//wishlist
user_route.get("/wishlist",isUserLogin, wishlistController.loadWishlist);
// Add to wishlist
user_route.get("/addToWishlist",isUserLogin, wishlistController.addToWishlist);
//delete from wishlist
user_route.get("/deleteWishlist",isUserLogin, wishlistController.deleteProductFromWishlist);

//coupon
user_route.post("/applyCoupon",isUserLogin, userCouponController.applyCoupon);

module.exports = user_route;
