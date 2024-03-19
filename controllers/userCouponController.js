const User = require("../models/userModel");
const products = require("../models/addproductModel");
const session = require("express-session");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const Coupon = require("../models/couponModel");

//apply coupon
const applyCoupon = async (req, res) => {
  try {
    const userInputData = req.body.couponName;
    const user_id = req.session.user_id;
    const cartDetails = await Cart.findOne({ userId: user_id }).populate({
      path: "products.productId",
      model: "product",
      select: "name",
    });

    let originalAmount = 0;

    if (cartDetails) {
      cartDetails.products.forEach((cartItem) => {
        originalAmount += cartItem.total;
      });
    }
    const couponfind = await Coupon.findOne({ Code: userInputData });

    const couponUsed = await Coupon.findOne({
        Code:userInputData,
        "userUsed.user_id": user_id,    
      });

      if( originalAmount < couponfind.MaxPrice ){
        return res.json({mimimumValueError:true})
      }

      if(couponUsed){
        return res.json({couponsUsed:true});
      }
    
    let DiscountAmount = couponfind.Discount
    req.session.couponDiscount = DiscountAmount || 0;
    let newAmountUsingCoupon = originalAmount - DiscountAmount
    req.session.newAmountUsingCoupon = newAmountUsingCoupon
    

    if (couponfind) {
      if (couponfind.status == false) {
        return res.json({ success: false, message: "Coupon is not active." });
      } else {
        req.session.couponCode = couponfind.Code
        console.log("Coupon applied successfully.");
        return res
          .status(200)
          .json({ success: true, message: "Coupon applied successfully." });
      }
    } else {
      console.log("Coupon not found.");
      return res.json({ success: false, message: "Coupon not found." });
    }
  } catch (error) {
    console.log(error.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while applying the coupon.",
      });
  }
};


module.exports = {
  applyCoupon,
};
