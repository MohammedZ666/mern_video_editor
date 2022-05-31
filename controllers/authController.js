const User = require("../models/user");
const jwt = require("jsonwebtoken");
const maxAge = 3 * 24 * 60 * 60;
var nodemailer = require("nodemailer");

const createToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET, {
    expiresIn: maxAge,
  });
};

const handleErrors = (err) => {
  let errors = { email: "", password: "" };

  //incorrect email
  if (err.message === "incorrect email") {
    errors.email = "that email is not registered";
  }

  //incorrect password
  if (err.message === "incorrect password") {
    errors.password = "that password is incorrect";
  }

  //duplicate error code
  if (err.code === 11000) {
    errors.email = "that email is already registered";
    return errors;
  }

  // validation errors
  if (err.message.includes("failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};

const register = async (req, res) => {
  const { email, password, name, phone } = req.body;
  try {
    await User.create({
      email,
      password,
      name,
      phone,
    });
    return res.status(201).json({});
  } catch (error) {
    const errors = handleErrors(error);
    return res.status(404).json(errors);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user.id);
    return res.status(200).json({ token });
  } catch (err) {
    const errors = handleErrors(err);
    return res.status(400).json(errors);
  }
};

const logout = async (req, res, next) => {
  //handled in browser
};
const get_user = (req, res, next) => {
  const user = req.user;
  delete user.password;
  return res.status(200).json({ user });
};
const update_user = async (req, res) => {
  const { _id, email, password, name, phone } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      { _id },
      { email, password, username, phone, address },
      {
        runValidators: true,
        new: true,
        strict: "throw",
      }
    );
    return res.status(200).json({ user: user._id });
  } catch (error) {
    const errors = handleErrors(error);
    return res.status(404).json(errors);
  }
};
const forgot_password = async (req, res) => {
  const transporter = nodemailer.createTransport(transport);
  const ejs = require("ejs");
  var email = req.body.email;

  let user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ msg: "fail" });
  }
  user = await User.findOneAndUpdate(
    { email },
    { otp: Math.floor(1000 + Math.random() * 9000) },
    { new: true }
  );
  ejs.renderFile(
    __dirname + "/emailTemplate.ejs",
    {
      username: user.username,
      confirm_link: `http://localhost:3000/resetPassword/${user.email}/${user.otp}`,
    },
    function (err, data) {
      if (err) {
        console.log(err);
      } else {
        var mainOptions = {
          from: `"USER"${creds.USER} `,
          to: email,
          subject: "Reset your password",
          html: data,
        };

        transporter.sendMail(mainOptions, function (err, info) {
          if (err) {
            res.json({
              msg: "fail",
            });
          } else {
            res.json({
              msg: "success",
            });
          }
        });
      }
    }
  );
};

const reset_password = async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(404).json({ msg: "passwords don't match!", code: 0 });
  }
  try {
    let user = await User.findOne({ email }).lean();
    if (user.otp == otp) {
      delete user.otp;
      user.password = password;
      user = await User.findOneAndUpdate({ email }, user, { new: true });
      return res.status(200).json({ msg: "success" });
    } else {
      res
        .status(404)
        .json({ msg: "Could not update password, please try again" });
    }
  } catch (error) {
    return res.status(404).json({ msg: "user not found by that email" });
  }
};

module.exports = {
  register,
  update_user,
  login,
  logout,
  get_user,
  forgot_password,
  reset_password,
};
