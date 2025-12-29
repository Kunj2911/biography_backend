const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
    person: { type: mongoose.Schema.Types.ObjectId, ref: "Persons" }, // link to a Person
    name: String,
    relation: String,
    note: String
}, {
    timestamps: true   // 👈 this will auto-create createdAt and updatedAt
});

module.exports = mongoose.model("Families", familySchema);
