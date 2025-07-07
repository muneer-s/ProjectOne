const Order = require("../models/orderModel");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const STATUS_CODES = require("../utils/statusCodes");

const loadSalesReportPage = async (req, res) => {
  try {
    let filter = req.query.filter || "all";
    let query = { orderStatus: "Delivered" };

    if (filter === "daily") {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      query.createdAt = { $gte: date };
    } else if (filter === "weekly") {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      query.createdAt = { $gte: date };
    } else if (filter === "monthly") {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      query.createdAt = { $gte: date };
    } else if (filter === "all") {
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

    const orderData = await Order.find({ orderStatus: "Delivered" })
      .populate("products.productId")
      .populate("address")
      .populate("userId");

    const ordersWithActualPrice = orderData.map((order) => {
      return order.products.reduce(
        (acc, product) => acc + product.productId.price * product.quantity,
        0
      );
    });

    const totalSum = ordersWithActualPrice.reduce(
      (acc, totalPrice) => acc + totalPrice,
      0
    );

    const orderTotalAmt = orderData.reduce((total, order) => {
      return total + order.totalPrice;
    }, 0);
    const discountAmount = totalSum - orderTotalAmt;
    console.log(21, orders);
    console.log(22, filter);
    console.log(23, orderData);
    console.log(24, discountAmount);
    console.log(25, orderTotalAmt);

    res.render("./adminSide/SalesReport", {
      orders,
      filter,
      orderData,
      discountAmount,
      orderTotalAmt,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const downloadSalesReport = async (req, res) => {
  try {
    const orderData = await Order.find({ orderStatus: "Delivered" })
      .populate("products.productId")
      .populate("address")
      .populate("userId");

    const ordersWithActualPrice = orderData.map((order) => {
      return order.products.reduce(
        (acc, product) => acc + product.productId.price * product.quantity,
        0
      );
    });

    const totalSum = ordersWithActualPrice.reduce(
      (acc, totalPrice) => acc + totalPrice,
      0
    );

    const orderTotalAmt = orderData.reduce((total, order) => {
      return total + order.totalPrice;
    }, 0);
    const discountAmount = totalSum - orderTotalAmt;

    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      "adminSide",
      "salesPdf.ejs"
    );

    const renderTemplate = async () => {
      try {
        if (!fs.existsSync(templatePath)) {
          console.error(
            `Template file does not exist at path: ${templatePath}`
          );
          throw new Error("Template file does not exist");
        }
        const salesTemplate = fs.readFileSync(templatePath, "utf-8");
        return ejs.render(salesTemplate, {
          orderData,
          discountAmount,
          orderTotalAmt,
        });
      } catch (err) {
        console.error("Error rendering EJS template:", err);
        res
          .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: "Internal Server Error" });
      }
    };

    const htmlContent = await renderTemplate();

    if (!htmlContent) {
      return;
    }

    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/snap/bin/chromium",
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setContent(htmlContent);
    const pdfBuffer = await page.pdf({ format: "A4" });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);

    await browser.close();
  } catch (error) {
    console.error("Error generating sales report:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error generating sales report" });
  }
};

module.exports = {
  loadSalesReportPage,
  downloadSalesReport,
};
