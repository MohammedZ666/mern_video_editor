/**
 * @file Error messages cs-CZ
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

const errors = {
  get couldNotCreateBlankVideo() {
    return {
      code: 400,
      err: "Blank video createtion failed.",
      msg: "Please retry",
    };
  },
  get parameterHexColorMissing() {
    return {
      code: 400,
      err: "Missing parameter",
      msg: 'Missing required "Hex color" parameter',
    };
  },
  get parameterTimeMissing() {
    return {
      code: 400,
      err: "Missing parameter",
      msg: 'Missing required "Time" parameter',
    };
  },
  get parameterTimeInvalid() {
    return {
      code: 400,
      err: "Time parameter invalid",
      msg: "Time parameter must be in the format 00:00:00,000",
    };
  },
  get parameterHexColorInvalid() {
    return {
      code: 400,
      err: "Hex color parameter invalid",
      msg: "Please provide a valid hexcolor value preceded by a '#'",
    };
  },
  get uploadMissingFile400() {
    return {
      code: 400,
      err: "Missing file.",
      msg: "The request body must contain a file to upload.",
    };
  },
  get parameterTrackMissing400() {
    return {
      code: 400,
      err: "Missing parameters.",
      msgid: 'Missing required "track" parameter',
    };
  },
  get parameterTrackTypeMissing400() {
    return {
      code: 400,
      err: "Wrong parameter.",
      msgid:
        'Type parameter is missing or has a value other than "video" or "audio".',
    };
  },
  get parameterItemMissing400() {
    return {
      code: 400,
      err: "Missing parameters",
      msg: "The track or item parameter is missing.",
    };
  },
  get parameterDurationMissing400() {
    return {
      code: 400,
      err: "Missing duration.",
      msg: "To insert an image on the timeline, you must enter a duration in the format 00: 00: 00,000.",
    };
  },
  get parameterSplitMissing400() {
    return {
      code: 400,
      err: "Missing parameters.",
      msg: "Missing required parameters: track, item, time.",
    };
  },
  get parameterFilterMissing400() {
    return {
      code: 400,
      err: "Missing parameters.",
      msgid: 'Missing required parameters: "track", "item", "filter".',
    };
  },
  get parameterMoveMissing400() {
    return {
      code: 400,
      err: "Missing parameters.",
      msgid: "Missing required parameters: track, trackTarget, item, time.",
    };
  },
  parameterTimeRange400: (time) => {
    return {
      code: 400,
      err: "Parameter out of range.",
      msg: `The time parameter must be between 00: 00: 00,000 and ${time}`,
    };
  },
  get parameterTimeWrong400() {
    return {
      code: 400,
      err: "Wrong parameter.",
      msg: "The time parameter must be positive, in the format 00: 00: 00,000.",
    };
  },
  get parameterTransitionMissing400() {
    return {
      code: 400,
      err: "Missing parameters.",
      msgid:
        "Missing required parameters: track, itemA, itemB, transition, duration.",
    };
  },
  get parameterTransitionWrong400() {
    return {
      code: 400,
      err: "Wrong parameters.",
      msg: "Parameters itemA, itemB must be integer, non-negative, duration must be non-zero, in the format 00: 00: 00,000.",
    };
  },
  get parameterTransitionOrder400() {
    return {
      code: 400,
      err: "Wrong parameters.",
      msg: "itemA must directly follow itemB.",
    };
  },
  get transitionTooLong400() {
    return {
      code: 400,
      err: "Transition time too long.",
      msg: "The transition is longer than one of the transition items.",
    };
  },
  get imgWrongTrack400() {
    return {
      code: 400,
      err: "Unsupported file type.",
      msg: "Images can only be embedded on a video track.",
    };
  },
  get invalidFirstTrack() {
    return {
      code: 400,
      err: "Invalid first track",
      msg: "First track must be video track.",
    };
  },
  get videoWrongTrack400() {
    return {
      code: 400,
      err: "Unsupported file type.",
      msg: "Video can only be embedded on a video track.",
    };
  },
  get audioWrongTrack400() {
    return {
      code: 400,
      err: "Unsupported file type.",
      msg: "Audio can only be embedded on an audio track.",
    };
  },
  get videoDurationMissing400() {
    return {
      code: 400,
      err: "Missing file length.",
      msg: "Video does not have a detected length. Please try again or upload the file again. ",
    };
  },
  get audioDurationMissing400() {
    return {
      code: 400,
      err: "Missing file length.",
      msg: "Audio has no detected length. Please try again or upload the file again. ",
    };
  },
  get tracksIncompatible400() {
    return {
      code: 400,
      err: "Incompatible tracks.",
      msg: "Items cannot be moved between video and audio tracks.",
    };
  },
  get trackDefaultDel403() {
    return {
      code: 403,
      err: "Track cannot be deleted.",
      msgid:
        'The default tracks "videotrack0" and "audiotrack0" cannot be deleted.',
    };
  },
  get fileWrongTrack403() {
    return {
      code: 403,
      err: "Unsupported file type.",
      msg: "Only video, image or audio can be inserted on the timeline.",
    };
  },
  get sourceInUse403() {
    return {
      code: 403,
      err: "The resource is in use.",
      msg: "The resource is being used in the project. Remove it from the timeline before deleting from the project. ",
    };
  },
  get transitionExists403() {
    return {
      code: 403,
      err: "Transition already applied.",
      msg: "The selected elements already have a transition between them.",
    };
  },
  filterExists403: (item, track, filter) => {
    return {
      code: 403,
      err: "The filter is already applied.",
      msgid: `Item" ${item} "on track" ${track} "already has filter" ${filter} "applied.`,
    };
  },
  get projectStillRendering403() {
    return {
      code: 403,
      err: "Processing.",
      msgid:
        "The project is already being processed, please wait for completion.",
    };
  },
  get moveNoSpace403() {
    return {
      code: 403,
      err: "The target already contains an item.",
      msgid: "The specified location is not free, the item cannot be moved.",
    };
  },
  get projectNotFound404() {
    return {
      code: 404,
      err: "Project does not exist",
      msg: "The specified project does not exist.",
    };
  },
  get sourceNotFound404() {
    return {
      code: 404,
      err: "Source not found.",
      msg: "The resource is not in the project.",
    };
  },
  trackNotFound404: (track) => {
    return {
      code: 404,
      err: "Track not found.",
      msgid: `The specified track" ${track} "is not in the project.`,
    };
  },
  itemNotFound404: (item, track) => {
    return {
      code: 404,
      err: "Item not found.",
      msgid: `The item" ${item} "is not on the track" ${track}".`,
    };
  },
  filterNotFound404: (item, track, filter) => {
    return {
      code: 404,
      err: "Filter not found.",
      msg: `The filter" ${filter} "is on ${item}.track item "${track}" not found.`,
    };
  },
  get projectFailedOpen500() {
    return {
      err: "Project cannot be opened",
      msgid: "An error occurred while loading the project.",
    };
  },
};

module.exports = errors;
