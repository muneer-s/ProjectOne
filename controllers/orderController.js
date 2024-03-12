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

const loadOrder = async (req, res) => {
  try {
    if (req.session.user_id) {
      console.log("orderkk vannuuuuuuuuuuuuuuuuuuuuuuuu");

      const userId = req.session.user_id;
      console.log(userId);
      const user = await User.findOne({ _id: userId });
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

const placeOrder = async (req, res) => {
  try {
    console.log("hello bro sugalle ", req.body);

    const addressId = req.body.selectedAddressId;
    const paymentIntent = req.body.paymentMethod;
    const userId = req.session.user_id;
    let cartData = await Cart.findOne({ userId: userId });
    const user = await User.findOne(
      { _id: userId },
      { address: { $elemMatch: { _id: addressId } } }
    );

    console.log("iamuser", user);
    const address = user.address[0];
    const orderId = orderid.generate();

    console.log("iamorderid", orderId);

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
      paymentIntent: req.body.paymentMethod,
      paymentStatus: "Pending",
      address: address,
      userId: userId,
    });

    await order.save();
    console.log("lllllllllllll");
    const paymentMethod = req.body.paymentMethod;

    if (paymentMethod == "Cash on delivery") {
      await Order.updateOne(
        { _id: order._id },
        { $set: { paymentStatus: "order placed" } }
      );
      console.log("ssssssssssssssssss");
      if (cartData && cartData.products) {
        const cartItems = cartData.products;
        console.log("cart item : ", cartItems);

        cartItems.map(async (cartItem) => {
          const product = await products.findById(cartItem.productId).exec();
          console.log("ithanu ippathe product : ", product);
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
      //res.status(200).json({ data: "data" });
    } else {
      console.log("iam raz");

      var options = {
        amount: originalAmount * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: order._id,
      };
      req.session.oderData = order;
      instance.orders.create(options, function (err, razorpayOrder) {
        if (err) {
          console.log(err);
        } else {
          // res.status(201).json(razorpayOrder); // Sending the created order as a response

          res.json({ success: false, razorpayOrder });

          console.log("razorpay order ", razorpayOrder);
        }
      });
    }
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

var instance = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});



const verifyPayment = async (req, res) => {
  try {
    const userId = req.session.user_id;
    // console.log("userid tto : ",userId);
    const cart = await Cart.findOne({ userId }).populate("products.productId");
    // console.log("cart tto : ",cart);
    // console.log('req body : ', req.body);
    const response = req.body.response;
    const bodyOrder = req.body.order;

    // console.log("response : ",response);
    console.log("bodyorder : ", bodyOrder);
    var crypto = require("crypto");
    let hmac = crypto.createHmac("sha256", "Bcd9iqDRBd0iWJlO6C5GlsfD");

    hmac.update(
      response.razorpay_order_id + "|" + response.razorpay_payment_id
    );
    hmac = hmac.digest("hex");
    console.log("ith hmac : ", hmac);
    console.log("ith ath : ", response.razorpay_signature);

    if (hmac == response.razorpay_signature) {
      //change order status
      await Order.updateOne(
        { _id: bodyOrder.receipt },
        { $set: { paymentStatus: "order placed" } }
      );
      // Update product quantities
      for (const item of cart.products) {
        console.log("iam itesm", item);
        const productId = item.productId._id;
        const quantityToSubtract = item.quantity;
        // Subtract the quantity from the product in the database
        await products.findByIdAndUpdate(productId, {
          $inc: { quantity: -quantityToSubtract },
        });
      }

      //delete req.session.discountAmount;
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
};
