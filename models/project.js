const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const projectSchema = new Schema(
  {
    _id: mongoose.Types.ObjectId,
    name: {
      type: String,
      required: true,
    },
  },
  { _id: false, timestamps: true }
);
const Project = mongoose.model("Project", projectSchema);
module.exports = Project;
