const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  Code: {
    type: String,
    required: true,
  },

  Discount: {
    type: Number,
    required: true,
  },
  MaxPrice: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  createdDate: {
    type: Date,
    required: true,
    default: Date.now(),
  },
  status: {
    type: Boolean,
    default: true,
  },
  userUsed: [
    {
      user_id: {
        type: mongoose.Types.ObjectId,
        ref: "User",
      },
    },
  ],
});

module.exports = mongoose.model("coupon", schema);
