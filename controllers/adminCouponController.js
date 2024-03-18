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

    const existingCoupon = await Coupon.findOne({ Code: coupon_code });
    console.log("exist : ", existingCoupon);

    if (existingCoupon) {
      req.flash("error", "Coupon with the same name already exists.");
      return res.redirect("/Coupon");
    }

    const newCoupon = new Coupon({
      Code: coupon_code,
      Discount: Discount,
      MaxPrice: Max_Price,
      expiryDate: Exp_Date,
    });

    await newCoupon.save();
    res.redirect("/couponList");
  } catch (error) {
    console.log(error.message);
  }
};

//load coupon list page
const viewCoupon = async (req, res) => {
  try {
    const currentDate = Date.now();
    await Coupon.updateMany(
      { expiryDate: { $gte: currentDate } },
      { $set: { status: true } }
    );
    await Coupon.updateMany(
      { expiryDate: { $lte: currentDate } },
      { $set: { status: false } }
    );
    const coupon = await Coupon.find({});
    res.render("./adminSide/couponList", { coupon });
  } catch (error) {
    console.log(error.message);
  }
};

// Delete Coupon
const deleteCoupon = async (req, res) => {
  try {
    const id = req.query.id;
    const deleteItem = await Coupon.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
    });
    res.redirect("/couponList");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadCouponPage,
  saveCoupon,
  viewCoupon,
  deleteCoupon,
};
