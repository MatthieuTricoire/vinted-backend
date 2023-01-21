//* Express packages
const express = require("express");
const router = express.Router();

//* Cloudinary package
const cloudinary = require("cloudinary").v2;

//* FileUpload package
const fileUpload = require("express-fileupload");

//* Middlewares import
const isAuthenticated = require("../middlewares/isAuthenticated");
const respectLength = require("../middlewares/respectLength");

//* Utils import
const convertToBase64 = require("../utils/convertToBase64");

//* Models import
const Offer = require("../models/Offer");
const User = require("../models/User");
const { countDocuments } = require("../models/User");

//*              NEW OFFER ROUTE
//* -----------------------------------------

router.post(
  "/offer/publish",
  isAuthenticated,
  respectLength,
  fileUpload(),
  async (req, res) => {
    try {
      const { title, description, price, condition, city, brand, size, color } =
        req.body;

      // Minimin required criteria to create an offer
      if (!title || !price || !req.files.picture) {
        return res
          .status(400)
          .json({ Message: "Title, price, and pictures are required" });
      }

      const product_details = [
        { brand },
        { size },
        { condition },
        { color },
        { city },
      ];

      // Offer creation without the images
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details,
        owner: req.user,
      });

      // Only png and jpeg formats accepted
      if (
        req.files.picture.mimetype !== "image/png" &&
        req.files.picture.mimetype !== "image/jpeg"
      ) {
        return res
          .status(400)
          .json({ message: "Only jpeg and png formats accepted" });
      }

      // Only one image accepted
      if (Array.isArray(req.files.picture)) {
        return res
          .status(400)
          .json({ message: "Only one single image accepted" });
      }

      // Image upload
      const uploadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        { folder: `/vinted/offer/${newOffer._id}`, public_id: "preview" }
      );

      // Image added to the offer
      newOffer.product_image = uploadedImage;
      newOffer.product_images.push(uploadedImage);

      // Offer saved
      await newOffer.save();

      res
        .status(200)
        .json(await Offer.findById(newOffer._id).populate("owner", "account"));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

//*              UPDATE OFFER ROUTE
//* -----------------------------------------

router.put(
  "/offer/update:id",
  isAuthenticated,
  fileUpload(),
  async (req, res) => {
    try {
      const offerToUpdate = await Offer.findById(req.params.id);

      // Received information update, excepted image
      if (req.body.title) offerToUpdate = req.body.title;

      if (req.body.price) offerToUpdate = req.body.price;

      if (req.body.description) offerToUpdate = req.body.description;

      const details = offerToUpdate.product_details;
      for (const object of details) {
        if (object.brand) {
          if (req.body.brand) {
            object.brand = req.body.brand;
          }
          if (object.size) {
            if (req.body.size) {
              object.size = req.body.size;
            }
          }
          if (object.color) {
            if (req.body.color) {
              object.color = req.body.color;
            }
          }
          if (object.city) {
            if (req.body.city) {
              object.city = req.body.city;
            }
          }
          if (object.condition) {
            if (req.body.condition) {
              object.condition = req.body.condition;
            }
          }
        }
      }
      // Save Objects array in an array
      offerToUpdate.markModified("product_details");

      // Received image update
      const uploadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture, {
          folder: `/vinted/offer/${newOffer._id}`,
          public_id: "preview",
        })
      );
      offerToUpdate.product_image = uploadedImage;

      // Save updated offer
      await offerToUpdate.save();

      res.status(200).json({ message: "Offer updated 🆙 ✅" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

//*              DELETE OFFER ROUTE
//* -----------------------------------------

router.delete("/offer/delete:id", isAuthenticated, async (req, res) => {
  try {
    // Delete all images in the offer folder
    await cloudinary.api.delete_resources_by_prefix(
      `/vinted/offer/${req.params.id}`
    );

    // Delete empty folder
    await cloudinary.api.delete_folder(`/vinted/offer/${req.params.id}`);

    // Delete offer in MongoDB
    await Offer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Offer deleted 🚮 ✅" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//*              FILTER OFFERS ROUTE
//* -----------------------------------------

router.get("/offers", async (req, res) => {
  try {
    // Offers displayed per page
    const offersPerPage = 2;

    let filter = {};

    //
    if (req.query.title) {
      filter.product_name = new RegExp(req.body.title, "i");
    }

    // Setting up the "contains" search
    if (req.query.priceMin) {
      filter.product_price = {
        $gte: Number(req.query.priceMin),
      };
    }
    if (req.query.priceMax) {
      if (filter.product_price) {
        filter.product_price.$lte = req.query.priceMax;
      } else {
        filter.product_price = {
          $lte: Number(req.query.priceMax),
        };
      }
    }

    // Setting up the sort parameter
    req.query.sort === "price-asc"
      ? (sort = { product_price: 1 })
      : (sort = { product_price: -1 });

    // Pages management
    let page;
    if (req.query.page) {
      Number(req.query.page) < 1 ? (page = 1) : (page = Number(req.query.page));
    } else {
      page = 1;
    }

    let limit = req.query.limit;

    // Search with all required criteria
    const offers = await Offer.find(filter)
      .populate("owner", "account")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    // Offers number
    const countOffer = await countDocuments(filter);

    res.status(200).json({
      count: countOffer,
      offers: offers,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//*              INFO OFFER ROUTE
//* -----------------------------------------
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate(
      "owner",
      "account"
    );
    res.status(200).json({ offer });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
