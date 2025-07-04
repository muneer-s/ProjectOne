const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const OTPdb = require("../models/otpmodel");
const nodemailer = require("nodemailer");
const product = require("../models/addproductModel");
const Category = require("../models/categories");
const session = require("express-session");
const STATUS_CODES = require("../utils/statusCodes");
//user registration

const insertUser = async (req, res) => {
  try {
    const { name, password, email, mobile, confirmpassword } = req.body;

    if (!name || !email || !mobile || !password || !confirmpassword) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmpassword) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Email address is already in use" });
    }

    const spassword = await securePassword(password);

    const user = new User({
      name,
      email,
      mobile,
      password: spassword,
      is_admin: 0,
    });

    const userData = await user.save();

    req.session.user_email = userData.email;

    if (userData) {
      await OTPdb.deleteMany({});
      await sendVerifyMail(name, email, userData._id);

      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: "User registered successfully",
        redirectUrl: `/otp?id=${userData._id}`,
      });
    } else {
      return res
        .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "User registration failed" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//password bycript
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error);
    throw new Error("Error while securing the password");
  }
};

//for send  mail (otp)  to verify
const sendVerifyMail = async (email, user_id) => {
  try {
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
      to: email,
      subject: "OTP",
      text: `Your OTP is: ${otp}`,
    };

    const hashedOTP = await bcrypt.hash(otp.toString(), 10);

    const newOTP = new OTPdb({
      user_id: user_id,
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
  } catch (error) {
    console.log(error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error while sending mail" });
  }
};

//  verify OTP
const verifyOtp = async (req, res) => {
  try {
    const id = req.query.id;
    const existingOtpData = await OTPdb.findOne({ user_id: id });

    if (!existingOtpData) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "User ID not found" });
    } else {
      const { a, b, c, d, e } = req.body;
      const enteredOtp = a + b + c + d + e;

      const dbOtpHash = existingOtpData.hashedOTP;
      const isOtpMatch = bcrypt.compare(enteredOtp.toString(), dbOtpHash);

      if (isOtpMatch) {
        const updateInfo = await User.updateOne(
          { _id: req.query.id },
          { $set: { is_verified: 1 } }
        );

        if (updateInfo) {
          req.session.user_id = req.query.id; //----session created
          res.redirect("/");
        }
      } else {
        req.flash("otperror", "invalid otp !!!!");
        return res.redirect("/otp");
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//user login load
const loginload = async (req, res) => {
  try {
    if (req.session.user_id) {
      res.redirect("/");
    } else {
      const isBlocked = req.query.is_blocked === "true";
      res.render("./users/login", {
        messages: req.flash(),
        blocked: isBlocked, // Pass to EJS
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error while loginload",
    });
  }
};

//user home page load
const homeload = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const products = await product.find({ status: true });

    const checkUser = await User.findOne({
      _id: req.session.user_id,
      is_blocked: true,
    });
    if (checkUser) {
      req.session.user_id = null;
    }

    const userData = await User.findOne({ _id: user_id, is_blocked: false });

    res.render("./users/home", { user: userData, Products: products });
  } catch (error) {
    console.log(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error while homeload",
    });
  }
};

// load the register page for user
const loadRegister = async (req, res) => {
  try {
    res.render("./users/registration");
  } catch (error) {
    console.log(error.message);
    res.redirect("/registration");
  }
};

//otp page load
const otpload = (req, res) => {
  const id = req.query.id;
  console.log("load otp page ", id);
  res.render("./users/otp", { id });
};

//resend otp
const resendOtp = async (req, res) => {
  try {
    await OTPdb.deleteMany({});
    const user_email = req.session.user_email;
    const userData = await User.findOne({ email: user_email });
    await sendVerifyMail(userData.name, userData.email, userData._id);
    res.redirect(`/otp?id=${userData._id}`);
  } catch (error) {
    console.log(error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error while resendotp",
    });
  }
};

// user login all clear
const userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex.test(email)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Invalid email format" });
    }

    if (!password) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Password is required" });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "User not found with this email" });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordMatch) {
      return res
        .status(STATUS_CODES.UNAUTHORIZED)
        .json({ success: false, message: "Invalid password" });
    }
    if (existingUser.is_blocked) {
      return res
        .status(STATUS_CODES.FORBIDDEN)
        .json({ success: false, message: "User is blocked. Contact support." });
    }

    req.session.user_id = existingUser._id;
    return res.status(STATUS_CODES.OK).json({ success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Server error while userlogin" });
  }
};

const loadProductPage = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const categoryFilter = req.query.category;
    const sortOption = req.query.sort;
    const searchQuery = req.query.query;

    const userData = await User.findOne({ _id: user_id });
    let query = { status: true };
    if (categoryFilter) {
      query.category = categoryFilter;
    }
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: "i" };
    }

    let sortQuery = {};
    if (sortOption === "low") {
      sortQuery = { price: 1 };
    } else if (sortOption === "high") {
      sortQuery = { price: -1 };
    }

    const totalItems = await product.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const proDetails = await product
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate("category")
      .populate("offer")
      .populate("categoryOffer");

    let catDetails = await Category.find({ is_list: true });

    catDetails = catDetails.map((category) => ({
      ...category._doc,
      Name: category.Name.toUpperCase(),
    }));

    res.render("./users/productPage", {
      proDetails,
      catDetails,
      user: userData,
      currentPage: page,
      totalPages,
      sort: sortOption,
      categoryFilter: categoryFilter,
      searchQuery: searchQuery,
    });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: "internal server errror while loadproductpage",
      });
  }
};

//user load single product page
const loadSingleProductPage = async (req, res) => {
  try {
    const id = req.params.id;

    const products = await product.findOne({ _id: id }).populate("category");

    const user_id = req.session.user_id;

    const userData = await User.findOne({ _id: user_id });

    res.render("./users/singleProduct", { products, user: userData });
  } catch (error) {
    res.status(STATUS_CODES.NOT_FOUND).render("users/404");
  }
};

// user logout
const logOut = async (req, res) => {
  try {
    delete req.session.user_id;
    res.redirect("/");
  } catch (err) {
    console.log("Logout error:", err);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "internal server error while logout" });
  }
};

// filter
const filter = async (req, res) => {
  await req.query.az;
};

const search = async (req, res) => {
  try {
    await loadProductPage(req, res);
  } catch (error) {
    console.error(error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

module.exports = {
  loadRegister,
  insertUser,
  otpload,
  loginload,
  homeload,
  verifyOtp,
  userlogin,
  logOut,
  loadProductPage,
  loadSingleProductPage,
  resendOtp,
  filter,
  search,
};
