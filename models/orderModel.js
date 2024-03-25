const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "product",
        },
        quantity: {
          type: Number,
        },
        total: {
          type: Number,
        },
        offer: {
          type: String,
          default: false,
        },
      },
    ],
    orderId: {
      type: String,
    },
    totalPrice: {
      type: Number,
    },
    paymentIntent: {
      type: String,
    },
    requestReson: {
      type: String,
      default: "Not Request",
    },
    orderStatus: {
      type: String,
      default: "Order Placed",
    },
    address: {
      type: Object,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    expectedDeliver: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
