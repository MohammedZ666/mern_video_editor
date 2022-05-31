/**
 * @file Express routing service
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

const server = require("express");
const router = server.Router();

// Require controller modules.
const mainController = require("./controllers/mainController");
const apiController = require("./controllers/apiController");
const authController = require("./controllers/authController");
const errorController = require("./controllers/errorController");
const { requireAuth } = require("./middleware/authMiddleware");

// Homepage route
router.get(["/", "/login", "/register", "/import"], mainController.index);
router.get("/create", mainController.create);
router.get("/project/:projectID", mainController.project);
router.get("/project/:projectID/output.mp4", mainController.finished);
router.get("/project/:projectID/file/:fileID", mainController.resource);

// API route
router.all("/api", apiController.default);

router.post("/api/project-import", requireAuth, apiController.projectImport);

router.post("/api/project", requireAuth, apiController.projectPOST);

router.get("/api/project/:projectID", apiController.projectGET);

router.put("/api/project/:projectID", apiController.projectPUT);

router.post("/api/project/:projectID/file", apiController.projectFilePOST);

router.post("/api/project/:projectID/object", apiController.projectObjectPOST);

router.post(
  "/api/project/:projectID/blank-video",
  apiController.projectBackgroundVideoPOST
);

router.delete(
  "/api/project/:projectID/file/:fileID",
  apiController.projectFileDELETE
);

router.put(
  "/api/project/:projectID/file/:fileID",
  apiController.projectFilePUT
);

router.post("/api/project/:projectID/filter", apiController.projectFilterPOST);

router.delete(
  "/api/project/:projectID/filter",
  apiController.projectFilterDELETE
);

router.post(
  "/api/project/:projectID/transition",
  apiController.projectTransitionPOST
);

router.delete("/api/project/:projectID/item", apiController.projectItemDELETE);

router.put(
  "/api/project/:projectID/item/move",
  apiController.projectItemPUTmove
);

router.put(
  "/api/project/:projectID/item/split",
  apiController.projectItemPUTsplit
);

router.post("/api/project/:projectID/track", apiController.projectTrackPOST);

router.post(
  "/api/project/:projectID/syncWatermark",
  apiController.projectSyncWaterMark
);

router.delete(
  "/api/project/:projectID/track/:trackID",
  apiController.projectTrackDELETE
);

//Auth routes
router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/user", requireAuth, authController.get_user);

// Error handling
router.use(errorController.default);

module.exports = router;
