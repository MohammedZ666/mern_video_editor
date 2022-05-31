/**
 * @file Main file of the app
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import "dotenv/config";
import { server as config } from "./config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const server = express();
server.use(cors());

// connect to mongodb & listen for requests
const dbURI = process.env.DB_KEY;
mongoose
  .connect(dbURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    server.listen(config.port, config.host, () => {
      log.info(
        `Express listening on host "${config.host}" and on port ${config.port}`
      );
      console.log(
        `Express listening on host "${config.host}" and on port ${config.port}`
      );
    });
  })
  .catch((err) => console.log(err));

const bodyParser = require("body-parser");
server.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
  })
);
server.use(bodyParser.json({ limit: "50mb" }));

const log4js = require("log4js");
import log from "./models/logger";
server.use(
  log4js.connectLogger(log, {
    level: "auto",
    statusRules: [{ codes: [304], level: "info" }],
  })
);

// View
server.engine("html", require("ejs").renderFile);
server.set("view engine", "html");

// Router
const router = require("./router.js");
server.use("/", router);

server.use(express.static("public"));
