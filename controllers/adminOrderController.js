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

        console.log("order::",orders);

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

        console.log("avf;;",orders);
      res.render("./adminSide/orderDetails", { orders });
    }
    
  } catch (error) {
    console.log(error.message);
  }
};

//update status
const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  console.log("status---", status);
  const orderId = req.params.orderId;
  console.log("orderid ;;;", orderId);

  try {
    // Find the order by orderId and update its status
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: status } },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Status updated successfully", order: updatedOrder });
    // res.render('./adminSide/orderList')
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
