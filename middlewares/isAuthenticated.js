//* Models import
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    // No token found in the request
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const tokenReceived = req.headers.authorization.replace("Bearer ", "");

    const userAuthenticated = await User.findOne({
      token: tokenReceived,
    }).select("account _id");

    if (!userAuthenticated) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }
    req.user = userAuthenticated;

    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
module.exports = isAuthenticated;
