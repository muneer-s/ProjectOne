const User = require("../models/userModel");
const products = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const Cart = require("../models/cartModel");
const orderid = require("order-id")("key");
const Order = require("../models/orderModel");

const loadOrder = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userId = req.session.user_id;
      const userData = await User.findOne({ _id: userId });
      const user = await User.findOne({ _id: userData._id });
      req.session.orderData = null;
      const orderId = req.session.oderData._id;
      console.log("order id is -  -", orderid);
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





const order = async (req, res) => {
  try {
    const addressId = req.body.selectedAddressId;
    const paymentIntent = req.body.paymentMethod
    const userId = req.session.user_id;
    let cartData = await Cart.findOne({ userId: userId });
    const user = await User.findOne(
      { _id: userId },
      { address: { $elemMatch: { _id: addressId } } }
    );
    const address = user.address[0];
    const orderId = orderid.generate();
    let originalAmount = 0;
    //console.log("cartdata ",cartData);
    if (cartData) {
      cartData.products.forEach((cartItem) => {
        originalAmount = originalAmount + cartItem.total;
      });
    }

    
    const order = new Order({
      products: cartData.products,
      orderId: orderId,
      totalPrice: originalAmount,
      paymentIntent: paymentIntent,
      address: address,
      userId: userId,
    });

    await order.save();

    req.session.oderData = order;

    cartData.products = [];
    await cartData.save();
    res.status(200).json({ data: "data" });
  } catch (error) {
    console.log(error.message);
  }
};
const orderDetailsPage = async (req, res) => {
  try {
    const userid = req.session.user_id;
    const userData = await User.findOne({ _id: userid });
    const user = await User.findOne({ _id: userData._id });

    const userId = req.session.user_id;
    let orderdetails = await Order.find({ userId: userId });
    // console.log("in order details page: ",orderdetails);
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
  const orderId = req.params.orderId;
  const { status } = req.body;
  console.log("user updated 1;;;", orderId);
  console.log(("status;;;", status));

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = status;
    await order.save();

    res.status(200).json({ message: "Order status updated successfully" });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  loadOrder,
  order,
  orderDetailsPage,
  userupdatestatus,
};
