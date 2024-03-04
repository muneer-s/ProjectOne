const User = require("../models/userModel");
const products = require("../models/addproductModel");
const session = require("express-session");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const Coupon = require("../models/couponModel");

const loadCouponPage = async (req, res) => {
  try {
    res.render("./adminSide/addCoupon");
  } catch (error) {
    console.log(error.message);
  }
};

const saveCoupon = async (req, res) => {
  try {
    const { coupon_code, Discount, Max_Price, Exp_Date } = req.body;

    const existingCoupon = await Coupon.findOne({ coupon_code });

    if (existingCoupon) {
      return (req.session.existCoupon = "Coupon code already exists");
    }

    const newCoupon = new Coupon({
      Code: coupon_code,
      Discount: Discount,
      MaxPrice: Max_Price,
      expiryDate: Exp_Date,
    });

    await newCoupon.save();
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadCouponPage,
  saveCoupon,
};
