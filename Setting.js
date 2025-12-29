const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema({
  terms_conditions : String,  
  privacy_policy: String,
  contact: String,
  aboutus: String
});

module.exports = mongoose.model("setting", SettingSchema);
