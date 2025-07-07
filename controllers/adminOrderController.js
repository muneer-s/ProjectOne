const { success } = require("toastr");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
const STATUS_CODES = require("../utils/statusCodes");

const loadOrderList = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("products.productId")
      .populate("address")
      .populate("userId");

    return res
      .status(STATUS_CODES.OK)
      .render("./adminSide/orderList", { orders });
  } catch (error) {
    console.log(error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const orders = await Order.find({ _id: orderId })
      .populate("products.productId")
      .populate("address")
      .populate("userId");

    res.render("./adminSide/adminOrderDetails", { orders });
  } catch (error) {
    console.log(error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//update status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId;
    const order = await Order.findOne({ _id: orderId });

    if (order.orderStatus === "Cancel" || order.orderStatus === "Return") {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, error: "Cannot change status further" });
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

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: status } },
      { new: true }
    );

    return res
      .status(STATUS_CODES.OK)
      .json({
        success: true,
        message: "Status updated successfully",
        order: updatedOrder,
      });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = {
  loadOrderList,
  loadOrderDetails,
  updateOrderStatus,
};
