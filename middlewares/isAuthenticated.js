//? Check if the token received is existing in the database
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    const tokenReceived = req.headers.authorization.replace("Bearer ", "");
    //console.log("Token received ", tokenReceived);

    const userAuthenticated = await User.findOne({ token: tokenReceived });
    //console.log("User authentificated ", userAuthenticated.email);

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
