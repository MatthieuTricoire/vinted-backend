require("dotenv").config();
const cors = require("cors");

const express = require("express");
const app = express();

const mongoose = require("mongoose");

const fileUpload = require("express-fileupload");

const cloudinary = require("cloudinary").v2;

const user = require("./routes/user.js");
const offer = require("./routes/offer.js");

app.use(express.json());
app.use(cors());

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

app.use(user);
app.use(offer);

app.get("/", (req, res) => {
  res.json("🚀 Server *ON* 🚀");
});

app.listen(process.env.PORT, () => {
  console.log("🚀 Server started 🚀");
});
