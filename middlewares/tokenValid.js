//* Models import
const Offer = require("../models/Offer");

const tokenValid = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.body.id).populate("owner", "token");
    console.log(offer);
    if (req.user.token !== offer.owner.token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = tokenValid;
