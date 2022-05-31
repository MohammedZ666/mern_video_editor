/**
 * @file Controller for REST API
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import { config } from "../config";
import mltxmlManager from "../models/mltxmlManager";
import fileManager from "../models/fileManager";
import timeManager from "../models/timeManager";
import emailManager from "../models/emailManager";
import projectManager from "../models/projectManager";
import log from "../models/logger";
import error from "../models/errors";
import { isset, isNaturalNumber } from "../models/utils";
import Project from "../models/project";
import { nanoid } from "nanoid";
import { ObjectId } from "mongodb";

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const Busboy = require("busboy");
const User = require("../models/user");
//const Project = require("../models/project");
exports.default = (req, res) => {
  res.json({
    msg: "For API documentation see https://github.com/kudlav/videoeditor",
  });
};
exports.projectImport = (req, res, next) => {
  //const project = await Project.create({ name: name });
  //const projectID = project._id.toString();

  let busboy;
  try {
    busboy = new Busboy({
      headers: req.headers,
      highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
    });
  } catch (_) {
    /* continue */
  }

  if (!busboy) return errorResponse(error.uploadMissingFile400, res);
  let metas = null;
  let projectName = null;
  const projects = req.user.projects ? req.user.projects : [];
  let files = [];
  let fileCount = Infinity;
  busboy.on("field", (fieldname, val, fieldnameTruncated, valTruncated) => {
    if (fieldname === "data") {
      let data = JSON.parse(val);
      metas = data.metas;
      projectName = getProjectName(data.projectName, projects);
      fileCount = data.fileCount;
    }
    const projectId = ObjectId();
    const rootDir = __dirname.replace("/controllers", "");
    const projectDir = path.join(rootDir, "WORKER", projectId.toString());
    if (!fs.existsSync(projectDir))
      fs.mkdirSync(projectDir, { recursive: true });

    busboy.on(
      "file",
      async (fieldname, file, filename, transferEncoding, mimeType) => {
        const filepath = path.join(projectDir, filename);
        const fstream = fs.createWriteStream(filepath);
        file.pipe(fstream);
        // // On finish of the upload
        fstream.on("finish", async () => {
          files.push(filename);
          if (files.length === fileCount) {
            try {
              let projectJson = JSON.parse(
                fs.readFileSync(path.join(projectDir, "project.json"))
              );
              files.forEach((file) => {
                const profileHeight = Number(projectJson.resolution.height);
                if (
                  metas[file]["mime"].includes("image") &&
                  profileHeight > metas[file]["height"]
                ) {
                  const tempPath = `${projectDir}/tmp${file}`;
                  const filepath = `${projectDir}/${file}`;
                  exec(
                    `cp ${filepath} ${tempPath} && ffmpeg -y -i ${tempPath} -vf scale="-1:${profileHeight}" ${filepath} && unlink ${tempPath}`
                  );
                  metas[file].width =
                    profileHeight * (metas[file].width / metas[file].height);
                  metas[file].height = profileHeight;
                }
              });
              projectJson = populateImportJson(metas, projectJson);
              const projectMlt = jsonToXmlImport(projectJson, projectDir);
              fs.writeFileSync(
                path.join(projectDir, "project.mlt"),
                projectMlt
              );
              await addProject(projectId, req.user._id, projectName);
              return res.status(200).json({ id: projectId.toString() });
            } catch (error) {
              console.log(error);
              res.status(404).json({ msg: "project.json file not found" });
            }
          }
        });
        fstream.on("error", () => errorResponse(error.projectNotFound404, res));
      }
    );
  });
  return req.pipe(busboy); // Pipe it trough busboy
};

exports.projectExport = async (req, res, next) => {
  const { projectId, projectName } = req.body;
  const project = await addProject(ObjectId(), req.user._id, projectName);
};

exports.projectPOST = async (req, res, next) => {
  const profile = JSON.stringify({ resolution: req.body.resolution });
  const projects = req.user.projects ? req.user.projects : [];
  const projectName = getProjectName(req.body.name, projects);
  try {
    const project = await addProject(ObjectId(), req.user._id, projectName);
    const projectIDStr = project._id.toString();
    const dir = path.join(config.projectPath, projectIDStr);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/project.json`, profile, "utf8");
    projectManager.save(projectIDStr, projectManager.init()).then(
      () =>
        res.json({
          project: projectIDStr,
        }),
      (err) => next(err)
    );
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

exports.projectGET = async (req, res) => {
  try {
    const projectData = await buildProjectJson(req.params.projectID);
    return res.json(projectData);
  } catch (err) {
    return fileErr(err, res);
  }
};

exports.projectPUT = async (req, res, next) => {
  const projectPath = projectManager.getDirectory(req.params.projectID);
  exec(
    `cd ${projectPath} && melt project.mlt -consumer avformat:output.mp4 acodec=aac vcodec=libx264 > stdout.log 2> stderr.log; rm -f stdout.log stderr.log`,
    (err) => {
      if (err) log.error(`exec error: ${err}`);
      else log.info(`Project "${req.params.projectID}" finished`);
    }
  );
  res.json({
    msg: "Processing started",
  });
  saveAsJson(await buildProjectJson(req.params.projectID));
};

exports.projectFilePOST = (req, res, next) => {
  let busboy;
  try {
    busboy = new Busboy({
      headers: req.headers,
      highWaterMark: 2 * 1024 * 1024, // Set 2MiB buffer
      limits: {
        files: 1,
      },
    });
  } catch (_) {
    /* continue */
  }
  if (!busboy) return errorResponse(error.uploadMissingFile400, res);
  let metaData = {};
  busboy.on(
    "field",
    function (fieldname, val, fieldnameTruncated, valTruncated) {
      metaData = JSON.parse(val);
      busboy.on(
        "file",
        (fieldname, file, filename, transferEncoding, mimeType) => {
          const fileID = nanoid(config.fileIDlength);
          const extension = path.extname(filename);
          let filepath = path.join(
            config.projectPath,
            req.params.projectID,
            fileID
          );

          if (extension.length > 1) filepath += extension;
          const tempPath = path.join(
            config.projectPath,
            req.params.projectID,
            `tmp${extension}`
          );

          // Create a write stream of the new file
          const fstream = fs.createWriteStream(filepath);

          log.info(`Upload of "${filename}" started`);

          // Pipe it trough
          file.pipe(fstream);

          // On finish of the upload
          fstream.on("finish", async () => {
            log.info(`Upload of "${filename}" finished`);
            // <property name="meta.media.width">244</property>
            // <property name="meta.media.height">207</property>

            const profile = getProfile(
              projectManager.getDirectory(req.params.projectID)
            );
            const profileHeight = Number(profile.resolution);
            if (mimeType.includes("image") && profileHeight > metaData.height) {
              exec(
                `cp ${filepath} ${tempPath} && ffmpeg -y -i ${tempPath} -vf scale="-1:${profileHeight}" ${filepath} && unlink ${tempPath}`
              );

              metaData.width =
                profileHeight * (metaData.width / metaData.height);
              metaData.height = profileHeight;
            }

            fileManager.getDuration(filepath, mimeType).then((length) => {
              projectManager.load(req.params.projectID, "w").then(
                ([document, , release]) => {
                  const node = document.createElement("producer");
                  node.id = "producer" + fileID;
                  node.innerHTML = `<property name="resource">${path.resolve(
                    filepath
                  )}</property>`;
                  node.innerHTML += `<property name="musecut:mime_type">${mimeType}</property>`;
                  node.innerHTML += `<property name="musecut:name">${filename}</property>`;
                  if (mimeType.includes("image")) {
                    node.innerHTML += `<property name="meta.media.width">${metaData.width}</property>`;
                    node.innerHTML += ` <property name="meta.media.height">${metaData.height}</property>`;
                  } else if (mimeType.includes("video")) {
                    node.innerHTML += `<property name="meta.media.0.codec.width">${metaData.videoWidth}</property>`;
                    node.innerHTML += ` <property name="meta.media.0.codec.height">${metaData.videoHeight}</property>`;
                  }
                  if (length !== null) {
                    if (timeManager.isValidDuration(length))
                      node.innerHTML += `<property name="length">${length}</property>`;
                    else {
                      length = null;
                      log.fatal(
                        `Unable to get duration of ${mimeType}: ${filepath}`
                      );
                    }
                  }

                  const root = initializeRoot(document, res, release);
                  root.prepend(node);
                  projectManager
                    .save(req.params.projectID, root.outerHTML, release)
                    .then(
                      () =>
                        res.json({
                          msg: `Upload of "${filename}" OK`,
                          resource_id: fileID,
                          resource_mime: mimeType,
                          length: length,
                          width: mimeType.includes("image")
                            ? Number(metaData["width"])
                            : null,
                          height: mimeType.includes("image")
                            ? Number(metaData["height"])
                            : null,
                        }),
                      (err) => next(err)
                    );
                },
                (err) => fileErr(err, res)
              );
            });
          });
          fstream.on("error", () =>
            errorResponse(error.projectNotFound404, res)
          );
        }
      );
    }
  );
  return req.pipe(busboy); // Pipe it trough busboy
};
exports.projectBackgroundVideoPOST = (req, res, next) => {
  try {
    const { hexColor, time } = req.body;
    if (!hexColor) return errorResponse(error.parameterHexColorMissing, res);
    if (!time) return errorResponse(error.parameterTimeMissing, res);
    if (!timeManager.isValidDuration(time))
      return errorResponse(error.parameterTimeInvalid, res);
    if (!new RegExp(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/i).test(hexColor))
      return errorResponse(error.parameterHexColorInvalid, res);

    const projectDir = path.resolve(
      projectManager.getDirectory(req.params.projectID)
    );
    const { createCanvas } = require("canvas");
    const height = Number(getProfile(projectDir).resolution);
    const width = Math.trunc((height * 16) / 9);
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    context.fillStyle = hexColor;
    context.fillRect(0, 0, width, height);
    const buffer = canvas.toBuffer("image/png");

    const imageDir = `${projectDir}/tmp`;
    const imageFilePath = `${projectDir}/tmp/background.png`;

    if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
    fs.writeFileSync(imageFilePath, buffer);

    const fileID = nanoid(config.fileIDlength);
    const fileName = `background_${fileID}.mp4`;
    const videoFilePath = `${projectDir}/${fileID}.mp4`;
    const timeInSeconds = timeManager.toSeconds(time);
    const logOutputDir = path.join(projectDir, "blank_vid.log");
    fs.writeFileSync(logOutputDir, `totalTime=${timeInSeconds}\n`);

    exec(
      `ffmpeg -loop 1 -i ${imageFilePath} -c:v libx264 -t ${timeInSeconds} -pix_fmt yuv420p -vf scale=${width}:${height} ${videoFilePath} 2>> ${logOutputDir} && rm -rf ${imageDir} ${logOutputDir}`,
      (err) => {
        if (err) log.error(`exec error: ${err}`);
        else
          log.info(`Blank video creation "${req.params.projectID}" finished`);

        projectManager.load(req.params.projectID, "w").then(
          ([document, , release]) => {
            const node = document.createElement("producer");
            node.id = "producer" + fileID;
            node.innerHTML = `<property name="resource">${videoFilePath}</property>`;
            node.innerHTML += `<property name="musecut:mime_type">video/mp4</property>`;
            node.innerHTML += `<property name="musecut:name">${fileName}</property>`;
            node.innerHTML += `<property name="meta.media.0.codec.width">${width}</property>`;
            node.innerHTML += ` <property name="meta.media.0.codec.height">${height}</property>`;
            node.innerHTML += `<property name="length">${time}</property>`;
            const root = initializeRoot(document, res, release);
            root.prepend(node);
            projectManager
              .save(req.params.projectID, root.outerHTML, release)
              .then(
                () =>
                  res.json({
                    msg: "Created Background Video OK",
                  }),
                (err) => next(err)
              );
          },
          (err) => fileErr(err, res)
        );
      }
    );
  } catch (e) {
    console.log(e);
    errorResponse(error.couldNotCreateBlankVideo, res);
  }
};
exports.projectObjectPOST = (req, res, next) => {
  let { filename, mimeType, width, height, base64Image } = req.body;
  const fileID = nanoid(config.fileIDlength);
  const extension = path.extname(filename);
  let filepath = path.join(config.projectPath, req.params.projectID, fileID);
  if (extension.length > 1) filepath += extension;

  base64Image = base64Image.replace(/^data:image\/png;base64,/, "");
  try {
    fs.writeFileSync(filepath, base64Image, "base64");
    log.info(`Upload of "${filename}" started`);
    fileManager.getDuration(filepath, mimeType).then((length) => {
      projectManager.load(req.params.projectID, "w").then(
        ([document, , release]) => {
          const node = document.createElement("producer");
          node.id = "producer" + fileID;
          node.innerHTML = `<property name="resource">${path.resolve(
            filepath
          )}</property>`;
          node.innerHTML += `<property name="musecut:mime_type">${mimeType}</property>`;
          node.innerHTML += `<property name="musecut:name">${filename}</property>`;
          if (mimeType.includes("image")) {
            node.innerHTML += `<property name="meta.media.width">${width}</property>`;
            node.innerHTML += ` <property name="meta.media.height">${height}</property>`;
          }
          const root = initializeRoot(document, res, release);
          root.prepend(node);
          projectManager
            .save(req.params.projectID, root.outerHTML, release)
            .then(
              () =>
                res.json({
                  msg: `Upload of "${filename}" OK`,
                  resource_id: fileID,
                  resource_mime: mimeType,
                  length: length,
                  width: mimeType.includes("image") ? Number(width) : null,
                  height: mimeType.includes("image") ? Number(height) : null,
                }),
              (err) => next(err)
            );
        },
        (err) => fileErr(err, res)
      );
    });
  } catch (_) {
    errorResponse(error.projectNotFound404, res);
  }
};

exports.projectFileDELETE = (req, res, next) => {
  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const entries = document.querySelectorAll(
        `mlt>playlist>entry[producer="producer${req.params.fileID}"]`
      );
      if (entries.length > 0)
        return errorResponse(error.sourceInUse403, res, release);

      const producer = document.querySelector(
        `mlt>producer[id="producer${req.params.fileID}"]`
      );
      if (producer === null)
        return errorResponse(error.sourceNotFound404, res, release);

      const filename = mltxmlManager.getProperty(producer, "resource");
      if (filename === null) {
        release();
        return next(
          `Project "${req.params.projectID}", producer${req.params.fileID} misses resource tag`
        );
      }

      // Try to remove file, log failure
      fs.unlink(filename, (err) => {
        if (err) log.error(err);
      });

      producer.remove();

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Resource removed successfully",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectFilePUT = (req, res, next) => {
  // Required parameters: track
  if (!isset(req.body.track))
    return errorResponse(error.parameterTrackMissing400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const producer = document.getElementById(`producer${req.params.fileID}`);
      if (producer === null)
        return errorResponse(error.sourceNotFound404, res, release);

      const length = mltxmlManager.getProperty(producer, "length");
      const type = req.body.track.includes("audio") ? "audio" : "video";
      const allTracks = document.querySelectorAll(
        `playlist[id ^= "${type}track"]`
      );
      let lastEmptyTrack = null;
      let i = allTracks.length - 1;
      while (i > -1 && allTracks[i].children.length === 0) {
        lastEmptyTrack = allTracks[i];
        i--;
      }
      if (lastEmptyTrack === null) {
        const mainTractor = document.querySelector('mlt>tractor[id="main"]');
        const lastTrack = allTracks.item(allTracks.length - 1).id;
        const lastID = lastTrack.match(/^(.+)track(\d+)/);

        lastEmptyTrack = document.createElement("playlist");
        lastEmptyTrack.id = lastID[1] + "track" + (Number(lastID[2]) + 1);
        root.insertBefore(lastEmptyTrack, mainTractor);

        const newTrack = document.createElement("track");
        newTrack.setAttribute("producer", lastEmptyTrack.id);
        mainTractor
          .getElementsByTagName("multitrack")
          .item(0)
          .appendChild(newTrack);
      }

      const track = lastEmptyTrack;
      const newEntry = document.createElement("entry");
      newEntry.setAttribute("producer", "producer" + req.params.fileID);

      const mime = mltxmlManager.getProperty(producer, "musecut:mime_type");
      if (mime === null) {
        release();
        return next(
          `Project "${req.params.projectID}", producer "${req.params.fileID}" missing mime_type tag`
        );
      } else if (track.id === "videotrack0" && !mime.includes("video")) {
        return errorResponse(error.invalidFirstTrack, res, release);
      } else if (new RegExp(/^image\//).test(mime)) {
        if (new RegExp(/^videotrack\d+/).test(req.body.track) === false)
          return errorResponse(error.imgWrongTrack400, res, release);

        // Images needs duration parameter
        if (!timeManager.isValidDuration(req.body.duration))
          return errorResponse(error.parameterDurationMissing400, res, release);

        newEntry.setAttribute("in", req.body.in);
        newEntry.setAttribute("out", req.body.out);
      } else if (new RegExp(/^video\//).test(mime)) {
        if (length === null) {
          log.error(
            `Project "${req.params.projectID}", producer "${req.params.fileID}" missing length tag`
          );
          return errorResponse(error.videoDurationMissing400, res, release);
        }
        if (new RegExp(/^videotrack\d+/).test(req.body.track) === false)
          return errorResponse(error.videoWrongTrack400, res, release);
      } else if (new RegExp(/^audio\//).test(mime)) {
        if (length === null) {
          log.error(
            `Project "${req.params.projectID}", producer "${req.params.fileID}" missing length tag`
          );
          return errorResponse(error.audioDurationMissing400, res, release);
        }
        if (new RegExp(/^audiotrack\d+/).test(req.body.track) === false)
          return errorResponse(error.audioWrongTrack400, res, release);
      } else {
        // Reject everything except images, videos and audio
        return errorResponse(error.fileWrongTrack403, res, release);
      }

      track.appendChild(newEntry);

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Item added to timeline",
            trackId: track.getAttribute("id"),
            timeline: req.body.track,
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectFilterPOST = (req, res, next) => {
  // Required parameters: track, item, filter
  if (!isset(req.body.track, req.body.item, req.body.filter))
    return errorResponse(error.parameterFilterMissing400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const track = document.getElementById(req.body.track);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );

      const item = mltxmlManager.getItem(document, track, req.body.item);
      if (item === null)
        return errorResponse(
          error.itemNotFound404(req.body.item, req.body.track),
          res,
          release
        );

      let trackIndex;
      let newTractor;

      if (mltxmlManager.isSimpleNode(item)) {
        // Create playlist after last producer
        const newPlaylist = mltxmlManager.entryToPlaylist(item, document);

        // Create tractor before videotrack0
        newTractor = mltxmlManager.createTractor(document);
        newTractor.innerHTML = `<multitrack><track producer="${newPlaylist.id}"/></multitrack>`;

        trackIndex = 0;

        // Update track playlist
        item.removeAttribute("in");
        item.removeAttribute("out");
        item.setAttribute("producer", newTractor.id);
      } else {
        trackIndex = mltxmlManager.getTrackIndex(item);

        // Check if filter is already applied
        const filters =
          item.parentElement.parentElement.getElementsByTagName("filter");
        for (let filter of filters) {
          let filterName;
          if (filter.getAttribute("musecut:filter") !== null)
            filterName = filter.getAttribute("musecut:filter");
          else filterName = filter.getAttribute("mlt_service");
          if (
            filterName === req.body.filter &&
            filter.getAttribute("track") === trackIndex.toString()
          )
            return errorResponse(
              error.filterExists403(
                req.body.item,
                req.body.track,
                req.body.filter
              ),
              res,
              release
            );
        }

        newTractor = item.parentElement.parentElement;
      }

      // Add new filter
      const newFilter = document.createElement("filter");
      let filterName = req.body.filter;
      if (isset(config.mapFilterNames[req.body.filter])) {
        filterName = config.mapFilterNames[req.body.filter];
        const newPropery = document.createElement("property");
        newPropery.setAttribute("name", "musecut:filter");
        newPropery.innerHTML = req.body.filter;
        newFilter.appendChild(newPropery);
      }
      newFilter.setAttribute("mlt_service", filterName);
      newFilter.setAttribute("track", trackIndex.toString());
      newTractor.appendChild(newFilter);

      if (isset(req.body.params)) {
        for (let param in req.body.params) {
          const newPropery = document.createElement("property");
          newPropery.setAttribute("name", param);
          if (typeof req.body.params[param] === "number") {
            const value = req.body.params[param].toString();
            newPropery.innerHTML = value.replace(/\./, ",");
          } else {
            newPropery.innerHTML = req.body.params[param];
          }
          newFilter.appendChild(newPropery);
        }
      }

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Filter added",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectFilterDELETE = (req, res, next) => {
  // Required parameters: track, item, filter
  if (!isset(req.body.track, req.body.item, req.body.filter))
    return errorResponse(error.parameterFilterMissing400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const track = document.getElementById(req.body.track);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );

      const item = mltxmlManager.getItem(document, track, req.body.item);
      if (item === null)
        return errorResponse(
          error.itemNotFound404(req.body.item, req.body.track),
          res,
          release
        );

      let filterName = req.body.filter;
      if (isset(config.mapFilterNames[req.body.filter]))
        filterName = config.mapFilterNames[req.body.filter];

      const tractor = item.parentElement.parentElement;
      const trackIndex = mltxmlManager.getTrackIndex(item);
      const filters = tractor.getElementsByTagName("filter");
      let filter;
      for (let entry of filters) {
        if (
          entry.getAttribute("mlt_service") === filterName &&
          entry.getAttribute("track") === trackIndex.toString()
        ) {
          if (filterName === req.body.filter) {
            filter = entry;
            break;
          }
          // filterName is alias
          const alias = mltxmlManager.getProperty(entry, "musecut:filter");
          if (alias === req.body.filter) {
            filter = entry;
            break;
          }
        }
      }

      // Check if filter exists
      if (mltxmlManager.isSimpleNode(item) || filter === undefined)
        return errorResponse(
          error.filterNotFound404(
            req.body.item,
            req.body.track,
            req.body.filter
          ),
          res,
          release
        );

      filter.remove();

      // Tractor without filters, with one track
      if (
        !mltxmlManager.isUsedInTractor(item) &&
        tractor.getElementsByTagName("multitrack").item(0).childElementCount ===
          1
      ) {
        const playlist = document.getElementById(item.getAttribute("producer"));
        const entry = playlist.getElementsByTagName("entry").item(0);
        const tractorUsage = document.querySelector(
          `mlt>playlist>entry[producer="${tractor.id}"]`
        );
        tractorUsage.parentElement.insertBefore(entry, tractorUsage);

        tractorUsage.remove();
        tractor.remove();
        playlist.remove();
      }

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Filter removed",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectTransitionPOST = (req, res, next) => {
  // Required parameters: track, itemA, itemB, transition, duration
  if (
    !isset(
      req.body.track,
      req.body.itemA,
      req.body.itemB,
      req.body.transition,
      req.body.duration
    )
  )
    return errorResponse(error.parameterTransitionMissing400, res);

  if (
    !isNaturalNumber(req.body.itemA, req.body.itemB) ||
    !timeManager.isValidDuration(req.body.duration)
  )
    return errorResponse(error.parameterTransitionWrong400, res);

  if (req.body.itemB - req.body.itemA !== 1)
    return errorResponse(error.parameterTransitionOrder400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const track = document.getElementById(req.body.track);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );

      const itemA = mltxmlManager.getItem(document, track, req.body.itemA);
      const itemB = mltxmlManager.getItem(document, track, req.body.itemB);

      if (itemA === null)
        return errorResponse(
          error.itemNotFound404(req.body.itemA, req.body.track),
          res,
          release
        );
      if (itemB === null)
        return errorResponse(
          error.itemNotFound404(req.body.itemB, req.body.track),
          res,
          release
        );

      const durationA = mltxmlManager.getDuration(itemA, document);
      const durationB = mltxmlManager.getDuration(itemB, document);
      const waitBeforeTransition = timeManager.subDuration(
        durationA.out,
        req.body.duration
      );
      if (
        req.body.duration > durationA.time ||
        req.body.duration > durationB.time
      )
        return errorResponse(error.transitionTooLong400, res, release);

      // Simple + Simple
      if (
        mltxmlManager.isSimpleNode(itemA) &&
        mltxmlManager.isSimpleNode(itemB)
      ) {
        // Create playlist after last producer
        const newPlaylistA = mltxmlManager.entryToPlaylist(itemA, document);
        const newPlaylistB = mltxmlManager.entryToPlaylist(itemB, document);
        newPlaylistB.innerHTML =
          `<blank length="${waitBeforeTransition}" />` + newPlaylistB.innerHTML;

        // Create tractor before videotrack0
        const newTractor = mltxmlManager.createTractor(document);
        newTractor.innerHTML = `<multitrack><track producer="${newPlaylistA.id}"/><track producer="${newPlaylistB.id}"/></multitrack>`;
        newTractor.innerHTML += `<transition mlt_service="${req.body.transition}" in="${waitBeforeTransition}" out="${durationA.out}" a_track="0" b_track="1"/>`;

        // Update track
        itemA.removeAttribute("in");
        itemA.removeAttribute("out");
        itemA.setAttribute("producer", newTractor.id);
        itemB.remove();
      }
      // Complex + Simple
      else if (
        !mltxmlManager.isSimpleNode(itemA) &&
        mltxmlManager.isSimpleNode(itemB)
      ) {
        const newPlaylist = mltxmlManager.entryToPlaylist(itemB, document);
        mltxmlManager.appendPlaylistToMultitrack(
          itemA.parentElement,
          newPlaylist,
          req.body.duration,
          req.body.transition,
          document
        );
        itemB.remove();
      }
      // Complex + Complex
      else if (!mltxmlManager.isSimpleNode(itemA)) {
        const multitrackA = itemA.parentElement;
        const multitrackB = itemB.parentElement;
        if (multitrackA === multitrackB)
          return errorResponse(error.transitionExists403, res, release);

        let duration = req.body.duration;
        let transition = req.body.transition;
        let newTrackIndex = multitrackB.childElementCount;
        let oldTrackIndex = 0;
        const transitions =
          multitrackB.parentElement.getElementsByTagName("transition");
        const filters =
          multitrackB.parentElement.getElementsByTagName("filter");
        const tracksB = multitrackB.childNodes;
        for (let track of tracksB) {
          // Merge transition
          if (!isset(transition)) {
            for (let transitionElement of transitions) {
              if (
                transitionElement.getAttribute("b_track") ===
                oldTrackIndex.toString()
              ) {
                transition = transitionElement.getAttribute("mlt_service");
                duration = timeManager.subDuration(
                  transitionElement.getAttribute("out"),
                  transitionElement.getAttribute("in")
                );
              }
            }
          }

          // Merge filters
          for (let filter of filters) {
            if (filter.getAttribute("track") === oldTrackIndex.toString()) {
              filter.setAttribute("track", newTrackIndex.toString());
              multitrackA.parentElement.append(filter);
            }
          }

          let playlist = document.getElementById(
            track.getAttribute("producer")
          );
          mltxmlManager.appendPlaylistToMultitrack(
            multitrackA,
            playlist,
            duration,
            transition,
            document
          );

          transition = undefined;
          duration = undefined;
          newTrackIndex++;
          oldTrackIndex++;
        }
        const tractorB = multitrackB.parentElement;
        const tractorBentry = document.querySelector(
          `mlt>playlist>entry[producer="${tractorB.id}"]`
        );
        tractorBentry.remove();
        tractorB.remove();
      }
      // Simple + Complex
      else {
        const durationA = timeManager.subDuration(
          mltxmlManager.getDuration(itemA, document).time,
          req.body.duration
        );
        const multitrackB = itemB.parentElement;
        // Re-index transition, adjust IN/OUT timing
        const transitions =
          multitrackB.parentElement.getElementsByTagName("transition");
        for (let transition of transitions) {
          transition.setAttribute(
            "a_track",
            Number(transition.getAttribute("a_track")) + 1
          );
          transition.setAttribute(
            "b_track",
            Number(transition.getAttribute("b_track")) + 1
          );
          transition.setAttribute(
            "in",
            timeManager.addDuration(transition.getAttribute("in"), durationA)
          );
          transition.setAttribute(
            "out",
            timeManager.addDuration(transition.getAttribute("out"), durationA)
          );
        }
        // Re-index filters
        const filters =
          multitrackB.parentElement.getElementsByTagName("filter");
        for (let filter of filters) {
          filter.setAttribute(
            "track",
            Number(filter.getAttribute("track")) + 1
          );
        }
        // Adjust blank duration of tracks
        const tracks = multitrackB.childNodes;
        for (let track of tracks) {
          let playlist = document.getElementById(
            track.getAttribute("producer")
          );
          let blank = playlist.getElementsByTagName("blank").item(0);
          if (blank === null)
            playlist.innerHTML =
              `<blank length="${durationA}" />` + playlist.innerHTML;
          else
            blank.setAttribute(
              "length",
              timeManager.addDuration(blank.getAttribute("length"), durationA)
            );
        }
        // Prepend multitrack with item
        const newPlaylist = mltxmlManager.entryToPlaylist(itemA, document);
        multitrackB.innerHTML =
          `<track producer="${newPlaylist.id}" />` + multitrackB.innerHTML;
        // Add new transition
        multitrackB.parentElement.innerHTML += `<transition mlt_service="${
          req.body.transition
        }" in="${durationA}" out="${
          mltxmlManager.getDuration(itemA, document).time
        }" a_track="0" b_track="1" />`;

        itemA.remove();
      }

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Transition applied",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectItemDELETE = (req, res, next) => {
  // Required parameters: track, item
  console.log("item Delete");
  if (!isset(req.body.track, req.body.item))
    return errorResponse(error.parameterItemMissing400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const track = document.getElementById(req.body.track);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );

      let item = mltxmlManager.getItem(document, track, req.body.item);
      if (item === null)
        return errorResponse(
          error.itemNotFound404(req.body.item, req.body.track),
          res,
          release
        );

      let entry;
      let duration = mltxmlManager.getDuration(item, document).time;

      if (mltxmlManager.isSimpleNode(item)) {
        // It's simple element
        entry = item;
      } else {
        const tractor = item.parentElement.parentElement;
        if (tractor.getElementsByTagName("transition").length === 0) {
          // It's element with filter(s)
          const playlist = document.querySelector(
            `mlt>playlist[id="${item.getAttribute("producer")}"]`
          );
          entry = document.querySelector(
            `mlt>playlist>entry[producer="${tractor.id}"]`
          );

          tractor.remove();
          playlist.remove();
        } else {
          // It's element with transition(s)
          release();
          return; // TODO
        }
      }
      const prevEntry = entry.previousElementSibling;
      const nextEntry = entry.nextElementSibling;
      if (nextEntry !== null) {
        // Replace with blank
        if (prevEntry !== null && prevEntry.tagName === "blank") {
          duration = timeManager.addDuration(
            duration,
            prevEntry.getAttribute("length")
          );
          prevEntry.remove();
        }
        if (nextEntry.tagName === "blank") {
          duration = timeManager.addDuration(
            duration,
            nextEntry.getAttribute("length")
          );
          nextEntry.remove();
        }
        entry.outerHTML = `<blank length="${duration}"/>`;
      } else {
        // Last item, just delete
        if (prevEntry !== null && prevEntry.tagName === "blank")
          prevEntry.remove();
        entry.remove();
      }

      // removing relevant transition
      const transition = document.getElementById(`transition${req.body.track}`);
      if (transition) transition.remove();

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Item deleted",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectItemPUTmove = (req, res, next) => {
  // Required parameters: track, trackTarget, item, time
  if (
    !isset(req.body.track, req.body.trackTarget, req.body.item, req.body.time)
  )
    return errorResponse(error.parameterMoveMissing400, res);

  if (
    req.body.time !== "00:00:00,000" &&
    !timeManager.isValidDuration(req.body.time)
  )
    return errorResponse(error.parameterTimeWrong400, res);

  if (
    !(
      req.body.trackTarget.includes("videotrack") &&
      req.body.track.includes("videotrack")
    )
  ) {
    if (
      !(
        req.body.trackTarget.includes("audiotrack") &&
        req.body.track.includes("audiotrack")
      )
    )
      return errorResponse(error.tracksIncompatible400, res);
  }

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      if (!root || !document) return;
      const track = document.getElementById(req.body.track);
      const trackTarget = document.getElementById(req.body.trackTarget);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );
      if (trackTarget === null)
        return errorResponse(
          error.trackNotFound404(req.body.trackTarget),
          res,
          release
        );

      let item = mltxmlManager.getItem(document, track, req.body.item);
      if (item === null)
        return errorResponse(
          error.itemNotFound404(req.body.item, req.body.track),
          res,
          release
        );
      if (req.body.track === req.body.trackTarget) {
        if (!mltxmlManager.isSimpleNode(item)) {
          item = item.parentElement; // Get multitrack of complex item
        }

        const itemDuration = mltxmlManager.getDuration(item, document).time;

        if (!mltxmlManager.isSimpleNode(item)) {
          item = item.parentElement; // Get tractor of complex item
          item = document.querySelector(
            `mlt>playlist>entry[producer="${item.id}"]`
          ); // Get videotrack entry
        }

        // Add blank to old location
        const prevElement = item.previousElementSibling;
        const nextElement = item.nextElementSibling;
        let leftDuration = itemDuration;

        if (prevElement !== null && prevElement.tagName === "blank") {
          leftDuration = timeManager.addDuration(
            leftDuration,
            prevElement.getAttribute("length")
          );
          prevElement.remove();
        }
        if (nextElement !== null && nextElement.tagName === "blank") {
          leftDuration = timeManager.addDuration(
            leftDuration,
            nextElement.getAttribute("length")
          );
          nextElement.remove();
        }
        if (nextElement !== null) {
          const newBlank = document.createElement("blank");
          newBlank.setAttribute("length", leftDuration);
          track.insertBefore(newBlank, item);
        }
        item.remove();

        // Check free space
        if (
          mltxmlManager.getItemInRange(
            trackTarget,
            req.body.time,
            timeManager.addDuration(req.body.time, itemDuration),
            document
          ).length > 0
        )
          return errorResponse(error.moveNoSpace403, res, release);

        let targetElement = mltxmlManager.getItemAtTime(
          document,
          trackTarget,
          req.body.time
        );

        // Prepare target place
        if (targetElement.entries.length === 0) {
          // End of timeline
          if (targetElement.endTime < req.body.time) {
            const newBlank = document.createElement("blank");
            newBlank.setAttribute(
              "length",
              timeManager.subDuration(req.body.time, targetElement.endTime)
            );
            trackTarget.appendChild(newBlank);
          }
          trackTarget.appendChild(item);
        } else if (targetElement.entries.length === 1) {
          // Inside blank
          const afterLength = timeManager.subDuration(
            targetElement.endTime,
            timeManager.addDuration(req.body.time, itemDuration)
          );
          const afterBlank = document.createElement("blank");
          afterBlank.setAttribute("length", afterLength);

          const beforeLength = timeManager.subDuration(
            targetElement.entries[0].getAttribute("length"),
            timeManager.addDuration(afterLength, itemDuration)
          );
          const beforeBlank = document.createElement("blank");
          beforeBlank.setAttribute("length", beforeLength);

          if (beforeLength !== "00:00:00,000")
            trackTarget.insertBefore(beforeBlank, targetElement.entries[0]);
          trackTarget.insertBefore(item, targetElement.entries[0]);
          if (
            afterLength !== "00:00:00,000" &&
            targetElement.entries[0].nextElementSibling !== null
          )
            trackTarget.insertBefore(afterBlank, targetElement.entries[0]);
          targetElement.entries[0].remove();
        } else {
          // Between two elements
          const blank =
            targetElement.entries[0].tagName === "blank"
              ? targetElement.entries[0]
              : targetElement.entries[1];
          if (blank !== null) {
            blank.setAttribute(
              "length",
              timeManager.subDuration(
                blank.getAttribute("length"),
                itemDuration
              )
            );
            if (blank.getAttribute("length") === "00:00:00,000") blank.remove();
          }
          trackTarget.insertBefore(item, targetElement.entries[1]);
        }
      }
      // else {
      //   const trackEntry = document.querySelectorAll(
      //     `playlist[id=${req.body.track}]>entry`
      //   )[0];
      //   const trackTargetEntry = document.querySelectorAll(
      //     `playlist[id=${req.body.trackTarget}]>entry`
      //   )[0];
      //   const trackProducer = trackEntry.getAttribute("producer");
      //   const trackTargetProducer = trackTargetEntry.getAttribute("producer");
      //   const mimeTrack = document.querySelector(
      //     `producer[id=${trackProducer}]>property[name="musecut:mime_type"]`
      //   ).textContent;
      //   const mimeTrackTarget = document.querySelector(
      //     `producer[id=${trackTargetProducer}]>property[name="musecut:mime_type"]`
      //   ).textContent;
      //   const trackFileType = mimeTrack.substring(0, mimeTrack.indexOf("/"));
      //   const trackTargetFileType = mimeTrackTarget.substring(
      //     0,
      //     mimeTrackTarget.indexOf("/")
      //   );
      //   if (trackFileType === trackTargetFileType) {
      //     trackTargetEntry.setAttribute(
      //       "producer",
      //       trackEntry.getAttribute("producer")
      //     );
      //     trackEntry.setAttribute("producer", trackTargetProducer);
      //     const trackGeometry = document.querySelector(
      //       `transition[id=transition${req.body.track}]>property[name=geometry]`
      //     );
      //     const trackTargetGeometry = document.querySelector(
      //       `transition[id=transition${req.body.trackTarget}]>property[name=geometry]`
      //     );
      //     if (trackFileType === "image") {
      //       const temp = trackGeometry.innerHTML;
      //       trackGeometry.innerHTML = trackTargetGeometry.textContent;
      //       trackTargetGeometry.innerHTML = temp;
      //     }
      //   }
      // }
      //checking if the object is an image, and then allowing
      //duration manipulation. i.e. the object can be dragged
      //to any length in the timeline
      const entry = document.querySelector(
        `playlist[id="${req.body.track}"]>entry[producer="producer${req.body.resource}"]`
      );
      if (req.body.duration !== null && entry) {
        entry.setAttribute("in", req.body.time);
        entry.setAttribute("out", req.body.endTime);
        let transition = document.querySelector(
          `transition[id="transition${req.body.transitionId}"]`
        );
        const multitrack = document.querySelector("multitrack");

        if (transition !== null) {
          transition.setAttribute("in", req.body.time);
          transition.setAttribute("out", req.body.endTime);
          const b_index = Number(
            transition.querySelector(`property[name="b_track"]`).textContent
          );
          const a_index = getAIndex(
            multitrack,
            b_index,
            req.body.track,
            document
          );
          if (a_index === -1) {
            return res.json({
              msg: "illegal move",
            });
          }
          transition.querySelector(`property[name="a_track"]`).textContent =
            String(a_index);
        } else {
          const tractor = document.querySelector("#main");

          //getting the length of the main track
          const firstTrackId =
            multitrack.childNodes[0].getAttribute("producer"); //getting the producer id of the first "track" tag
          const playlist = document.getElementById(firstTrackId); //getting the producer (playlist) by id
          const producerId = playlist.childNodes[0].getAttribute("producer"); //getting first "entry" tag's producer attribute
          const trackLength = document.querySelector(
            `producer[id="${producerId}"]>property[name="length"]`
          ).innerHTML; //getting the source length of producer
          tractor.setAttribute("out", trackLength); //setting it to tractor's out parameter
          const width = Number(
            document.querySelector(
              `producer[id="producer${req.body.resource}"]>property[name="meta.media.width"]`
            ).innerHTML
          );
          const height = Number(
            document.querySelector(
              `producer[id="producer${req.body.resource}"]>property[name="meta.media.height"]`
            ).innerHTML
          );

          const scaleX = 25;
          const scaleY = scaleX * (height / width);
          const posX = 0;
          const posY = 0;

          const track = document.querySelector(
            `track[producer="${req.body.track}"]`
          );
          const b_index = [...multitrack.childNodes].indexOf(track);
          const a_index = getAIndex(
            multitrack,
            b_index,
            req.body.track,
            document
          );
          if (a_index === -1) {
            return res.json({
              msg: "illegal move",
            });
          }
          transition = document.createElement("transition");
          transition.setAttribute("id", `transition${req.body.transitionId}`);
          transition.setAttribute("in", req.body.time);
          transition.setAttribute("out", req.body.endTime);

          transition.innerHTML = `<property name = "a_track">${a_index}</property>`;
          transition.innerHTML += `<property name = "b_track">${b_index}</property>`;
          transition.innerHTML += `<property name = "mlt_service">composite</property>`;
          transition.innerHTML += `<property name = "geometry">${posX}%/${posY}%:${scaleX}%x${scaleY}%</property>`;
          tractor.appendChild(transition);
        }
      }

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Item moved",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectSyncWaterMark = (req, res, next) => {
  let { x, y, width, height } = req.body;
  if (x >= 100 || y >= 100 || width >= 100 || height >= 100) {
    x = x > 100 ? 100 : x;
    y = y > 100 ? 100 : y;
    width = width > 100 ? 90 : width;
    height = width > 100 ? 90 : height;
  }
  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const node = document.querySelector(
        `transition[id="transition${req.body.transitionId}"]>property[name="geometry"]`
      );
      node.innerHTML = `${x}%/${y}%:${width}%x${height}%`;
      const root = initializeRoot(document, res, release);
      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () => res.status(200).json({}),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};
exports.projectItemPUTsplit = (req, res, next) => {
  // Required parameters: track, item, time
  if (!isset(req.body.track, req.body.item, req.body.time))
    return errorResponse(error.parameterSplitMissing400, res);

  if (!timeManager.isValidDuration(req.body.time))
    return errorResponse(error.parameterTimeWrong400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const track = document.getElementById(req.body.track);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.body.track),
          res,
          release
        );

      let item = mltxmlManager.getItem(document, track, req.body.item);
      if (item === null)
        return errorResponse(
          error.itemNotFound404(req.body.item, req.body.track),
          res,
          release
        );

      const time = mltxmlManager.getDuration(item, document);

      if (req.body.time >= time.time)
        return errorResponse(
          error.parameterTimeRange400(time.time),
          res,
          release
        );

      let splitTime = req.body.time;
      if (time.in !== "00:00:00,000")
        splitTime = timeManager.addDuration(time.in, req.body.time);

      if (mltxmlManager.isSimpleNode(item)) {
        // It's simple element
        const itemCopy = item.cloneNode();
        track.insertBefore(itemCopy, item);
        itemCopy.setAttribute("out", splitTime);
        item.setAttribute("in", splitTime);
      } else {
        const tractor = item.parentElement.parentElement;
        if (tractor.getElementsByTagName("transition").length === 0) {
          // It's element with filter(s)
          const trackItem = document
            .querySelector(
              `mlt > playlist[id = "${item.getAttribute("producer")}"]`
            )
            .getElementsByTagName("entry")[0];
          const trackItemCopy = trackItem.cloneNode();
          trackItemCopy.setAttribute("out", splitTime);
          trackItem.setAttribute("in", splitTime);

          const playlistCopy = mltxmlManager.entryToPlaylist(
            trackItemCopy,
            document
          );

          const tractorCopy = mltxmlManager.createTractor(document);
          tractorCopy.innerHTML = `< multitrack > <track producer="${playlistCopy.id}" /></multitrack > `;
          const filters = tractor.getElementsByTagName("filter");
          for (let filter of filters) {
            tractorCopy.innerHTML += filter.outerHTML;
          }

          const videotrackRefCopy = document.createElement("entry");
          videotrackRefCopy.setAttribute("producer", tractorCopy.id);
          const videotrackRef = document.querySelector(
            `mlt > playlist > entry[producer = "${tractor.id}"]`
          );
          track.insertBefore(videotrackRefCopy, videotrackRef);
        } else {
          // It's element with transition(s)
          release();
          return; // TODO
        }
      }

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Item split",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectTrackPOST = (req, res, next) => {
  // Required parameters: type
  if (
    !isset(req.body.type) ||
    (req.body.type !== "video" && req.body.type !== "audio")
  )
    return errorResponse(error.parameterTrackTypeMissing400, res);

  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      const mainTractor = document.querySelector('mlt>tractor[id="main"]');

      const tracks = document.querySelectorAll(
        `mlt > playlist[id ^= "${req.body.type}track"]`
      );
      const lastTrack = tracks.item(tracks.length - 1).id;
      const lastID = lastTrack.match(/^(.+)track(\d+)/);

      const newTractor = document.createElement("playlist");
      newTractor.id = lastID[1] + "track" + (Number(lastID[2]) + 1);
      root.insertBefore(newTractor, mainTractor);

      const newTrack = document.createElement("track");
      newTrack.setAttribute("producer", newTractor.id);
      mainTractor
        .getElementsByTagName("multitrack")
        .item(0)
        .appendChild(newTrack);

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Track added",
            track: newTractor.id,
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

exports.projectTrackDELETE = (req, res, next) => {
  projectManager.load(req.params.projectID, "w").then(
    ([document, , release]) => {
      const root = initializeRoot(document, res, release);
      let trackID = req.params.trackID;

      const track = document.getElementById(req.params.trackID);
      if (track === null)
        return errorResponse(
          error.trackNotFound404(req.params.trackID),
          res,
          release
        );
      // Removing default track
      if (
        req.params.trackID === "videotrack0" ||
        req.params.trackID === "audiotrack0"
      ) {
        const type = req.params.trackID.startsWith("v") //written 'v' instead of video. Just saving some time.
          ? "videotrack"
          : "audiotrack";

        let nextElement = track;
        while (true) {
          nextElement = nextElement.nextElementSibling;
          if (nextElement === null || nextElement.id.includes(type)) break;
        }
        if (nextElement === null)
          return errorResponse(error.trackDefaultDel403, res, release);

        trackID = nextElement.id;
        nextElement.setAttribute("id", type + 0); // Rename next element to videotrack0/audiotrack0
      }

      const trackRef = document.querySelector(
        `mlt > tractor > multitrack > track[producer = "${trackID}"]`
      );
      trackRef.remove();

      // removing relevant transition
      const transition = document.getElementById(`transition${trackID}`);
      if (transition !== null) transition.remove();

      // removing track
      track.remove();

      projectManager.save(req.params.projectID, root.outerHTML, release).then(
        () =>
          res.json({
            msg: "Track deleted",
          }),
        (err) => next(err)
      );
    },
    (err) => fileErr(err, res)
  );
};

const buildProjectJson = async (projectID) => {
  const [document, fd, release] = await projectManager.load(projectID, "r");
  // Resources
  const resources = {};
  const producerNodes = document.getElementsByTagName("producer");
  for (let producer of producerNodes) {
    let id = producer.id.replace(/^producer/, "");
    let resource = {
      id: id,
      duration: null,
      mime: null,
      name: null,
      width: null,
      height: null,
    };
    const properties = producer.getElementsByTagName("property");
    for (let property of properties) {
      switch (property.getAttribute("name")) {
        case "musecut:mime_type":
          resource.mime = property.innerHTML;
          break;
        case "length":
          resource.duration = property.innerHTML;
          break;
        case "meta.media.width":
          resource.width = Number(property.innerHTML);
          break;
        case "meta.media.0.codec.width":
          resource.width = Number(property.innerHTML);
          break;
        case "meta.media.height":
          resource.height = Number(property.innerHTML);
          break;
        case "meta.media.0.codec.height":
          resource.height = Number(property.innerHTML);
          break;
        case "musecut:name":
          resource.name = property.innerHTML;
          break;
        case "resource":
          resource.resource = property.innerHTML;
      }
    }
    resources[id] = resource;
  }

  // Timeline
  const timeline = {
    audio: [],
    video: [],
  };
  const tracks = document.querySelectorAll('mlt>playlist[id*="track"]');
  let geometry;
  for (let track of tracks) {
    geometry = null;
    const trackEntry = {
      id: track.id,
      items: [],
    };
    const geometryNode = document.querySelector(
      `transition[id="transition${track.getAttribute(
        "id"
      )}"]>property[name="geometry"]`
    );
    if (geometryNode) {
      const [pos, dims] = geometryNode.textContent.trim().split(":");
      let [x, y] = pos.replaceAll("%", "").trim().split("/");
      let [width, height] = dims.replaceAll("%", "").trim().split("x");
      const a_track_index = Number(
        document.querySelector(
          `transition[id="transition${track.getAttribute(
            "id"
          )}"]>property[name="a_track"]`
        ).innerHTML
      );

      const playlistId = document
        .querySelectorAll(`multitrack>track`)
        [a_track_index].getAttribute("producer");

      const producerId = document
        .querySelectorAll(`playlist[id="${playlistId}"]>entry`)[0]
        .getAttribute("producer");

      const videoWidth = Number(
        document.querySelector(
          `producer[id="${producerId}"]>property[name="meta.media.0.codec.width"]`
        ).innerHTML
      );
      const videoHeight = Number(
        document.querySelector(
          `producer[id="${producerId}"]>property[name="meta.media.0.codec.height"`
        ).innerHTML
      );
      geometry = {
        x: Number(x),
        y: Number(y),
        width: Number(width),
        height: Number(height),
        videoWidth: videoWidth,
        videoHeight: videoHeight,
      };
    }
    const entries = track.childNodes;
    let time = "00:00:00,000";
    for (let entry of entries) {
      if (entry.tagName === "blank") {
        time = timeManager.addDuration(entry.getAttribute("length"), time);
      }
      // Simple entry
      else if (new RegExp(/^producer/).test(entry.getAttribute("producer"))) {
        const duration = mltxmlManager.getDuration(entry, document);
        const startTime = time;
        time = timeManager.addDuration(duration.time, time);
        trackEntry.items.push({
          resource: entry.getAttribute("producer").replace(/^producer/, ""),
          in: duration.in,
          out: duration.out,
          start: startTime,
          end: time,
          filters: [],
          transitionTo: null,
          transitionFrom: null,
          transitionId: `${track.getAttribute("id")}`,
          geometry: geometry,
        });
      }
      // Tractor with playlist
      else {
        const tractor = document.getElementById(entry.getAttribute("producer"));
        const tracks = tractor
          .getElementsByTagName("multitrack")
          .item(0).childNodes;
        const trackFilters = tractor.getElementsByTagName("filter");
        let index = 0;
        for (let track of tracks) {
          const playlist = document.getElementById(
            track.getAttribute("producer")
          );
          const playlistEntry = playlist.getElementsByTagName("entry").item(0);
          const duration = mltxmlManager.getDuration(playlistEntry, document);
          const startTime = time;
          time = timeManager.addDuration(duration.time, time);
          let filters = [];
          for (let trackFilter of trackFilters) {
            if (trackFilter.getAttribute("track") === index.toString()) {
              let serviceAlias = null;
              for (let param of trackFilter.childNodes) {
                if (param.getAttribute("name") === "musecut:filter") {
                  serviceAlias = param.innerHTML;
                }
              }
              if (serviceAlias !== null) {
                filters.push({
                  service: serviceAlias,
                });
              } else {
                filters.push({
                  service: trackFilter.getAttribute("mlt_service"),
                });
              }
            }
          }

          trackEntry.items.push({
            resource: playlistEntry
              .getAttribute("producer")
              .replace(/^producer/, ""),
            in: duration.in,
            out: duration.out,
            start: startTime,
            end: time,
            filters: filters,
            transitionTo: null,
            transitionFrom: null,
            geometry: geometry,
            transitionId: `${track.getAttribute("id")}`,
          });
          index++;
        }
      }
    }
    trackEntry["duration"] = time;

    if (new RegExp(/^videotrack\d+/).test(track.id)) {
      timeline.video.push(trackEntry);
    } else {
      timeline.audio.push(trackEntry);
    }
  }
  // Processing
  const projectPath = projectManager.getDirectory(projectID);
  let processing = await new Promise((resolve) => {
    fs.access(
      path.join(projectPath, "stderr.log"),
      fs.constants.F_OK,
      (err) => {
        if (err) resolve(null);
        else {
          // project is processing right now
          exec(
            `cd ${projectPath};cat stderr.log|grep -o "percentage:[ ]*[0-9]*"|grep -o "[0-9]*"|tail -1`,
            (error, stdout) => {
              if (error) {
                log.error(error);
                resolve(null);
              }
              //console.log(stdout);
              const parsed = Number.parseInt(stdout.trim());
              resolve(!Number.isNaN(parsed) ? parsed : null);
            }
          );
        }
      }
    );
  });

  if (!processing)
    processing = await new Promise((resolve) => {
      const logOutputDir = path.join(projectPath, "blank_vid.log");
      fs.access(logOutputDir, fs.constants.F_OK, (err) => {
        if (err) resolve(null);
        else {
          // project is processing right now
          exec(
            `OUTPUT=$(var=$(cat ${logOutputDir}|grep -o  "[0-9]\\{2\\}:[0-9]\\{2\\}:[0-9]\\{2\\}.[0-9]\\{2\\}\\|totalTime=[0-9]*");echo "$var"|head -1|grep -o "[0-9]*"|tee;echo "$var"|tail -1); echo "$OUTPUT"`,
            (error, stdout) => {
              if (error) {
                log.error(error);
                resolve(null);
              }
              const output = stdout.split("\n");
              const totalTime = Number(output[0].trim());
              const doneTime = timeManager.toSeconds(
                `${output[1].replace(".", ",")}0`.trim()
              );
              const percentage = Math.ceil((doneTime * 100) / totalTime);
              resolve(!Number.isNaN(percentage) ? percentage : null);
            }
          );
        }
      });
    });
  const projectData = {
    project: projectID,
    resources: resources,
    timeline: timeline,
    processing: processing,
  };
  return projectData;
};
function getAIndex(multitrack, b_index, track, document) {
  for (let i = b_index; i > -1; i--) {
    const playlistId = multitrack.children[i].getAttribute("producer");
    if (playlistId.includes("video")) {
      let aTrackStart = "00:00:00,000";
      const producer = document
        .querySelector(`playlist[id="${playlistId}"]>entry`)
        .getAttribute("producer");
      const aTrackLengthElem = document
        .getElementById(producer)
        .querySelector(`property[name="length"]`);
      const aTrackLength = aTrackLengthElem
        ? aTrackLengthElem.textContent
        : null;
      // if aTrackLength is null then the aTrack is an image...
      if (aTrackLength) {
        const blank = document.querySelector(
          `playlist[id="${playlistId}"]>blank`
        );
        if (blank) aTrackStart = blank.getAttribute("length");
        const aTrackEnd = timeManager.addDuration(aTrackLength, aTrackStart);
        const bTrackStart = document
          .querySelector(`playlist[id="${track}"]>entry`)
          .getAttribute("in");
        const bTrackEnd = document
          .querySelector(`playlist[id="${track}"]>entry`)
          .getAttribute("out");
        const inBetween =
          timeManager.timeDifference(bTrackStart, aTrackStart) >= 0 &&
          timeManager.timeDifference(aTrackEnd, bTrackEnd) >= 0;
        if (inBetween) return i;
      }
    }
  }
  // Default a_index is the first track
  return -1;
}
function initializeRoot(document, res, release) {
  let root = null;
  if (document && document.getElementsByTagName("mlt")) {
    root = document.getElementsByTagName("mlt").item(0);
  } else {
    return null;
  }
  return root;
}

function saveAsJson(projectData) {
  const projectJsonPath = `${projectManager.getDirectory(
    projectData["project"]
  )}/project.json`;

  if (fs.existsSync(projectJsonPath)) {
    const fileData = fs.readFileSync(projectJsonPath);
    const oldProjectData = JSON.parse(fileData.toString());
    if (oldProjectData["resolution"]) {
      projectData["resolution"] = oldProjectData["resolution"];
    }
  }
  // clearing some usesless(for reconstruction to xml) keys
  if (projectData["timeline"]["video"]) {
    projectData["timeline"]["video"].forEach((element) => {
      delete element["duration"];
      const items = element["items"][0];
      if (items) {
        delete items["in"];
        delete items["out"];
        delete items["filters"];
        delete items["transitionTo"];
        delete items["transitionFrom"];
      }
    });
  }
  if (projectData["timeline"]["audio"]) {
    projectData["timeline"]["audio"].forEach((element) => {
      delete element["duration"];
      const items = element["items"][0];
      if (items) {
        delete items["in"];
        delete items["out"];
        delete items["filters"];
        delete items["transitionTo"];
        delete items["transitionFrom"];
      }
    });
  }
  fs.writeFileSync(`${projectJsonPath}`, JSON.stringify(projectData, null, 2));
}
async function addProject(projectId, userId, projectName) {
  const project = await Project.create({ _id: projectId, name: projectName });
  await User.findByIdAndUpdate(userId, {
    $push: { projects: projectId },
  });
  return project;
}
function jsonToXml(project) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE mlt SYSTEM "https://raw.githubusercontent.com/mltframework/mlt/master/src/modules/xml/mlt-xml.dtd"><mlt>`;
  let resourceIds = Object.keys(project["resources"]);
  resourceIds.forEach((resouceKey) => {
    let resource = project["resources"][resouceKey];
    let properties = Object.keys(resource);
    xml += `<producer id="producer${resource["id"]}">`;
    for (let property of properties) {
      switch (property) {
        case "duration":
          if (resource["duration"])
            xml += `<property name="musecut:length">${resource["duration"]}</property>`;
          break;
        case "mime":
          xml += `<property name="musecut:mime_type">${resource["mime"]}</property>`;
          break;
        case "name":
          xml += `<property name="musecut:name">${resource["name"]}</property>`;
          break;
        case "width":
          if (resource["width"]) {
            if (resource["mime"].includes("video")) {
              xml += `<property name="meta.media.0.codec.width">${resource["width"]}</property>`;
            } else {
              xml += `<property name="meta.media.width">${resource["width"]}</property>`;
            }
          }
          break;
        case "height":
          if (resource["height"]) {
            if (resource["mime"].includes("video")) {
              xml += `<property name="meta.media.0.codec.height">${resource["height"]}</property>`;
            } else {
              xml += `<property name="meta.media.width">${resource["height"]}</property>`;
            }
          }
          break;
        case "resource":
          xml += `<property name="resource">${resource["resource"]}</property>`;
      }
    }
    xml += `</producer>`;
  });
  let transitions = "";
  let multitrack = "";
  let tractorOut = "";
  const videoTracks = project["timeline"]["video"];
  videoTracks.forEach((element, index) => {
    xml += `<playlist id="${element["id"]}">`;
    multitrack += `<track producer="${element["id"]}"/>`;
    if (element["items"].length > 0) {
      let entry = element["items"][0];
      if (entry["start"] !== "00:00:00,000") {
        xml += `<blank length="${entry["start"]}"/>`;
      }
      xml += `<entry producer="producer${entry["resource"]}" in="${entry["start"]}" out="${entry["end"]}"/>`;
      //playlist must have main video as first track
      if (index == 0) tractorOut = entry["end"];
      if (entry["geometry"]) {
        transitions += `<transition id="transition${element["id"]}" in="${entry["start"]}" out="${entry["end"]}">`;
        transitions += `<property name="a_track">0</property>`;
        transitions += `<property name="b_track">${index}</property><property name="mlt_service">composite</property>`;
        transitions += `<property name="geometry">${entry["geometry"]["x"]}%/${entry["geometry"]["y"]}%:${entry["geometry"]["width"]}%x${entry["geometry"]["height"]}%</property></transition>`;
      }
    }
    xml += "</playlist>";
  });
  const audioTracks = project["timeline"]["audio"];
  audioTracks.forEach((element, index) => {
    xml += `<playlist id="${element["id"]}">`;
    multitrack += `<track producer="${element["id"]}"/>`;
    if (element["items"].length > 0) {
      const audioItems = element["items"];
      audioItems.forEach((entry) => {
        if (entry["start"] !== "00:00:00,000") {
          xml += `<blank length="${entry["start"]}"/>`;
        }
        xml += `<entry producer="producer${entry["resource"]}"/>`;
      });
    }
    xml += "</playlist>";
  });
  xml += `<tractor id="main" out="${tractorOut}">`;
  xml += `<multitrack>${multitrack}</multitrack>${transitions}</tractor></mlt>`;
  fs.writeFileSync(
    `${projectManager.getDirectory(project["project"])}/test.mlt`,
    xml
  );
}
function jsonToXmlImport(data, projectDir) {
  let producers = "";
  let playlists = "";
  let multitracks = "";
  let transitions = "";
  let video = data["video"];
  let audio = data["audio"];
  video.forEach((element, index) => {
    const filepath = path.join(projectDir, element.name);
    const isImage = element.mime.includes("image");

    producers +=
      `<producer id="producer${element.name}">` +
      `<property name="resource">${filepath}</property>` +
      `<property name="musecut:mime_type">${element.mime}</property>` +
      `<property name="musecut:name">${element.name}</property>`;
    if (isImage) {
      producers +=
        `<property name="meta.media.width">${element.width}</property>` +
        `<property name="meta.media.height">${element.height}</property>`;
    } else {
      producers +=
        `<property name="meta.media.0.codec.width">${element.videoWidth}</property>` +
        `<property name="meta.media.0.codec.height">${element.videoHeight}</property>` +
        `<property name="length">${element.duration}</property>`;
    }
    producers += "</producer>";
    playlists += `<playlist id="videotrack${index}">`;
    if (element.time.start !== "00:00:00,000") {
      playlists += `<blank length="${element.time.start}"/>`;
    }
    if (isImage) {
      playlists += `<entry producer="producer${element.name}" in="${element.time.start}" out="${element.time.end}"/></playlist>`;
    } else {
      playlists += `<entry producer="producer${element.name}"/></playlist>`;
    }
    multitracks += `<track producer="videotrack${index}"/>`;
    if (element.geometry) {
      transitions += `<transition id="transitionvideotrack${index}" in="${element.time.start}" out="${element.time.end}">`;
      let a_track_index = 0;
      for (let i = 0; i < video.length; i++) {
        if (element.video === video[i].name) {
          a_track_index = i;
          break;
        }
      }
      transitions += `<property name="a_track">${a_track_index}</property>`;
      transitions += `<property name="b_track">${index}</property><property name="mlt_service">composite</property>`;
      transitions += `<property name="geometry">${element.geometry.x}%/${element.geometry.y}%:${element.geometry.width}%x${element.geometry.height}%</property></transition>`;
    }
  });
  audio.forEach((element, index) => {
    const filepath = path.join(projectDir, element.name);
    producers +=
      `<producer id="producer${element.name}">` +
      `<property name="resource">${filepath}</property>` +
      `<property name="musecut:mime_type">${element.mime}</property>` +
      `<property name="musecut:name">${element.name}</property>` +
      `<property name="length">${element.duration}</property></producer>`;
    playlists += `<playlist id="audiotrack${index}">`;
    if (element.time.start !== "00:00:00,000") {
      playlists += `<blank length="${element.time.start}"/>`;
    }
    playlists += `<entry producer="producer${element.name}"/></playlist>`;
    multitracks += `<track producer="audiotrack${index}"/>`;
  });
  let tractor = `<tractor id="main"><multitrack>${multitracks}</multitrack>${transitions}</tractor>`;
  let xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE mlt SYSTEM "https://raw.githubusercontent.com/mltframework/mlt/master/src/modules/xml/mlt-xml.dtd">` +
    `<mlt>${producers} ${playlists} ${tractor}</mlt>`;
  return xml;
}
function populateImportJson(metas, projectJson) {
  for (let i = 0; i < projectJson.audio.length; i++) {
    let filename = projectJson["audio"][i]["name"];
    let keys = Object.keys(metas[filename]);
    keys.forEach((key) => {
      projectJson["audio"][i][key] = metas[filename][key];
    });
  }
  for (let i = 0; i < projectJson.video.length; i++) {
    let filename = projectJson["video"][i]["name"];
    let keys = Object.keys(metas[filename]);
    keys.forEach((key) => {
      projectJson["video"][i][key] = metas[filename][key];
    });
  }
  return projectJson;
}
function getProjectName(name, projects) {
  let i = 0;
  let count = 1;
  const mainName = name;
  while (i < projects.length) {
    if (projects[i].name === name) {
      name = `${mainName} (${count})`;
      count++;
    }
    i++;
  }
  return name;
}
function getProfile(dir) {
  try {
    const profile = JSON.parse(fs.readFileSync(`${dir}/project.json`));
    return profile;
  } catch (error) {
    return error;
  }
}
/**
 * Handle error while opening project directory.
 *
 * @param err
 * @param res
 */
function fileErr(err, res) {
  if (err.code === "ENOENT") errorResponse(error.projectNotFound404, res);
  else {
    log.error(err.stack);
    console.log(err.stack);
    errorResponse(error.projectFailedOpen500, res);
  }
}

/**
 * Send error response to a client
 *
 * @param {Object} error Object containing code, err, msg
 * @param {Object} res Express response object.
 * @param {function} [destructor] Optional function called before sending error to a client
 */
function errorResponse(error, res, destructor = null) {
  if (destructor !== null) destructor();

  res.status(error.code).json({
    err: error.err,
    msg: error.msg,
  });
}
