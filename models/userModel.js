const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: Number,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  is_blocked: {
    type: Boolean,
    default: false,
  },
  is_verified: {
    type: Number,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  address: [
    {
      fullName: String,
      phone: Number,
      location: String,
      city: String,
      state: String,
      pinCode: String,
      address: String,
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
