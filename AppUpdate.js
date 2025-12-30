const mongoose = require("mongoose");

const AppUpdateSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    release_notes: { type: String, required: true },

    force_update: { type: Boolean, default: false }, // 🔑 MAIN SWITCH
    force_update_android: { type: Boolean, default: false },
    force_update_ios: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppUpdate", AppUpdateSchema);
