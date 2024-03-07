const User = require("../models/userModel");
const products = require("../models/addproductModel");
const session = require("express-session");
const Cart = require("../models/cartModel");
const mongoose = require("mongoose");
const Offer = require("../models/offerModel");

const loadOfferPage = async (req, res) => {
  try {
    res.render("./adminSide/addOffer");
  } catch (error) {
    console.log(error.message);
  }
};

const saveOffer = async (req, res) => {
  try {
    console.log(req.body);
    const {
      addOffer,
      startingDate,
      expiryDate,
      percentage,
      is_listed,
      description,
    } = req.body;


    
    const isListed = req.body.is_listed === "on" ? true : false;

    const existingOffer = await Offer.findOne({ offerName: addOffer });
    console.log("exist", existingOffer);

    if (existingOffer) {
      req.flash("error", "Offer with the same name already exists.");
      return res.redirect("/addoffer");
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


const viewOffer = async(req,res)=>{
  try {
    const currentDate = Date.now();
        await Offer.updateMany({ expiryDate: { $gte: currentDate } }, { $set: { is_listed: true } })
        await Offer.updateMany({ expiryDate: { $lte: currentDate } }, { $set: { is_listed: false } })
    const offer = await Offer.find({})
    res.render('./adminSide/viewOffer',{offer})
    
  } catch (error) {
    console.log(error.message);
  }
}



module.exports = {
  loadOfferPage,
  saveOffer,
  viewOffer
};
