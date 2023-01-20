const respectLength = (req, res, next) => {
  try {
    if (req.body.title.length > 50) {
      return res
        .status(401)
        .json({ error: "The title is too long. More than 50 chars." });
    }
    if (req.body.price > 100000) {
      return res
        .status(401)
        .json({ error: "The price is to high. Max value : 100000" });
    }
    if (req.body.description.length > 500) {
      res
        .status(401)
        .json({ error: "The description is too long. More than 500 chars." });
    }
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = respectLength;
