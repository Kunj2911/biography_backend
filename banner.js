const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    banner_image: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["person", "category" , "none"], // only allow these values
      required: true,
    },
   selected_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.type !== "none"; // only required if type is not "none"
      },
    },
    is_visiable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("banners", bannerSchema);
