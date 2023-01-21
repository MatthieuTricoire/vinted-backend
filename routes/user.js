//* Express package
const express = require("express");
const router = express.Router();

//* Encryption packages
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

//* Cloudrinary package
const cloudinary = require("cloudinary").v2;

//* FileUpload package
const fileUpload = require("express-fileupload");

//* Utils import
const convertToBase64 = require("../utils/convertToBase64");

//* Models import
const User = require("../models/User");
const Offer = require("../models/Offer");

//*              SIGNUP ROUTE
//* -----------------------------------------

router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const userExists = await User.exists({ email });

    // User exists in the database
    if (userExists)
      return res.status(409).json({ error: "This user already exists" });

    const { username, email, password, newsletter } = req.body;

    // Missing required parameters
    if (!username || !email || !password) {
      return res.status(400).json({
        error:
          "Some required parameters are not available to create a new account.",
      });
    }

    // Token creation
    const token = uid2(64);
    // Salt creation
    const salt = uid2(16);
    // Hash creation
    const hash = SHA256(password + salt).toString(encBase64);

    // Create the new user
    const newUser = new User({
      email,
      newsletter,
      hash,
      salt,
      token,
      account: {
        username,
      },
    });

    // Manage avatar image
    if (req.files.avatar) {
      const upLoadedImage = await cloudinary.uploader.upload(
        convertToBase64(req.files.picture),
        { folder: `/vinted/user/${newUser._id}/avatar`, public_id: "avatar" }
      );
    }
    newUser.account.avatar = upLoadedImage;

    // Save the new user and return this user as object.
    await newUser.save();
    res.status(200).json({
      _id: newUser._id,
      email: newUser.email,
      token: newUser.token,
      account: newUser.account,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//*              LOGIN ROUTE
//* -----------------------------------------

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: email });

    // User exists in the database
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const { email, password } = req.body;

    const passwordCheck = SHA256(password + salt).toString(encBase64);

    if (passwordCheck === user.hash) {
      res.status(200).json({
        _id: user._id,
        token: user.token,
        account: user.account,
      });
    } else {
      res.status(404).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
