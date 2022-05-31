/**
 * @file Main config file
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

exports.server = {
  port: 8080,
  host: "0.0.0.0",

  get serverUrl() {
    return ``;
  },
  get apiUrl() {
    return `/api`;
  },
};

exports.config = {
  emailServer: "smtp.gmail.com",
  emailPort: 465,
  emailUser: "mdabuobaidazishan@gmail.com",
  emailPasswd: "****",
  adminEmail: "mdabuobaidazishan@gmail.com",

  projectPath: "WORKER",
  projectIDlength: 12,
  fileIDlength: 21,

  declareXML:
    '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE mlt SYSTEM "https://raw.githubusercontent.com/mltframework/mlt/master/src/modules/xml/mlt-xml.dtd">',

  mapFilterNames: {
    fadeInBrightness: "brightness",
    fadeOutBrightness: "brightness",
    fadeInVolume: "volume",
    fadeOutVolume: "volume",
  },
};
