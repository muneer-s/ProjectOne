const User = require("../models/userModel");
const products = require("../models/addproductModel");
const sharp = require("sharp");
const path = require("path");
const session = require("express-session");
const Cart = require("../models/cartModel");
const STATUS_CODES = require("../utils/statusCodes");
const { success } = require("toastr");

//load cart page
const loadCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const userData = await User.findOne({ _id: userId });

    const cartDetails = await Cart.findOne({ userId: userData._id }).populate({
      path: "products.productId",
      model: "product",
    });

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

    return res
      .status(STATUS_CODES.OK)
      .render("./users/cart", { user, cartDetails, subTotal: originalAmount });
  } catch (error) {
    console.log("load cart error founded " + error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error during load cart page" });
  }
};

//add products to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    console.log(111111);

    const user = await User.findOne({ _id: req.session.user_id });

    if (!user) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "User not found." });
    }

    const product = await products.findOne({ _id: productId });

    if (!product) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "Product not found." });
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
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: "Exceeds available quantity" });
      }
      userCart.products[existingProductIndex].quantity = newTotalQuantity;
      userCart.products[existingProductIndex].total =
        newTotalQuantity * Number(productPrice);
    } else {
      if (parseInt(quantity, 10) > product.quantity) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: "Exceeds available quantity" });
      }

      userCart.products.push({
        productId: productId,
        quantity: quantity,
        total: quantity * productPrice,
      });
    }

    await userCart.save();
    return res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: "Product added to cart" });
  } catch (error) {
    console.error(error.message);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error adding product to cart",
    });
  }
};

//cart quantity update
const quantityUpdate = async (req, res) => {
  try {
    const { productId, countData } = req.body;
    const count = parseInt(countData);
    const userId = req.session.user_id;

    let userCart = await Cart.findOne({ userId });
    if (!userCart) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "Cart not found." });
    }

    const existingProduct = userCart.items.find((item) =>
      item.product_id.equals(productId)
    );
    if (!existingProduct) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        message: "Product not found in the cart.",
      });
    }
    if (count == 1) {
      existingProduct.quantity += 1;
    } else if (count == -1 && existingProduct.quantity > 1) {
      existingProduct.quantity -= 1;
    } else {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Invalid count." });
    }

    await userCart.save();

    const response = { newQuantity: existingProduct.quantity };

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: "Quantity updated successfully",
      response,
    });
  } catch (error) {
    console.error(error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error updating quantity." });
  }
};

const submitQuantity = async (req, res) => {
  try {
    const { id, quantity } = req.body;

    let cartData = await Cart.findOne({ userId: req.session.user_id });

    if (!cartData) {
      console.log("Cart not found for user");
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "Cart not found." });
    }

    let proData = cartData.products.find((item) => item._id.toString() === id);
    const existproduct = await products.findOne({ _id: proData.productId });

    if (!proData) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "Product not found in cart" });
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
    return res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: "submit quantity successfully" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error during submit quantity in user cart controller",
    });
  }
};

//remove item from cart
const removeItem = async (req, res) => {
  try {
    const { itemId } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { "products._id": itemId },
      { $pull: { products: { _id: itemId } } },
      { new: true }
    );

    if (cart) {
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Item removed from cart successfully",
      });
    } else {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, error: "Cart or item not found" });
    }
  } catch (error) {
    console.error("Error removing item from cart:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error during remove item in user cart controller",
    });
  }
};

module.exports = {
  addToCart,
  quantityUpdate,
  loadCart,
  submitQuantity,
  removeItem,
};
