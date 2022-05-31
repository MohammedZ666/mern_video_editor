/**
 * @file Controller for front GUI
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import { config } from "../config";
const fs = require("fs");
const path = require("path");
exports.index = (req, res) => res.render("index", {});
exports.create = (req, res) => res.render("create", {});
exports.project = (req, res) => res.render("project", {});

exports.finished = (req, res) => {
  const outputFile = path.resolve(
    path.join(config.projectPath, req.params.projectID, "output.mp4")
  );
  fs.access(outputFile, fs.constants.R_OK, (err) => {
    if (err) res.sendStatus(404);
    else res.sendFile(outputFile);
  });
};

exports.resource = (req, res) => {
  //   if (req.params.fileID.length !== config.fileIDlength) {
  //     return res.sendStatus(404);
  //   }
  let outputFile = "";
  if (req.params.fileID.includes(".")) {
    outputFile = path.resolve(
      path.join(config.projectPath, req.params.projectID, req.params.fileID)
    );
  } else {
    const ext =
      "." + (typeof req.query.ext !== "undefined" ? req.query.ext : "mp4");
    outputFile = path.resolve(
      path.join(config.projectPath, req.params.projectID, req.params.fileID) +
        ext
    );
  }
  fs.access(outputFile, fs.constants.R_OK, (err) => {
    if (err) res.sendStatus(404);
    else res.sendFile(outputFile);
  });
};
