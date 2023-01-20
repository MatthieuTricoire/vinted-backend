require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors")
app.use(express.json());
app.use(cors());

const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGODB_URI);

const fileUpload = require("express-fileupload");

const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

const user = require("./routes/user.js");
const offer = require("./routes/offer.js");
app.use(user);
app.use(offer);

app.listen(process.env.PORT, () => {
  console.log("🚀 Server started 🚀");
});
