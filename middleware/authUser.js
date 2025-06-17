const User = require("../models/userModel");

const isUserLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const userData = await User.findById({ _id: req.session.user_id });
      console.log("middle warinn      :  ",userData)

      if (userData && userData.is_blocked == false) {
        next();
      } else {
        // User is blocked — destroy session and redirect
        req.session.destroy((err) => {
          if (err) {
            console.log("Session destroy error:", err);
          }
          res.redirect("/login?blocked=true")
        });
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log("user auth error " + error.message);
    res.redirect("/login");
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
