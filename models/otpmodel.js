const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  user_id: String,
  hashedOTP: String,
  expireAt: { type: Date, default: Date.now, expires: 30 },
});

const OTPdb = mongoose.model("OTP", otpSchema);

module.exports = OTPdb;
