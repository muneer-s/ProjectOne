const express = require("express");
const user_route = express();
const nodemailer = require("nodemailer")
const { isUserLogout } = require("../middleware/authUser");



// Set up view engine and body parser
const bodyparser = require("body-parser")
user_route.use(bodyparser.json());
user_route.use(bodyparser.urlencoded({extended:true}))

// Set up multer for file handling
const multer = require("multer");
const path = require("path")

// user controllers
const userController = require("../controllers/userController");
const userOtpLoginController = require("../controllers/userOtpLoginController");
const userCartController = require("../controllers/userCartController")
const userProfileController = require("../controllers/userProfileController")
const orderController = require("../controllers/orderController")
const wishlistController = require("../controllers/wishlistController")
const userCouponController = require("../controllers/userCouponController")


//user registration
user_route.get('/register',isUserLogout,userController.loadRegister);
user_route.post('/register',userController.insertUser);

// OTP functionality
user_route.get('/otp',isUserLogout,userController.otpload);//
user_route.post('/otp',userController.verifyOtp) ; 

//resend otp
user_route.post('/resendOtp',userController.resendOtp)

// OTP login
user_route.post('/check-email-registration',userOtpLoginController.otpLogin);
user_route.get('/otploginload',userOtpLoginController.otpload);
user_route.post('/otpLoginLoad',userOtpLoginController.otpLoginLoad);


// user login
user_route.get('/login',isUserLogout,userController.loginload);
user_route.post('/login',userController.userlogin);

// user home and logout
user_route.get('/',userController.homeload);
user_route.get('/logout',userController.logOut);


//product 
user_route.get('/productPage',userController.loadProductPage);
user_route.get('/singleProductPage/:id',userController.loadSingleProductPage);
// filter
user_route.get('/filter',userController.filter)
user_route.get('/search',userController.search)




//cart
user_route.get('/Cart',userCartController.loadCart)
user_route.post('/addToCart',userCartController.addToCart)
user_route.post("/change-product-quantity", userCartController.quantityUpdate);
user_route.post("/submitQuantity", userCartController.submitQuantity);
user_route.post('/removeItem',userCartController.removeItem)



//user profile

user_route.get('/userprofile',userProfileController.userProfileLoad)
// Update user data route
user_route.post('/updateProfile',userProfileController.updateProfile)
//password change
user_route.post('/check-password',userProfileController.checkPassword)
user_route.post('/change-password',userProfileController.changePassword)

user_route.post('/addAddress',userProfileController.addAddress)
//delete address form user profile
user_route.delete('/deleteAddress/:userId/:addressId',userProfileController.deleteAddress)
//load view item page in my orders
user_route.get('/viewItems/:id',userProfileController.loadViewItems)
//edit address
user_route.get('/user/:userId/address/:id',userProfileController.editAddress)
user_route.put('/address/:id',userProfileController.saveEditAddress)



//checkout page load
user_route.get('/CheckOutPage',userProfileController.loadCheckOutPage)
  



//order
user_route.get('/order',orderController.loadOrder)
user_route.post('/placeOrder',orderController.placeOrder)
user_route.post('/verifyPayment',orderController.verifyPayment)




//userprofule order details page
user_route.get('/orderDetailsPage',orderController.orderDetailsPage)
//update status
user_route.post('/updateOrderStatus/:orderId',orderController.userupdatestatus)



//wishlist
user_route.get('/wishlist',wishlistController.loadWishlist)
// Add to wishlist 
user_route.get('/addToWishlist',wishlistController.addToWishlist)
//delete from wishlist
user_route.get('/deleteWishlist',wishlistController.deleteProductFromWishlist)




//coupon
user_route.post('/applyCoupon',userCouponController.applyCoupon)



module.exports = user_route;