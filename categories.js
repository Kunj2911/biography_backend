const mongoose = require('mongoose');

const categoriesSchema = new mongoose.Schema({
    category_name: String,
    description: String,
    image: String,
    banner_image: String,
    icon: String,
    category_photo: String,                    
    multiple_img_array: [String]   
}, {
    timestamps: true   // 👈 this will auto-create createdAt and updatedAt
});

module.exports = mongoose.model("categories", categoriesSchema);
        