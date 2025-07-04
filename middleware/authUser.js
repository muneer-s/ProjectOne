const User = require("../models/userModel");

const isUserLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const userData = await User.findById({ _id: req.session.user_id });
      // console.log("middle warinn      :  ",userData)

      if (userData && userData.is_blocked == false) {
        console.log("✅ User is authenticated and not blocked");
        return next();
      } else {
        delete req.session.user_id;
        // Respond based on request type
        if (
          req.headers.accept &&
          req.headers.accept.includes("application/json")
        ) {
          return res
            .status(403)
            .json({ success: false, message: "Your account is blocked" });
        } else {
          return res.redirect("/login?blocked=true");
        }
      }
    } else {
      console.log("user login aayitt illa ");
      // Respond based on request type
      if (
        req.headers.accept &&
        req.headers.accept.includes("application/json")
      ) {
        return res
          .status(401)
          .json({ success: false, message: "Please login to continue" });
      } else {
        return res.redirect("/login");
      }
    }
  } catch (error) {
    console.log("user auth error " + error.message);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } else {
      return res.redirect("/login");
    }
  }
};



//create a middleware function
const isUserLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      res.redirect("/");
    }

    next();
  } catch (error) {
    console.log("user not logged in " + error.message);
  }
};

module.exports = { isUserLogin, isUserLogout };
