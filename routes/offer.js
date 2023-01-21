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
const tokenValid = require("../middlewares/tokenValid");

//* Utils import
const convertToBase64 = require("../utils/convertToBase64");

//* Models import
const Offer = require("../models/Offer");
const User = require("../models/User");

//*              NEW OFFER ROUTE
//* -----------------------------------------

router.post(
  "/offer/publish",
  isAuthenticated,
  fileUpload(),
  respectLength,
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
  "/offer/update",
  isAuthenticated,
  fileUpload(),
  tokenValid,
  respectLength,
  async (req, res) => {
    try {
      let offerToUpdate = await Offer.findById(req.body.id);

      // Received information update, excepted image
      if (req.body.title) offerToUpdate.product_name = req.body.title;

      if (req.body.price) offerToUpdate.price = req.body.price;

      if (req.body.description)
        offerToUpdate.product_description = req.body.description;

      let details = offerToUpdate.product_details;

      for (let i = 0; i < details.length; i++) {
        if (details[i].brand) {
          if (req.body.brand) {
            details[i].brand = req.body.brand;
          }
          if (details[i].size) {
            if (req.body.size) {
              details[i].size = req.body.size;
            }
          }
          if (details[i].color) {
            if (req.body.color) {
              details[i].color = req.body.color;
            }
          }
          if (details[i].city) {
            if (req.body.city) {
              details[i].city = req.body.city;
            }
          }
          if (details[i].condition) {
            if (req.body.condition) {
              details[i].condition = req.body.condition;
            }
          }
        }
      }
      // Save Objects array in an array
      offerToUpdate.markModified("product_details");

      // Received image update
      const uploadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture, {
          folder: `/vinted/offer/${offerToUpdate._id}`,
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

router.delete(
  "/offer/delete",
  isAuthenticated,
  tokenValid,
  async (req, res) => {
    try {
      // //test
      // const offerToDelete = await Offer.findById(req.body.id).populate(
      //   "owner",
      //   "token"
      // );
      // if (req.user.token !== offerToDelete.owner.token) {
      //   return res.status(401).json({ message: "Unauthorized" });
      // }

      // Delete all images in the offer folder
      await cloudinary.api.delete_resources_by_prefix(
        `vinted/offer/${req.body.id}`
      );

      // Delete empty folder
      await cloudinary.api.delete_folder(`vinted/offer/${req.body.id}`);

      // Delete offer in MongoDB
      await Offer.findByIdAndDelete(req.body.id);
      res.status(200).json({ message: "Offer deleted 🚮 ✅" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

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
    const countOffer = await Offer.countDocuments(filter);

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
