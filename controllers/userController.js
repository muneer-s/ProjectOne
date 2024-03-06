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

//user registration
const insertUser = async (req, res) => {
  try {
    const spassword = await securePassword(req.body.password);

    // Check if the email already exists
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      console.log("This email is already in use");
      return res.render("./users/registration", {
        errorMessage: "Email address is already in use.",
      });
    }

    //  create the new user
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
    });

    // Save the new user
    const userData = await user.save();

    if (userData) {
      // If userData is successfully saved, delete existing OTP records And send a verification email
      await OTPdb.deleteMany({});
      await sendVerifyMail(req.body.name, req.body.email, userData._id);
      console.log("before redir otp");
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
    // Generating a password hash using bcrypt with cost factor set to 10
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

//for send  mail (otp)  to verify
const sendVerifyMail = async (name, email, user_id) => {
  try {
    console.log("name is : " + name);
    console.log("email is : " + email);

    // Function to generate a random 5-digit OTP
    const generateOTP = () => {
      return Math.floor(10000 + Math.random() * 90000);
    };

    // Generate OTP
    const otp = generateOTP();

    // Create a nodemailer transporter for sending emails
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Disable secure connection for Gmail
      requireTLS: true,
      auth: {
        user: "muni0209s@gmail.com", // Your Gmail email address
        pass: "qrie kkvo lfmp chrb", // Your Gmail app password
      },
    });

    // Define email options
    const mailOptions = {
      from: "muni0209s@gmail.com",
      to: email,
      subject: "OTP",
      text: `Your OTP is: ${otp}`,
    };

    // Hash the OTP using bcrypt
    const hashedOTP = await bcrypt.hash(otp.toString(), 10);

    // Save the hashed OTP along with user_id in the database
    const newOTP = new OTPdb({
      user_id: user_id,
      hashedOTP: hashedOTP,
    });
    await newOTP.save();

    // Send the email with the OTP
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
    //user ID from query parameters
    const id = req.query.id;

    // Find OTP in db based on user ID
    const existingOtpData = await OTPdb.findOne({ user_id: id });

    if (!existingOtpData) {
      res.status(404).json({ error: "User ID not found" });
    } else {
      // Extract OTP digits from request body
      const { a, b, c, d, e } = req.body;

      const enteredOtp = a + b + c + d + e;

      // Retrieve the hashed OTP
      const dbOtpHash = existingOtpData.hashedOTP;

      // Compare entered OTP with hashed OTP
      const isOtpMatch = await bcrypt.compare(enteredOtp.toString(), dbOtpHash);

      console.log("newhased", enteredOtp, "oldHashed", dbOtpHash);

      if (isOtpMatch) {
        // Attempt to update the user's information in the database to mark them as verified
        const updateInfo = await User.updateOne(
          { _id: req.query.id },
          { $set: { is_verified: 1 } }
        );

        //console.log('update info: ',updateInfo);

        if (updateInfo) {
          req.session.user_id = req.query.id; ///////session

          console.log("otp verified");
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

    const checkUser = await User.findOne({
      _id: req.session.user_id,
      is_blocked: true,
    });
    if (checkUser) {
      req.session.user_id = null;
    }

    // Retrieve user data from the database based on the user_id
    const userData = await User.findOne({ _id: user_id, is_blocked: false });

    res.render("./users/home", { user: userData });
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
    // delete all existing OTP
    await OTPdb.deleteMany({});

    const user_id = req.session.user_id;

    // Fetch user data
    const userData = await User.findOne({ _id: user_id });

    // Send verification email with the user's name, email, and user ID
    await sendVerifyMail(userData.name, userData.email, user_id);

    // Redirect to the OTP page with the user's ID as a query parameter
    res.redirect(`/otp?id=${userData._id}`);
  } catch (error) {
    console.log(error);
  }
};

//user login
const userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email using regex
    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex.test(email)) {
      console.log("error ----Invalid email format ");
      // return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!password) {
      console.log("error-------Password cannot be empty");
    }

    const existingUser = await User.findOne({ email: email });

    if (!existingUser) {
      console.log("user not found");
      req.flash("unferror", "User not found!!there is no such User");
      return res.redirect("/login");
    }

    //console.log("password:",password);
    //console.log("existing:",existingUser.password);

    // Compare password with the hashed password db
    const isPasswordMatch = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (isPasswordMatch) {
      // Check if the user is blocked
      if (existingUser.is_blocked === true) {
        req.flash("blkerror", "User is blocked cannot login ");
        console.log("user is blocked cannot login");
        return res.redirect("/login");
      } else {
        req.session.user_id = existingUser._id;
        return res.redirect("/");
      }
    } else {
      req.flash("pwerror", "authentication failed   !!!!  Invalid password");
      return res.redirect("/login");
      //return res.status(401).json({ message: 'authentication failed   !!!!  Invalid password' });
    }
  } catch (error) {
    console.error(error);
  }
};

//user product page load
const loadProductPage = async (req, res) => {
  try {
    const user_id = req.session.user_id;
    const page = parseInt(req.query.page) || 1; 
    const limit = 6; 
    const skip = (page - 1) * limit; // Calculate how many items to skip
    const categoryFilter = req.query.category;
    const sortOption = req.query.sort; 

    const userData = await User.findOne({ _id: user_id });
    let query = { status: true };
    if (categoryFilter) {
      query.category = categoryFilter;
    }

    let sortQuery = {};
    if (sortOption === 'low') {
      sortQuery = { price: 1 }; // Ascending order
    } else if (sortOption === 'high') {
      sortQuery = { price: -1 }; // Descending order
    }

    const proDetails = await product
    .find(query)
    .sort(sortQuery) 
      .populate("category")
      .skip(skip)
      .limit(limit);

    let catDetails = await Category.find();

    // Transform category names to uppercase
    catDetails = catDetails.map(category => ({
      ...category._doc, // Spread the existing category properties
      Name: category.Name.toUpperCase() // Override the Name property with its uppercase version
    }));

    // Calculate total pages
    const totalItems = await product.countDocuments({ status: true });
    const totalPages = Math.ceil(totalItems / limit);

    res.render("./users/productPage", {
      proDetails,
      catDetails,
      user: userData,
      currentPage: page,
      totalPages,
      sort:sortOption
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
  console.log(category);
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
};
