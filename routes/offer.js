const express = require("express");
const cloudinary = require("cloudinary").v2;

const router = express.Router();
const Offer = require("../models/Offer");
const User = require("../models/User");

const isAuthenticated = require("../middlewares/isAuthenticated");
const respectLength = require("../middlewares/respectLength");
const convertToBase64 = require("../utils/convertToBase64");

const fileUpload = require("express-fileupload");

//? Create a new offer
//?------------------

router.post(
  "/offer/publish",
  fileUpload(),
  isAuthenticated,
  respectLength,
  async (req, res) => {
    try {
      //console.log(req.body);
      //console.log(req.user);
      //console.log(req.file);
      const { title, description, price, condition, city, brand, size, color } =
        req.body;
      const product_details = [
        { brand },
        { size },
        { condition },
        { color },
        { city },
      ];
      //console.log(product_description);
      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details,
        owner: req.user._id,
      });

      const newOfferId = newOffer._id;
      const uploadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        { folder: `/vinted/offer/${newOffer._id}` }
      );
      newOffer.product_images.push(uploadedImage);
      await newOffer.save();
      res
        .status(200)
        .json(await Offer.findById(newOfferId).populate("owner", "account"));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

//? Update an offer
//?----------------

router.put("/offer/update", fileUpload(), isAuthenticated, async (req, res) => {
  try {
    const offerToUpdate = await Offer.findById(req.body.id);
    //* Check if a picture is available for the update
    //* If there is a picture, delete the previous and update the new one.

    if (req.files.picture) {
      await cloudinary.uploader.destroy(offerToUpdate.product_image.public_id);
      //await cloudinary.api.delete_folder(`offer/${req.body.id}`);
      const uploadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        { folder: `/vinted/offer/${req.body.id}` }
      );
      console.log("Image to update ready");
    }

    //console.log("Offer to upadte : ", offerToUpdate);
    const { title, description, price, condition, city, brand, size, color } =
      req.body;
    const product_details = [
      {
        brand,
        size,
        condition,
        color,
        city,
      },
    ];
    offerToUpdate.product_name = title;
    offerToUpdate.product_details = product_details;
    offerToUpdate.product_price = price;
    offerToUpdate.product_description = description;
    console.log("Offer updated", offerToUpdate);
    await offerToUpdate.save();
    res.status(200).json({ message: "Offer updated" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//? Delete an offer
//?----------------
router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  try {
    const offerToDelete = await Offer.findById(req.body.id);
    console.log(offerToDelete);
    await cloudinary.api.delete_resources_by_prefix(`/offer/${req.body.id}/`)
    //await cloudinary.uploader.destroy(offerToDelete.product_image.public_id);
    //await cloudinary.api.delete_folder(`offer/${req.body.id}`);
    res.status(200).json({ message: "Offer correctly deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//? Filter offers depending some options
//?------------------------------------
router.get("/offers", async (req, res) => {
  try {
    const offersPerPage = 2;
    const sortOffer = req.query.sort === "price-desc" ? -1 : 1;
    const { priceMin, priceMax, sort, title, page } = req.query;
    const titleRegex = new RegExp(title, "i");
    let filters = {};

    if (req.query.title) {
      filters.product_name = titleRegex;
    }
    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }
    if (priceMax) {
      if (priceMin) {
        filters.product_price.$lte = priceMax;
      }
    } else {
      filters.product_price = { $tle: Number(priceMax) };
    }

    // Count documents with not the adequat function
    // let countOffers = await Offer.find(filters)
    //   .sort({ product_price: sortOffer })
    //   .select("product_name product_price -_id");

    const countOffers = await Offer.find(filters)
      .sort({ product_price: sortOffer })
      .select("product_name product_price -_id")
      .countDocuments();

    if (countOffers < (page - 1) * offersPerPage) {
      return res.status(400).json({
        error: "The page number is too high compared to the displayable offers",
      });
    }
    let filteredOffers = await Offer.find(filters)
      .sort({ product_price: sortOffer })
      .select("product_name product_price -_id")
      .skip((page - 1) * offersPerPage)
      .limit(offersPerPage);

    res.status(200).json({ countOffers, filteredOffers });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//? Details of a specific offer
//?-----------------------------
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
