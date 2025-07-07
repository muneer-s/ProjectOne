const User = require("../models/userModel");
const products = require("../models/addproductModel");
const session = require("express-session");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const Offer = require("../models/offerModel");
const STATUS_CODES = require("../utils/statusCodes");

//admin load offer list
const loadOfferPage = async (req, res) => {
  try {
    res.render("./adminSide/addOffer");
  } catch (error) {
    console.log(error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

//save offer
const saveOffer = async (req, res) => {
  try {
    const {
      addOffer,
      startingDate,
      expiryDate,
      percentage,
      is_listed,
      description,
    } = req.body;

    const isListed = is_listed === "on" ? true : false;

    const existingOffer = await Offer.findOne({ offerName: addOffer });

    if (existingOffer) {
      // return res.redirect("/addoffer");
      return res.render("adminSide/addOffer", { duplicate: true });
    }

    const newOffers = new Offer({
      offerName: addOffer,
      startingDate: startingDate,
      expiryDate: expiryDate,
      percentage: percentage,
      is_listed: isListed,
      description: description,
    });

    await newOffers.save();
    res.redirect("/addoffer");
  } catch (error) {
    console.log(error.message);
  }
};

const viewOffer = async (req, res) => {
  try {
    const currentDate = Date.now();
    await Offer.updateMany(
      { expiryDate: { $gte: currentDate } },
      { $set: { is_listed: true } }
    );
    await Offer.updateMany(
      { expiryDate: { $lte: currentDate } },
      { $set: { is_listed: false } }
    );
    const offer = await Offer.find({});
    res.render("./adminSide/viewOffer", { offer });
  } catch (error) {
    console.log(error.message);
  }
};

// Delete offer
const deleteOffer = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("offer id : ", id);

    const productsWithOffer = await products.find({
      offer: new mongoose.Types.ObjectId(id),
    });
    console.log("products with offer : ", productsWithOffer);

    if (productsWithOffer.length) {
      console.log("Product with this offer ID not found");
      for (const product of productsWithOffer) {
        product.offer = null;
        product.offerApplied = false;
        product.offerPrice = 0;

        await product.save();
      }
    }

    await Offer.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
    });

    res.redirect("/viewOffer");
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while processing your request");
  }
};

//load offer page for adding to product
const loadOfferpageForAdding = async (req, res) => {
  try {
    const productId = req.query.id;
    const offer = await Offer.find({});

    res.render("./adminSide/addOfferforProduct", { offer, productId });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  loadOfferPage,
  saveOffer,
  viewOffer,
  deleteOffer,
  loadOfferpageForAdding,
};
