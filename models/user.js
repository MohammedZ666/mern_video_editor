const mongoose = require("mongoose");
const { isEmail, isMobilePhone } = require("validator");
const bcrypt = require("bcrypt");
const Schema = mongoose.Schema;
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
      lowercase: true,
      validate: [isEmail, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please enter a password"],
      minlength: [6, "Minimum password length is 6 characters"],
    },
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    phone: {
      type: String,
      required: [true, "Please enter your phone no."],
      minlength: [11, "Your number is not of 11 digits"],
    },
    projects: [{ type: mongoose.Types.ObjectId, ref: "Project" }],
  },
  { timestamps: true }
);

//fire a funtion before doc saved to db
userSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
userSchema.pre("findOneAndUpdate", async function (next) {
  let password = this._update.password;
  if (!password) {
    next();
  }
  try {
    const salt = await bcrypt.genSalt();
    this._update.password = await bcrypt.hash(password, salt);
    next();
  } catch (error) {
    throw Error(error);
  }
});

//static method for login user,
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (user) {
    const auth = await bcrypt.compare(password, user.password);
    if (auth) {
      return user;
    }
    throw Error("incorrect password");
  }
  throw Error("incorrect email");
};

const User = mongoose.model("User", userSchema);

module.exports = User;
