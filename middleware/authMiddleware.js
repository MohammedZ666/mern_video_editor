const jwt = require("jsonwebtoken");
const User = require("../models/user");

const requireAuth = (req, res, next) => {
  const token = req.headers["authorization"].replace("Bearer ", "");
  //check json web token exists
  if (token) {
    jwt.verify(token, process.env.SECRET, async (err, decodedToken) => {
      if (err) {
        res.redirect("/login");
      } else {
        req.user = await User.findById(decodedToken.id)
          .populate("projects")
          .lean();
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

module.exports = { requireAuth };
