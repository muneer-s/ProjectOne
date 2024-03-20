const User = require("../models/userModel");
const Category = require("../models/categories");
const products = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const categories = require("../models/categories");
const session = require("express-session");
const flash = require("connect-flash");
const orderid = require("order-id")("key");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");


const loadOrderList = async (req, res) => {
  try {
    if (req.session.email) {
      const orders = await Order.find({})
        .populate("products.productId")
        .populate("address")
        .populate("userId");

      res.render("./adminSide/orderList", { orders });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    if (req.session.email) {
      const orderId = req.params.orderId;
      const orders = await Order.find({ _id: orderId })
        .populate("products.productId")
        .populate("address")
        .populate("userId");

      res.render("./adminSide/adminOrderDetails", { orders });
    }
  } catch (error) {
    console.log(error.message);
  }
};

//update status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId;

    const order = await Order.findOne({ _id: orderId });
    if (order.orderStatus === "Cancel" || order.orderStatus === "Return") {
      return res.status(400).json({ error: "Cannot change status further" });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: status } },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Status updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  loadOrderList,
  loadOrderDetails,
  updateOrderStatus,
};
