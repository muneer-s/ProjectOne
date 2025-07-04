const isAdminLogin = async (req, res, next) => {
  try {
    if (req.session.adminEmail) {
      next();
    } else {
      res.redirect("/adminLogin");
    }
  } catch (error) {
    console.log("admin auth error ", error.message);
  }
};

const isAdminLogout = async (req, res, next) => {
  try {
    if (req.session.adminEmail) {
      res.redirect("/adminHome");
    }

    next();
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = { isAdminLogin, isAdminLogout };
