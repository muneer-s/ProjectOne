const User = require("../models/userModel");

const isUserLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      const userData = await User.findById({ _id: req.session.user_id });
      if (userData && userData.status == false) {
        next();
      } else {
        res.redirect("/login");
      }
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log("user auth error " + error.message);
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
