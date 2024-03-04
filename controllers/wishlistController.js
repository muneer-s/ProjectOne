const User = require("../models/userModel");
const products = require("../models/addproductModel");
const path = require("path");
const session = require("express-session");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const wishlist = require("../models/wishlistModel");

const loadWishlist = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userId = req.session.user_id;
      const userData = await User.findOne({ _id: userId });
      const user = await User.findOne({ _id: userData._id });

      const wishlistData = await wishlist
        .findOne({})
        .populate({ path: "products.productId", model: "product" })
        .populate("userId");

      res.render("./users/wishlist", { user, wishlistData });
    } else {
      res.render("./users/login");
    }
  } catch (error) {
    console.log("wishlist catch error founded " + error.message);
  }
};

// add to wish list
const addToWishlist = async (req, res) => {
  try {
    const queryId = req.query.id;
    const userId = req.session.user_id;
    let whishlist = await wishlist.findOne({ userId: userId });

    if (!whishlist) {
      whishlist = new wishlist({
        userId: userId,
        products: [{ productId: queryId }],
      });
    } else {
      const isProductInWishList = whishlist.products.some((item) =>
        item.productId.equals(queryId)
      );

      if (!isProductInWishList) {
        whishlist.products.push({ productId: queryId });
      }
    }

    await whishlist.save();

    req.session.wishlist = whishlist;

    res.redirect(`/singleProductPage/${queryId}`);
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProductFromWishlist = async (req, res) => {
  const userId = req.session.user_id;
  const query = req.query.id;

  try {
    const deleteWishlist = await wishlist.updateOne(
      { userId: userId },
      { $pull: { products: { productId: query } } }
    );

    res.redirect("/wishlist");
  } catch (error) {
    console.error("Error deleting wishlist item:", error);

    res.status(500).send("Error deleting wishlist item");
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  deleteProductFromWishlist,
};
