const User = require("../models/userModel");
const Order = require("../models/orderModel");
const ejs = require('ejs');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');



const loadSalesReportPage = async (req, res) => {
  try {
    if (req.session.email) {
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

      // console.log("----------------------", orders);

      res.render("./adminSide/SalesReport", { orders, filter });
    }
  } catch (error) {
    console.log(error.message);
  }
};


const downloadSalesReport = async (req, res) => {
  try {
      const orderData = await Order.find({ orderStatus:"Delivered" })
          .populate("products.productId")
          .populate("address")
          .populate("userId");

      const templatePath = path.join(__dirname, '..', 'views', 'adminSide', "salesPdf.ejs");
      
      


      const renderTemplate = async () => {
          try { 
            if (!fs.existsSync(templatePath)) {
              console.error(`Template file does not exist at path: ${templatePath}`);
              throw new Error('Template file does not exist');
          } 
              return await ejs.renderFile(templatePath, {orderData});
          } catch (err) {
              console.error('Error rendering EJS template:', err);
              res.status(500).send('Error rendering sales report');
          }
      };


      const htmlContent = await renderTemplate();

      if (!htmlContent) {
          return;
      }

      const browser = await puppeteer.launch();
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
      console.error('Error generating sales report:', error);
      res.status(500).send('Error generating sales report');
  }
}



// const sales = async(req,res)=>{
//   try {
//     const orderData = await Order.find({ orderStatus:"Delivered" })
//           .populate("products.productId")
//           .populate("address")
//           .populate("userId");
//     res.render("./adminSide/salesReportPdf",{orderData});
//   } catch (error) {
//     console.log(error.message);
//   }
// }






module.exports = {
  loadSalesReportPage,
  downloadSalesReport,
  // sales
};
