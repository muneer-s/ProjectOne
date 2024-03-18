const User = require("../models/userModel");
const Order = require("../models/orderModel");

const loadSalesReportPage = async (req, res) => {
  try {
    if (req.session.email) {
      let filter = req.query.filter || 'all'; 
      let query = { orderStatus: "Delivered" };

       if (filter === 'daily') {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        query.createdAt = { $gte: date };
      } else if (filter === 'weekly') {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        query.createdAt = { $gte: date };
      } else if (filter === 'monthly') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        query.createdAt = { $gte: date };
      }
      else if(filter === 'all') {
        query = { orderStatus: "Delivered" };
      }

      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        query.createdAt = { $gte: start, $lte: end };
      }



      const orders = await Order.find(query)
        .populate("products.productId")
        .populate("address")
        .populate("userId");

      console.log("----------------------", orders);

      res.render("./adminSide/SalesReport", { orders, filter});
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadSalesReportPage,
};
