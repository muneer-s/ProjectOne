const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const OTPdb = require("../models/otpmodel");
const nodemailer = require("nodemailer");
const product = require("../models/addproductModel");
const Category = require("../models/categories");
const session = require("express-session");
const toastr = require("toastr");
const flash = require("connect-flash");
const validateMongodbId = require("../utils/validationMongodb");
const Offer = require("../models/offerModel");

//user registration
const insertUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password);

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.render("./users/registration", {
        errorMessage: "Email address is already in use.",
      });
    }

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
    });

    const userData = await user.save();

    if (userData) {
      await OTPdb.deleteMany({});
      await sendVerifyMail(req.body.name, req.body.email, userData._id);
      res.redirect(`/otp?id=${userData._id}`);
    } else {
      return res.render("./users/registration", {
        errorMessage: "Your registration has been failed!!",
      });
    }
  } catch (error) {
    console.log("Error", error.message);
  }
};

//password bycript
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

//for send  mail (otp)  to verify
const sendVerifyMail = async (name, email, user_id) => {
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
  }
};

//  verify OTP
const verifyOtp = async (req, res) => {
  try {
    const id = req.query.id;
    const existingOtpData = await OTPdb.findOne({ user_id: id });
    if (!existingOtpData) {
      res.status(404).json({ error: "User ID not found" });
    } else {
      const { a, b, c, d, e } = req.body;

      const enteredOtp = a + b + c + d + e;

      const dbOtpHash = existingOtpData.hashedOTP;

      const isOtpMatch = await bcrypt.compare(enteredOtp.toString(), dbOtpHash);

      console.log("newhased", enteredOtp, "oldHashed", dbOtpHash);

      if (isOtpMatch) {
        const updateInfo = await User.updateOne(
          { _id: req.query.id },
          { $set: { is_verified: 1 } }
        );

        if (updateInfo) {
          req.session.user_id = req.query.id; //------session created-----------------

          res.redirect("/");
        }
      } else {
        req.flash("otperror", "invalid otp !!!!");
        return res.redirect("/otp");
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//user login load
const loginload = async (req, res) => {
  try {
    if (req.session.user_id) {
      res.redirect("/");
    } else {
      res.render("./users/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

//user home page load
const homeload = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const products = await product.find({status:true})

    const checkUser = await User.findOne({
      _id: req.session.user_id,
      is_blocked: true,
    });
    if (checkUser) {
      req.session.user_id = null;
    }

    const userData = await User.findOne({ _id: user_id, is_blocked: false });

    res.render("./users/home", { user: userData , Products:products });
  } catch (error) {
    console.log(error.message + "error from user home page");
  }
};

//user load to signup page
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

  res.render("./users/otp", { id });
};

//resend otp
const resendOtp = async (req, res) => {
  try {
    await OTPdb.deleteMany({});

    const user_id = req.session.user_id;

    const userData = await User.findOne({ _id: user_id });

    await sendVerifyMail(userData.name, userData.email, user_id);

    res.redirect(`/otp?id=${userData._id}`);
  } catch (error) {
    console.log(error);
  }
};

//user login
const userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex.test(email)) {
      console.log("error-Invalid email format ");
    }

    if (!password) {
      console.log("error-Password cannot be empty");
    }

    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      req.flash("unferror", "User not found!!there is no such User");
      return res.redirect("/login");
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (isPasswordMatch) {
      if (existingUser.is_blocked === true) {
        req.flash("blkerror", "User is blocked cannot login ");
        return res.redirect("/login");
      } else {
        req.session.user_id = existingUser._id;
        return res.redirect("/");
      }
    } else {
      req.flash("pwerror", "authentication failed   !!!!  Invalid password");
      return res.redirect("/login");
    }
  } catch (error) {
    console.error(error);
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
       query.name = { $regex: searchQuery, $options: "i" }; // case-insensitive search
     }
 
     let sortQuery = {};
     if (sortOption === "low") {
       sortQuery = { price: 1 };
     } else if (sortOption === "high") {
       sortQuery = { price: -1 };
     }
 
     // Adjust the query to include the category filter when counting total items
     const totalItems = await product.countDocuments(query);
     const totalPages = Math.ceil(totalItems / limit);
 
     // Use the same query to fetch the products, including the category filter and price sorting
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
       searchQuery:searchQuery
     });
  } catch (error) {
     console.log(error.message);
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
    res.status(404).render("users/404");
  }
};

//  user logout
const logOut = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error destroying session: ", err);
    } else {
      console.log("Session destroyed");
      res.redirect("/");
    }
  });
};

// filter
const filter = async (req, res) => {
  const category = await req.query.az;
};

const search = async (req, res) => {
  try {
    await loadProductPage(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
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
