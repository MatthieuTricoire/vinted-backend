const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: { type: String, unique: true },
  account: {
    username: { type: String, required: true },
    avatar: Object,
  },
  newsletter: { type: Boolean, default: false },
  token: { type: String, unique: true },
  hash: { type: String, unique: true },
  salt: { type: String, unique: true },
});

module.exports = User;
