const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

// MongoDB connection
require("./config");
const Categories = require("./categories");
const Persons = require("./persons");
const Families = require("./family");
const User = require("./User");
// ===============================
// CREATE DEFAULT ADMIN USER
// ===============================
async function createDefaultAdmin() {
  try {
    const adminEmail = "admin@gmail.com";

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await User.create({
        name: "Admin",
        email: adminEmail,
        password: "1234", // plain text (matches your login logic)
      });

      console.log("✅ Admin created: admin@gmail.com / 1234");
    } else {
      console.log("ℹ️ Admin already exists");
    }
  } catch (err) {
    console.error("❌ Admin creation error:", err.message);
  }
}

// call ONCE when server starts
createDefaultAdmin();

const Setting = require('./Setting')
const Banner = require("./banner");
const AppUpdate = require("./AppUpdate");

// ----------------- Multer Storage -----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ----------------- Middlewares -----------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// ----------------- User Register -----------------
app.post("/register", upload.none(), async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ status: false, error: "Name, Email and Password required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ status: false, error: "User already exists" });
    }

    const user = new User({ name, email, password });
    await user.save();

    return res.json({
      auth: true,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- User Login -----------------
app.post("/login", upload.none(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, error: "Email and Password required" });
    }

    const user = await User.findOne(
      { email, password },
      { _id: 0, email: 1, name: 1 }
    );

    if (!user) {
      return res
        .status(404)
        .json({ status: false, error: "Invalid Email or Password" });
    }

    res.json({
      auth: true,
      user,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Categories API -----------------
app.post(
  "/categories",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "banner_image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
    { name: "category_photo", maxCount: 1 },
    { name: "multiple_img_array", maxCount: 10 },
  ]),
  async (req, resp) => {
    try {
      let data = {
        ...req.body,
        image: req.files["image"]?.[0]?.filename || null,
        banner_image: req.files["banner_image"]?.[0]?.filename || null,
        icon: req.files["icon"]?.[0]?.filename || null,
        category_photo: req.files["category_photo"]?.[0]?.filename || null,
        multiple_img_array: req.files["multiple_img_array"]
          ? req.files["multiple_img_array"].map((f) => f.filename)
          : [],
      };

      let category = new Categories(data);
      await category.save();

      resp.json({ status: true, category });
    } catch (err) {
      resp.status(500).json({ status: false, error: err.message });
    }
  }
);

// ----------------- Persons API -----------------
app.post(
  "/person",
  upload.fields([
    { name: "persons_image", maxCount: 1 },
    { name: "banner_image", maxCount: 1 },
    { name: "person_multiple_img", maxCount: 10 },
  ]),
  async (req, resp) => {
    try {
      let data = {
        ...req.body,
        category_id: req.body.category_id
          ? new mongoose.Types.ObjectId(req.body.category_id)
          : null,
        persons_image: req.files["persons_image"]?.[0]?.filename || null,
        banner_image: req.files["banner_image"]?.[0]?.filename || null,
        person_multiple_img: req.files["person_multiple_img"]
          ? req.files["person_multiple_img"].map((f) => f.filename)
          : [],
        isTrending: req.body.isTrending === "true",
        isNewArrival: req.body.isNewArrival === "true",
      };

      let person = new Persons(data);
      await person.save();

      resp.json({ status: true, person });
    } catch (err) {
      resp.status(500).json({ status: false, error: err.message });
    }
  }
);

// ----------------- Family API -----------------
app.post("/family", upload.none(), async (req, resp) => {
  try {
    let family = new Families(req.body);
    let result = await family.save();
    resp.json({ status: true, result });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});


// ----------------- Get Persons by Category -----------------
app.get("/categories/:id/persons", async (req, resp) => {
  try {
    const categoryId = req.params.id;
    const category = await Categories.findById(categoryId, {
      _id: 1,
      category_name: 1,
    });
    if (!category) {
      return resp
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const persons = await Persons.find(
      { category_id: categoryId },
      { _id: 1, name: 1, title: 1, persons_image: 1, short_description: 1 }
    );

    resp.json({
      category_id: category._id,
      category_name: category.category_name,
      persons: persons.map((p) => ({
        id: p._id,
        person_name: p.name,
        title: p.title,
        person_image: p.persons_image,
        short_description: p.short_description,
      })),
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Trending API -----------------
app.get("/trending", async (req, resp) => {
  try {
    const trending_persons = await Persons.find(
      { isTrending: true },
      { _id: 1, name: 1, views: 1, persons_image: 1, short_description: 1 }
    )
      .sort({ views: -1 })
      .limit(5);

    resp.json({
      trending_persons: trending_persons.map((p) => ({
        id: p._id,
        person_name: p.name,
        views: p.views,
        person_image: p.persons_image,
        short_description: p.short_description,
      })),
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- New Arrivals API -----------------
app.get("/new-arrivals", async (req, resp) => {
  try {
    const newArrivals = await Persons.find(
      { isNewArrival: true },
      { _id: 1, name: 1, dob: 1, persons_image: 1, short_description: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(10);

    resp.json({
      new_arrivals: newArrivals.map((p) => ({
        id: p._id,
        person_name: p.name,
        dob: p.dob,
        person_image: p.persons_image,
        short_description: p.short_description,
      })),
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Category Details by ID API -----------------
// ----------------- Get Category By ID (For Update/Edit) -----------------
app.get("/categories/:id", async (req, res) => {
  try {
    const category = await Categories.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Category not found",
      });
    }

    res.json({
      status: true,
      category,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});


// ----------------- Person Details by ID API -----------------
app.get("/person_details/:id", async (req, resp) => {
  try {
    const { id } = req.params;

    const person = await Persons.findById(id, {
      persons_image: 1,
      person_multiple_img: 1,
      name: 1,
      short_description: 1,
      description: 1,
    });

    if (!person) {
      return resp.status(404).json({ status: false, message: "Person not found" });
    }

    resp.json({
      status: true,
      person_details: {
        persons_image: person.persons_image,
        person_multiple_img: person.person_multiple_img,
        name: person.name,
        short_description: person.short_description,
        description: person.description,
      },
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});


// ----------------- Setting API (Create/Update) -----------------
app.post("/setting", upload.none(), async (req, resp) => {
  try {
    // find the first setting document and update it, otherwise create new one
    const setting = await Setting.findOneAndUpdate(
      {}, // no filter, always pick first doc
      req.body, // update with form data
      { new: true, upsert: true } // return updated doc, create if none exists
    );

    resp.json({ status: true, result: setting });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Get Settings API -----------------
app.get("/setting", async (req, resp) => {
  try {
    const setting = await Setting.findOne(); // only one settings doc

    resp.json({
      status: true,
      setting: setting
        ? {
            terms_conditions: setting.terms_conditions,
            privacy_policy: setting.privacy_policy,
            contact: setting.contact,
            aboutus: setting.aboutus,
          }
        : null,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});


// ---------------------------------------------------2/9/25

// ----------------- Get All Persons -----------------
app.get("/persons", async (req, resp) => {
  try {
    const persons = await Persons.find(
      {},
      {
        category_id: 1,
        name: 1,
        title: 1,
        education: 1,
        dob: 1,
        dob_place: 1,
        date_of_death: 1,
        place_of_death: 1,
        affiliation: 1,
        short_description: 1,
        full_details: 1,
        persons_image: 1,
        banner_image: 1,
        description: 1,
        person_multiple_img: 1,
        views: 1,
        isTrending: 1,
        isNewArrival: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    ).populate("category_id", "category_name");

    resp.json({
      status: true,
      persons,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Get Person By ID -----------------
app.get("/persons/:id", async (req, resp) => {
  try {
    const { id } = req.params;

    const person = await Persons.findById(
      id,
      {
        category_id: 1,
        name: 1,
        title: 1,
        education: 1,
        dob: 1,
        dob_place: 1,
        date_of_death: 1,
        place_of_death: 1,
        affiliation: 1,
        short_description: 1,
        full_details: 1,
        persons_image: 1,
        banner_image: 1,
        description: 1,
        person_multiple_img: 1,
        views: 1,
        isTrending: 1,
        isNewArrival: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    ).populate("category_id", "category_name");

    if (!person) {
      return resp.status(404).json({ status: false, message: "Person not found" });
    }

    resp.json({
      status: true,
      person,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Delete Person by ID -----------------
app.delete("/persons/:id", async (req, resp) => {
  try {
    const { id } = req.params;

    const deletedPerson = await Persons.findByIdAndDelete(id);

    if (!deletedPerson) {
      return resp.status(404).json({
        status: false,
        message: "Person not found",
      });
    }

    resp.json({
      status: true,
      message: "Person deleted successfully",
      deletedPerson,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Update Person by ID -----------------
app.put("/persons/:id", upload.fields([
  { name: "persons_image", maxCount: 1 }, // single profile image
  { name: "person_multiple_img", maxCount: 10 }, // multiple images
]), async (req, resp) => {
  try {
    const { id } = req.params;

    let updateData = { ...req.body }; // copy text fields

    // ✅ If new single image is uploaded
    if (req.files["persons_image"]) {
      updateData.persons_image = req.files["persons_image"][0].filename;
    }

    // ✅ If multiple images are uploaded
    if (req.files["person_multiple_img"]) {
      updateData.person_multiple_img = req.files["person_multiple_img"].map(
        (file) => file.filename
      );
    }

    // ✅ Update person in DB
    const updatedPerson = await Persons.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("category_id", "category_name");

    if (!updatedPerson) {
      return resp.status(404).json({ status: false, message: "Person not found" });
    }

    resp.json({
      status: true,
      message: "Person updated successfully",
      person: updatedPerson,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Get All Categories API -----------------
app.get("/categories", async (req, resp) => {
  try {
    const categories = await Categories.find(
      {},
      {
        category_name: 1,
        description: 1,
        image: 1,
        banner_image: 1,
        icon: 1,
        category_photo: 1,
        multiple_img_array: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    resp.json({
      status: true,
      categories,
    });
  } catch (err) {
    resp.status(500).json({
      status: false,
      error: err.message,
    });
  }
});


// ----------------- Delete Category by ID API -----------------
app.delete("/categories/:id", async (req, resp) => {
  try {
    const category = await Categories.findByIdAndDelete(req.params.id);

    if (!category) {
      return resp.status(404).json({
        status: false,
        message: "Category not found",
      });
    }
    resp.json({
      status: true,
      message: "Category deleted successfully",
      deletedCategory: category,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Update Category by ID -----------------
app.put(
  "/categories/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "banner_image", maxCount: 1 },
    { name: "icon", maxCount: 1 },
    { name: "category_photo", maxCount: 1 },
    { name: "multiple_img_array", maxCount: 10 },
  ]),
  async (req, resp) => {
    try {
      const { id } = req.params;

      // Copy text fields from body
      let updateData = { ...req.body };

      // ✅ Handle single file uploads
      if (req.files["image"]) {
        updateData.image = req.files["image"][0].filename;
      }
      if (req.files["banner_image"]) {
        updateData.banner_image = req.files["banner_image"][0].filename;
      }
      if (req.files["icon"]) {
        updateData.icon = req.files["icon"][0].filename;
      }
      if (req.files["category_photo"]) {
        updateData.category_photo = req.files["category_photo"][0].filename;
      }

      // ✅ Handle multiple files
      if (req.files["multiple_img_array"]) {
        updateData.multiple_img_array = req.files["multiple_img_array"].map(
          (file) => file.filename
        );
      }

      // ✅ Update category in DB
      const updatedCategory = await Categories.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedCategory) {
        return resp.status(404).json({
          status: false,
          message: "Category not found",
        });
      }

      resp.json({
        status: true,
        message: "Category updated successfully",
        category: updatedCategory,
      });
    } catch (err) {
      resp.status(500).json({ status: false, error: err.message });
    }
  }
);

// ----------------- Create Banner -----------------
app.post(
  "/banners",
  upload.fields([{ name: "banner_image", maxCount: 1 }]),
  async (req, resp) => {
    try {
      console.log("req.body:", req.body);
      console.log("req.files:", req.files);

      let data = {
        type: req.body.type,
        selected_id:
          req.body.selected_id && req.body.selected_id !== ""
            ? new mongoose.Types.ObjectId(req.body.selected_id)
            : null,
        banner_image: req.files?.banner_image?.[0]?.filename || null,
        is_visiable: req.body.is_visiable === "true",
      };

      let banner = new Banner(data);
      await banner.save();

      resp.json({ status: true, banner });
    } catch (err) {
      console.error("Banner save error:", err);
      resp.status(500).json({ status: false, error: err.message });
    }
  }
);

// ----------------- Get All Banners -----------------
app.get("/banners", async (req, resp) => {
  try {
    const banners = await Banner.find({}).sort({ createdAt: -1 });

    resp.json({
      status: true,
      banners,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Get Banner by ID -----------------
app.get("/banners/:id", async (req, resp) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return resp.status(404).json({ status: false, message: "Banner not found" });
    }

    resp.json({ status: true, banner });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Update Banner -----------------
app.put(
  "/banners/:id",
  upload.fields([{ name: "banner_image", maxCount: 1 }]),
  async (req, resp) => {
    try {
      let updateData = { ...req.body };

      if (req.files["banner_image"]) {
        updateData.banner_image = req.files["banner_image"][0].filename;
      }

      if (req.body.selected_id) {
        updateData.selected_id = new mongoose.Types.ObjectId(req.body.selected_id);
      }

      if (req.body.is_visiable !== undefined) {
        updateData.is_visiable = req.body.is_visiable === "true";
      }

      const updatedBanner = await Banner.findByIdAndUpdate(
        req.params.id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedBanner) {
        return resp.status(404).json({ status: false, message: "Banner not found" });
      }

      resp.json({
        status: true,
        message: "Banner updated successfully",
        banner: updatedBanner,
      });
    } catch (err) {
      resp.status(500).json({ status: false, error: err.message });
    }
  }
);

// ----------------- Delete Banner -----------------
app.delete("/banners/:id", async (req, resp) => {
  try {
    const deletedBanner = await Banner.findByIdAndDelete(req.params.id);

    if (!deletedBanner) {
      return resp.status(404).json({
        status: false,
        message: "Banner not found",
      });
    }

    resp.json({
      status: true,
      message: "Banner deleted successfully",
      deletedBanner,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

app.get("/person_details", async (req, res) => {
  try {
    const persons = await Persons.find()
      .populate("category_id", "category_name"); // ✅ fetch only category_name from categories

    res.json({
      status: true,
      persons,
    });
  } catch (error) {
    console.error("Error fetching persons:", error);
    res.status(500).json({ status: false, error: "Server error" });
  }
});

// ----------------- Increment Person View Count -----------------
app.post("/persons/:id/view", async (req, res) => {
  try {
    const { id } = req.params;

    const person = await Persons.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!person) {
      return res.status(404).json({ status: false, message: "Person not found" });
    }

    res.json({
      status: true,
      views: person.views,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- Most Read Persons API -----------------
app.get("/most-read", async (req, resp) => {
  try {
    const persons = await Persons.find(
      {},
      {
        category_id: 1,
        name: 1,
        title: 1,
        persons_image: 1,
        short_description: 1,
        views: 1,
        createdAt: 1,
      }
    )
      .populate("category_id", "category_name")
      .sort({ views: -1 }) // 🔥 highest views first
      .limit(5);           // 🔥 top 5 only

    resp.json({
      status: true,
      most_read: persons,
    });
  } catch (err) {
    resp.status(500).json({ status: false, error: err.message });
  }
});

// ----------------- App Update (POST ONLY) -----------------
app.post("/app-update", async (req, res) => {
  try {
    const update = new AppUpdate(req.body);
    await update.save();
    res.json({ status: true, update });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

  
app.get("/app-updates", async (req, res) => {
  try {
    const updates = await AppUpdate.find().sort({ createdAt: -1 });
    res.json({ status: true, updates });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});


  
// ----------------- Server -----------------
app.listen(7000, () => console.log("Server running on http://localhost:7000"));
