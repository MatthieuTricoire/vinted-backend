const express = require("express");
const router = express.Router();
const User = require("../models/User");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

//? Create a new user account if email is undefined
router.post("/user/signup", fileUpload(), async (req, res) => {
  try {
    const { username, email, password, newsletter } = req.body;
    const userExists = await User.exists({ email });
    if (userExists) {
      return res.status(409).json({ error: "This user is already existing." });
    }

    if (
      !username ||
      !email ||
      !password ||
      (newsletter !== "0" && newsletter !== "1")
    ) {
      return res.status(400).json({
        error:
          "Some required parameters are not available to create a new account.",
      });
    }
    let newsletterBoolean = false;
    newsletterBoolean = newsletter === 1 ? true : false;
    console.log(newsletterBoolean);
    //? Token creation
    const token = uid2(64);
    console.log(("Token : ", token));
    //? Salt creation
    const salt = uid2(16);

    //? Concatenate the password to salt and hash them
    const hash = SHA256(password + salt).toString(encBase64);
    console.log("Hash : ", hash);
    //? Create the new user with the hash and the salt value
    const newUser = new User({
      email,
      newsletter: newsletterBoolean,
      hash,
      salt,
      token,
      account: {
        username,
      },
    });
    const newUserId = newUser._id;
    console.log("ID user after creation in the model", newUserId);

    //? Manage avatar image
    //* Convert the image file into a string
    const convertToBase64 = (file) => {
      return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
    };
    const upLoadedImage = await cloudinary.uploader.upload(
      convertToBase64(req.files.picture),
      { folder: `/vinted/user/${newUserId}/avatar` }
    );

    newUser.account.avatar = upLoadedImage;
    console.log("new user full info : ", newUser);
    await newUser.save();
    res
      .status(200)
      .json({ message: `The user : ${username} has been correctly created.` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//?Login d'un utilisateur
//?----------------------

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const userInfo = await User.findOne({ email: email });
    if (!userInfo) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    //console.log(userInfo);
    const salt = userInfo.salt;

    const hash = userInfo.hash;

    const passwordCheck = SHA256(password + salt).toString(encBase64);

    if (passwordCheck === userInfo.hash) {
      res.status(200).json({
        _id: userInfo._id,
        token: userInfo.token,
        account: {
          username: userInfo.account.username,
        },
      });
    } else {
      res.status(404).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
