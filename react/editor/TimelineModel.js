/**
 * @file TimelineModel.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

export default {
  /**
   * Get nth item of track. Blanks are ignored, first element is zero element.
   *
   * @param {Array} items
   * @param {Number} position
   * @return {Object|undefined}
   */
  findItem(items, position) {
    return items.find((item, index) => index === position);
  },

  /**
   * Get track with specified trackId
   *
   * @param {Object} timeline Object with 'video' and 'audio' entries.
   * @param {string} trackId
   * @return {Object|undefined}
   */
  findTrack(timeline, trackId) {
    let track = timeline.video.find((track) => track.id === trackId);
    if (track === undefined) {
      track = timeline.audio.find((track) => track.id === trackId);
    }
    return track;
  },

  /**
   * Get item(s) withing provided interval
   *
   * @param {Object} track Track object with 'id' and 'items' key.
   * @param {number | null} itemID If set, item with this index will be excluded from search
   * @param {string} start
   * @param {string} end
   * @return {Array} List of items
   */
  getItemInRange(track, itemID, start, end) {
    const items = [];
    let index = 0;
    for (let item of track.items) {
      if (end <= item.start) break;
      if (index++ === itemID) continue; // Same item
      if (start >= item.end) continue;
      items.push(item);
    }
    return items;
  },

  /**
   * Get duration format from Date object
   *
   * @param {Date} date
   * @return {string} Duration in format '00:00:00,000'
   */
  dateToString(date) {
    let string = `${date.getUTCHours()}:`;
    if (string.length < 3) string = "0" + string;

    string += `00${date.getUTCMinutes()}:`.slice(-3);
    string += `00${date.getUTCSeconds()},`.slice(-3);
    string += `${date.getUTCMilliseconds()}000`.slice(0, 3);
    return string;
  },

  /**
   * Get instance of Date from string
   *
   * @param string Timestamp in format "00:00:00,000"
   * @return {Date}
   */
  dateFromString(string) {
    const parsed = string.match(/^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/);
    return parsed !== null
      ? new Date(
          Date.UTC(1970, 0, 1, parsed[1], parsed[2], parsed[3], parsed[4])
        )
      : null;
  },

  /**
   * Convert date-string to millisecond
   *
   * @param string Timestamp in format "00:00:00,000"
   * @return {Number}
   */
  millisFromString(string) {
    let time = string.split(":");
    let hours = Number(time[0]) * 60 * 60 * 1000;
    let mins = Number(time[1]) * 60 * 1000;
    time = time[2].split(",");
    let secs = Number(time[0]) * 1000;
    let millis = Number(time[1]);
    return hours + mins + secs + millis;
  },
  /**
   * return if prewview picture should be shown
   *
   * @param {string} start
   * @param {string} end
   * @param {string} time
   * @return {boolean}  boolean
   */
  timeInBetween(start, end, time) {
    start = this.millisFromString(start);
    end = this.millisFromString(end);
    time = this.millisFromString(time);
    return time <= end && time >= start && end > start;
  },
};
