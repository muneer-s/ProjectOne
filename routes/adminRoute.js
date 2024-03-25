const express = require("express");
const admin_route = express();
const {isAdminLogin, isAdminLogout} = require('../middleware/authAdmin')

// importing middleware for handling file uploads
const upload = require('../middleware/uploadImage');
const path = require("path")


// admin controller
const adminController = require("../controllers/adminController");
const adminOrderController = require("../controllers/adminOrderController")
const adminCouponController = require("../controllers/adminCouponController")
const adminOfferController = require("../controllers/offerController")
const adminSalesReportController = require("../controllers/adminSalesReport")




 // Admin home
admin_route.get('/adminHome',isAdminLogin,adminController.adminLoadHome);

// Admin login
admin_route.get('/adminLogin',isAdminLogout,adminController.adminloadlogin);
admin_route.post('/adminLogin',adminController.adminverify);
admin_route.get('/adminLogout',adminController.Adminlogout)

// Category management
admin_route.get('/addCategory',isAdminLogin,adminController.loadCategory);
admin_route.post('/addCategory',adminController.addCategory);
// Category editing and deletion
admin_route.get('/editCategory/:id',isAdminLogin,adminController.editCategory);
admin_route.post("/updateCategory/:id",adminController.updateCategory);
admin_route.get("/deleteCategory/:id",isAdminLogin,adminController.deleteCategory);

// Product management
admin_route.get('/addProduct',isAdminLogin,adminController.adminAddProduct);
admin_route.post('/addproduct',upload.array('product_images',4),adminController.addProduct);
admin_route.get('/loadProductList',isAdminLogin,adminController.loadProductList);
admin_route.get('/loadEditProduct',isAdminLogin,adminController.loadEditProduct);
admin_route.post('/postEditProduct',upload.array('product_images',4),adminController.postEditProduct);
admin_route.post('/deleteProductImage',adminController.deleteProductImage)



//updating the product status
admin_route.put('/updateStatus/:productId', adminController.updateProductStatus);


// User management
admin_route.get('/userDetails',isAdminLogin,adminController.userDetails);
admin_route.post('/blockUserStatus',adminController.blockuser);
admin_route.post('/unblockUserStatus',adminController.unBlockuser);


 //order management
 admin_route.get('/orderList',isAdminLogin,adminOrderController.loadOrderList)
 admin_route.get('/adminOrderDetails/:orderId',isAdminLogin,adminOrderController.loadOrderDetails)
 //status change
 admin_route.post('/adminUpdateOrderStatus/:orderId',adminOrderController.updateOrderStatus)





//loadcoupon page
admin_route.get('/Coupon',isAdminLogin,adminCouponController.loadCouponPage)
// save coupon
admin_route.post('/couponSave',adminCouponController.saveCoupon)
admin_route.get('/couponList',isAdminLogin,adminCouponController.viewCoupon)
admin_route.get('/deleteCoupon',isAdminLogin,adminCouponController.deleteCoupon)




//offer

admin_route.get('/addoffer',isAdminLogin,adminOfferController.loadOfferPage)
admin_route.post('/saveOffer',adminOfferController.saveOffer)
admin_route.get('/viewOffer',isAdminLogin,adminOfferController.viewOffer)
admin_route.get('/deleteOffer',isAdminLogin,adminOfferController.deleteOffer)
//offer for products
admin_route.get('/loadOfferForProducts',isAdminLogin,adminController.loadOfferForProducts)
admin_route.get('/applyOffer',isAdminLogin,adminController.applyOffer)
// offer for category
admin_route.get('/loadOfferForCategory',isAdminLogin,adminController.loadOfferForCategory)
admin_route.post('/applyOfferForCategory',adminController.applyOfferForCategory)
//delete offer from product
admin_route.delete('/deleteOfferFromProduct',adminController.deleteOfferFromProduct)
//delete offer from category
admin_route.delete('/deleteOffer/:categoryId',adminController.deleteOfferFromCategory)



//sales report
admin_route.get('/SalesReport',isAdminLogin,adminSalesReportController.loadSalesReportPage)
admin_route.get('/download-salesreport',adminSalesReportController.downloadSalesReport)



module.exports = admin_route;