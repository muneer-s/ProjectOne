const User = require("../models/userModel");
const products = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");

//load cart page
const loadCart = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userId = req.session.user_id;
      const userData = await User.findOne({ _id: userId });

      const cartDetails = await Cart.findOne({ userId: userData._id }).populate(
        { path: "products.productId", model: "product" }
      );

      const user = await User.findOne({ _id: userData._id });
      let originalAmount = 0;

      if (cartDetails) {
        cartDetails.products.forEach((cartItem) => {
          if (
            cartItem.productId.offer &&
            cartItem.productId.offerApplied == true
          ) {
            var productPrice = cartItem.productId.offerPrice;
          } else if (
            cartItem.productId.categoryOffer &&
            cartItem.productId.categoryOfferApplied
          ) {
            var productPrice = cartItem.productId.categoryOfferPrice;
          } else {
            var productPrice = cartItem.productId.price;
          }
          let itemTotalPrice = productPrice * cartItem.quantity;
          originalAmount += itemTotalPrice;
        });
      }

      res.render("./users/cart", {
        user,
        cartDetails,
        subTotal: originalAmount,
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log("load cart error founded " + error.message);
  }
};

//add products to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!req.session.user_id) {
      return res.json({
        success: false,
        message: "User not authenticated. Please log in.",
      });
    }

    const user = await User.findOne({ _id: req.session.user_id });

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    const product = await products.findOne({ _id: productId });

    if (!product) {
      return res.json({ success: false, message: "Product not found." });
    }

    let userCart = await Cart.findOne({ userId: req.session.user_id });

    if (!userCart) {
      userCart = new Cart({ userId: req.session.user_id, products: [] });
    }

    const existingProductIndex = userCart.products.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (product.offer && product.offerApplied == true) {
      var productPrice = product.offerPrice;
    } else if (product.categoryOffer && product.categoryOfferApplied) {
      var productPrice = product.categoryOfferPrice;
    } else {
      var productPrice = product.price;
    }

    if (existingProductIndex !== -1) {
      const existingProduct = userCart.products[existingProductIndex];
      const newTotalQuantity =
        existingProduct.quantity + parseInt(quantity, 10);

      if (newTotalQuantity > product.quantity) {
        return res.json({
          success: false,
          message: "Exceeds available quantity",
        });
      }
      userCart.products[existingProductIndex].quantity = newTotalQuantity;
      userCart.products[existingProductIndex].total =
        newTotalQuantity * Number(productPrice);
    } else {
      if (parseInt(quantity, 10) > product.quantity) {
        return res.json({
          success: false,
          message: "Exceeds available quantity",
        });
      }

      userCart.products.push({
        productId: productId,
        quantity: quantity,
        total: quantity * productPrice,
      });
    }

    await userCart.save();
    return res.json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error(error.message);
    return res.json({
      success: false,
      message: "Error adding product to cart",
    });
  }
};

//cart quantity update
const quantityUpdate = async (req, res) => {
  try {
    const { cartId, productId, countData } = req.body;
    const count = parseInt(countData);
    const userId = req.session.user_id;

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      return res.json({ success: false, message: "Cart not found." });
    }

    const existingProduct = userCart.items.find((item) =>
      item.product_id.equals(productId)
    );
    if (!existingProduct) {
      return res.json({
        success: false,
        message: "Product not found in the cart.",
      });
    }
    if (count == 1) {
      existingProduct.quantity += 1;
    } else if (count == -1 && existingProduct.quantity > 1) {
      existingProduct.quantity -= 1;
    } else {
      return res.json({ success: false, message: "Invalid count." });
    }

    await userCart.save();

    const response = { success: true, newQuantity: existingProduct.quantity };
    res.json(response);
  } catch (error) {
    console.error(error.message);
    return res.json({ success: false, message: "Error updating quantity." });
  }
};

const submitQuantity = async (req, res) => {
  try {
    const { id, quantity } = req.body;

    let cartData = await Cart.findOne({ userId: req.session.user_id });

    if (!cartData) {
      console.log("Cart not found for user");
      return res.status(404).send("Cart not found");
    }

    let proData = cartData.products.find((item) => item._id.toString() === id);
    const existproduct = await products.findOne({ _id: proData.productId });

    if (!proData) {
      console.log("Product not found in cart");
      return res.status(404).send("Product not found in cart");
    }

    if (existproduct.offer && existproduct.offerApplied == true) {
      var productPrice = existproduct.offerPrice;
    } else if (
      existproduct.categoryOffer &&
      existproduct.categoryOfferApplied
    ) {
      var productPrice = existproduct.categoryOfferPrice;
    } else {
      var productPrice = existproduct.price;
    }

    proData.quantity = quantity;
    proData.total = quantity * productPrice;

    await cartData.save();

    if (proData) {
      res.json({ success: true });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

//remove item from cart
const removeItem = async (req, res) => {
  const { itemId } = req.body;

  try {
    const cart = await Cart.findOneAndUpdate(
      { "products._id": itemId },
      { $pull: { products: { _id: itemId } } },
      { new: true }
    );

    if (cart) {
      res.status(200).json({ message: "Item removed from cart successfully" });
    } else {
      res.status(404).json({ error: "Cart or item not found" });
    }
  } catch (error) {
    console.error("Error removing item from cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addToCart,
  quantityUpdate,
  loadCart,
  submitQuantity,
  removeItem,
};
