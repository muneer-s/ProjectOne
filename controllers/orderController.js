const User = require("../models/userModel");
const products = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const Cart = require("../models/cartModel");
const orderid = require("order-id")("key");
const Order = require("../models/orderModel");
const Razorpay = require("razorpay");
const { Promise } = require("mongoose");
const { success } = require("toastr");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

var instance = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});

const loadOrder = async (req, res) => {
  try {
    if (req.session.user_id) {
      delete req.session.couponCode;
      delete req.session.couponDiscount;

      const userId = req.session.user_id;
      const user = await User.findOne({ _id: userId });
      const orderId = req.session.oderData._id;
      req.session.oderData = null;
      const orders = await Order.findOne({ _id: orderId }).populate(
        "products.productId"
      );
      res.render("./users/orderPlaced", { orders, user });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

//placeorder
const placeOrder = async (req, res) => {
  try {
    let { couponDiscount } = req.session;
    let couponCode = req.session.couponCode;

    const totalWithCoupon = req.session.newAmountUsingCoupon;

    const addressId = req.body.selectedAddressId;
    const paymentIntent = req.body.paymentMethod;
    const userId = req.session.user_id;
    let cartData = await Cart.findOne({ userId: userId });
    const user = await User.findOne(
      { _id: userId },
      { address: { $elemMatch: { _id: addressId } } }
    );

    const address = user.address[0];
    const orderId = orderid.generate();

    let originalAmount = 0;
    if (cartData) {
      cartData.products.forEach((cartItem) => {
        originalAmount = originalAmount + cartItem.total;
      });
    }

    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { Code: couponCode },
        { $push: { userUsed: { user_id: userId } } }
      );
    }

    const order = new Order({
      products: cartData.products,
      orderId: orderId,
      totalPrice: originalAmount - (couponDiscount || 0),
      paymentIntent: req.body.paymentMethod,
      address: address,
      userId: userId,
    });

    await order.save();
    req.session.order_id = order._id;

    const paymentMethod = req.body.paymentMethod;

    if (paymentMethod == "Cash on delivery") {
      await Order.updateOne(
        { _id: order._id },
        { $set: { orderStatus: "Order Placed" } }
      );
      if (cartData && cartData.products) {
        const cartItems = cartData.products;

        cartItems.map(async (cartItem) => {
          const product = await products.findById(cartItem.productId).exec();
          if (product) {
            product.quantity -= cartItem.quantity;
            await product.save();
          }
        });
      }

      req.session.oderData = order;

      cartData.products = [];
      await cartData.save();
      res.json({ codSuccess: true });
    } else if (paymentMethod == "Wallet") {
      const totalAmount = req.body.totalAmount;

      const wallet = await Wallet.findOne({ user: req.session.user_id });
      wallet.balance -= totalAmount;
      wallet.transactions.push({
        orderId: order._id,
        type: "Debit",
        amount: totalAmount,
        date: new Date(),
      });
      await wallet.save();
      await Order.updateOne(
        { _id: order._id },
        { $set: { orderStatus: "Order Placed" } }
      );
      if (cartData && cartData.products) {
        const cartItems = cartData.products;

        cartItems.map(async (cartItem) => {
          const product = await products.findById(cartItem.productId).exec();
          if (product) {
            product.quantity -= cartItem.quantity;
            await product.save();
          }
        });
      }
      req.session.oderData = order;

      cartData.products = [];
      await cartData.save();
      res.json({ walletSuccess: true });
    } else {
      //razorpay
      var options = {
        amount: (originalAmount - (couponDiscount || 0)) * 100,
        currency: "INR",
        receipt: order._id,
      };
      req.session.oderData = order;

      instance.orders.create(options, function (err, razorpayOrder) {
        if (err) {
          console.log(err.message);
        } else {
          res.json({ success: false, razorpayOrder });

          console.log("razorpay order ", razorpayOrder);
        }
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

//remove coupon
const removeCoupon = async (req, res) => {
  try {
    req.session.couponDiscount = null;
    req.session.couponCode = null;
    req.session.newAmountUsingCoupon = null;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while removing the coupon.",
      });
  }
};

//razorpay failed orders
const failedOrders = async (req, res) => {
  try {
    const userId = req.session.user_id;
    let cartData = await Cart.findOne({ userId: userId });

    await Order.updateOne(
      { _id: req.session.order_id },
      { $set: { orderStatus: "Pending" } }
    );

    cartData.products = [];
    await cartData.save();
  } catch (error) {
    console.log(error.message);
  }
};

//retry razorpay
const retryPayment = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send({ message: "Order not found" });
    }

    const { totalPrice } = order;

    var options = {
      amount: totalPrice * 100,
      currency: "INR",
      receipt: orderId,
    };
    req.session.oderData = order;

    const ordeer = await instance.orders.create(options);
    res.json({ success: true, razorpayOrder: ordeer });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
};

const retryCallback = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const response = req.body.response;
    const bodyOrder = req.body.order;
    const order = await Order.findOne({ _id: bodyOrder });

    var crypto = require("crypto");
    let hmac = crypto.createHmac("sha256", "Bcd9iqDRBd0iWJlO6C5GlsfD");

    hmac.update(
      response.razorpay_order_id + "|" + response.razorpay_payment_id
    );
    hmac = hmac.digest("hex");

    if (hmac == response.razorpay_signature) {
      order.orderStatus = "Order Placed";
      await order.save();
      res.json({ status: true });
    }
  } catch (error) {
    console.log("verify err ", error.message);
  }
};

const orderDetailsPage = async (req, res) => {
  try {
    const userid = req.session.user_id;
    const userData = await User.findOne({ _id: userid });
    const user = await User.findOne({ _id: userData._id });

    const userId = req.session.user_id;
    let orderdetails = await Order.find({ userId: userId });
    if (req.session.user_id) {
      res.render("./users/orderDetails", { orderdetails, user });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const userupdatestatus = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { status } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let wallet = await Wallet.findOne({ user: order.userId });

    if (!wallet) {
      wallet = await Wallet.create({ user: order.userId });
    }
    wallet.transactions.push({
      orderId: orderId,
      type: "Credit",
      amount: order.totalPrice,
    });
    wallet.balance += order.totalPrice;
    await wallet.save();

    order.orderStatus = status;
    await order.save();

    for (const item of order.products) {
      const product = await products.findById(item.productId);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }

    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    const response = req.body.response;
    const bodyOrder = req.body.order;

    var crypto = require("crypto");
    let hmac = crypto.createHmac("sha256", "Bcd9iqDRBd0iWJlO6C5GlsfD");

    hmac.update(
      response.razorpay_order_id + "|" + response.razorpay_payment_id
    );
    hmac = hmac.digest("hex");

    if (hmac == response.razorpay_signature) {
      await Order.updateOne(
        { _id: bodyOrder.receipt },
        { $set: { orderStatus: "Order Placed" } }
      );
      for (const item of cart.products) {
        const productId = item.productId._id;
        const quantityToSubtract = item.quantity;
        await products.findByIdAndUpdate(productId, {
          $inc: { quantity: -quantityToSubtract },
        });
      }
      cart.products = [];
      const cartData = await cart.save();
      cartData ? res.json({ status: true }) : null;
    }
  } catch (error) {
    console.log("verify err ", error.message);
  }
};

module.exports = {
  loadOrder,
  placeOrder,
  orderDetailsPage,
  userupdatestatus,
  verifyPayment,
  failedOrders,
  retryPayment,
  retryCallback,
  removeCoupon,
};
