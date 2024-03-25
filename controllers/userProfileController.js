const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const OTPdb = require("../models/otpmodel");
const nodemailer = require("nodemailer");
const product = require("../models/addproductModel");
const Category = require("../models/categories");
const session = require("express-session");
const toast = require("toastr");
const flash = require("connect-flash");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const fs = require("fs");

//load user profile page
const userProfileLoad = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    if (user_id) {
      const user = await User.findOne({ _id: user_id });
      const wallet = await Wallet.findOne({ user: user_id });

      if (!wallet) {
        wallet = await Wallet.create({ user: user_id });
      }
      res.render("./users/userProfile", { user, wallet });
    } else {
      res.render("./users/login");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

//update profile details
const updateProfile = async (req, res) => {
  try {
    const { name, email, mobile } = req.body;

    const userId = req.session.user_id;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, mobile },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.render("./users/userProfile", { user });
  } catch (error) {
    console.error("Error updating user data:  ", error);
    return res.render("./users/500");
  }
};

//check if the current password is correct
const checkPassword = async (req, res) => {
  const { currentPassword } = req.body;

  const userId = req.session.user_id;

  if (!userId) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const existingUser = await User.findOne({ _id: userId });

  const isPasswordMatch = await bcrypt.compare(
    currentPassword,
    existingUser.password
  );

  if (isPasswordMatch) {
    return res.json({ success: true });
  } else {
    return res.json({ success: false });
  }
};

//change the current password
const changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.session.user_id;
  const user = await User.findOne({ _id: userId });

  if (!userId) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  return res.json({ success: true });
};

//add address in user profile
const addAddress = async (req, res) => {
  try {
    const { fullName, phone, location, city, state, pinCode, address } =
      req.body;

    const userId = req.session.user_id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.address.push({
      fullName,
      phone,
      location,
      city,
      state,
      pinCode,
      address,
    });

    await user.save();
    res.status(200).json({ message: "Address added successfully", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//delete an address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.params.userId;
    const addressId = req.params.addressId;
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: { address: { _id: addressId } },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.save();

    return res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

//checkout page load
const loadCheckOutPage = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const Coupons = await Coupon.find({ status: true });
    const totalUsingCoupon = req.session.newAmountUsingCoupon;
    const couponCode = req.session.couponCode;
    const appliedCoupon = await Coupon.findOne({ Code: couponCode });
    const cartDetails = await Cart.findOne({ userId: user_id }).populate({
      path: "products.productId",
      model: "product",
      select: "name",
    });

    let originalAmount = 0;

    if (cartDetails) {
      cartDetails.products.forEach((cartItem) => {
        originalAmount += cartItem.total;
      });
    }
    let wallet = await Wallet.findOne({ user: user_id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user_id });
    }

    if (cartDetails) {
      const user = await User.findOne({ _id: user_id });
      res.render(
        "./users/checkOut",
        {
          user,
          cartDetails,
          subTotal: originalAmount,
          Coupons,
          totalUsingCoupon: totalUsingCoupon,
          couponCode,
          wallet,
          appliedCoupon,
        },
        (err, html) => {
          if (err) {
            console.log(err);
          }
          delete req.session.newAmountUsingCoupon;
          res.status(500).send(html);
        }
      );
    } else {
      res.render("./users/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

//load orders
const loadViewItems = async (req, res) => {
  try {
    if (req.session.user_id) {
      const orderId = req.params.id;
      const userId = req.session.user_id;
      const userData = await User.findOne({ _id: userId });
      const user = await User.findOne({ _id: userData._id });

      const orders = await Order.find({ _id: orderId }).populate(
        "products.productId"
      );

      res.render("./users/viewItems", { orders, user, orderId });
    } else {
      res.render("./users/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

//download invoice
const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user_id;
    const userData = await User.findOne({ _id: userId });
    const user = await User.findOne({ _id: userData._id });
    const orders = await Order.find({ _id: orderId }).populate(
      "products.productId"
    );

    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      "users",
      "viewItemPdf.ejs"
    );

    const renderTemplate = async () => {
      try {
        if (!fs.existsSync(templatePath)) {
          console.error(
            `Template file does not exist at path: ${templatePath}`
          );
          throw new Error("Template file does not exist");
        }
        return await ejs.renderFile(templatePath, { orders, user });
      } catch (err) {
        console.error("Error rendering EJS template:", err);
        res.status(500).send("Error rendering sales report");
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
    console.error("Error generating sales report:", error);
    res.status(500).send("Error generating sales report");
  }
};

//edit address
const editAddress = async (req, res) => {
  try {
    const userId = req.params.userId;
    const addressId = req.params.id;
    const user = await User.findById(userId);
    const address = user.address.id(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.json(address);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

//edit address save
const saveEditAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.params.id;
    const updatedAddress = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addressIndex = user.address.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res.status(404).json({ message: "Address not found" });
    }
    user.address[addressIndex] = updatedAddress;
    await user.save();
    res.json({ message: "Address updated successfully" });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  userProfileLoad,
  updateProfile,
  checkPassword,
  changePassword,
  addAddress,
  deleteAddress,
  loadCheckOutPage,
  loadViewItems,
  editAddress,
  saveEditAddress,
  downloadInvoice,
};
