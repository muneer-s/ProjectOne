const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const OTPdb = require("../models/otpmodel");
const nodemailer = require("nodemailer");
const session = require("express-session");
const flash = require("connect-flash");
const STATUS_CODES = require("../utils/statusCodes");
//otp page load
const otpload = (req, res) => {
  const { email } = req.query;
  res.render("./users/otpLogin", { email });
};

const otpLogin = async (req, res) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (!existingUser) {
      console.log("there is no such email");
      req.flash("error", "There is no such user with this email");
      return res.redirect("/login");
    }

    const generateOTP = () => {
      return Math.floor(10000 + Math.random() * 90000);
    };

    const otp = generateOTP();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "muni0209s@gmail.com",
        pass: "qrie kkvo lfmp chrb",
      },
    });

    const mailOptions = {
      from: "muni0209s@gmail.com",
      to: existingUser.email,
      subject: "OTP",
      text: `Your OTP is: ${otp}`,
    };

    const hashedOTP = await bcrypt.hash(otp.toString(), 10);

    const newOTP = new OTPdb({
      user_id: existingUser.email,
      hashedOTP: hashedOTP,
    });

    await newOTP.save();

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent: - ", info.response);
      }
    });

    res.json({ message: "success" });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .send("Internal Server Error");
  }
};

//load otp login page

const otpLoginLoad = async (req, res) => {
  try {
    const id = req.query.email;

    const existingOtpData = await OTPdb.findOne({ user_id: id });

    if (!existingOtpData) {
      req.flash("error", "User ID not found");
      return res.redirect("/login");
    } else {
      const { a, b, c, d, e } = req.body;

      const enteredOtp = a + b + c + d + e;

      const dbOtpHash = existingOtpData.hashedOTP;

      const isOtpMatch = bcrypt.compare(enteredOtp.toString(), dbOtpHash);

      const existingUser = await User.findOne({ email: id });

      if (isOtpMatch) {
        req.session.user_id = existingUser._id;
        return res.redirect("/");
      } else {
        req.flash("otperror", "invalid OTP");
        return res.redirect("/otploginload");
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = {
  otpLogin,
  otpload,
  otpLoginLoad,
};
