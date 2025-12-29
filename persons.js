const mongoose = require('mongoose');

const personsSchema = new mongoose.Schema({
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: "categories" },
  name: String,
  title: String,
  education: String,
  dob: Date,
  dob_place: String,
  date_of_death: Date,
  place_of_death: String,
  affiliation: String,
  short_description: String,
  full_details: String,
  persons_image: String,
  banner_image: String,
  description: String,
  person_multiple_img: [String],
  views: { type: Number, default: 0 },

  // 👇 new fields
  isTrending: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false }
}, {
  timestamps: true
});


module.exports = mongoose.model("persons", personsSchema);