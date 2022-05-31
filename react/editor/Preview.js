/**
 * @file Preview.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import PropTypes from "prop-types";
import PreviewTrack from "./PreviewTrack";
import TimelineModel from "./TimelineModel";

export default class Preview extends Component {
  constructor(props) {
    super(props);
    this.stop = this.stop.bind(this);
    this.getVideo = this.getVideo.bind(this);
  }

  render() {
    const timestamp = TimelineModel.dateToString(this.props.time);
    return (
      <div id="preview">
        <h3>
          <i className="material-icons" aria-hidden={true}>
            movie_filter
          </i>
          Preview
        </h3>
        <div id="preview-player">
          {typeof this.props.items.video !== "undefined" && (
            <PreviewTrack
              project={this.props.project}
              resources={this.props.resources}
              track={this.getVideo()}
              time={timestamp}
              playing={this.props.playing}
              allTracks={this.props.items}
              loadDataAsync={this.props.loadDataAsync}
            />
          )}
        </div>
        <br />
        <div className="prev-toolbar">
          <button
            onClick={this.stop}
            className="no-border"
            title="Stop playback"
          >
            <i className="material-icons" aria-hidden="true">
              stop
            </i>
          </button>
          {this.props.playing ? (
            <button onClick={this.props.pause} title="Pause playback">
              <i className="material-icons" aria-hidden="true">
                pause
              </i>
            </button>
          ) : (
            <button onClick={this.props.play} title="Continue playing">
              <i className="material-icons" aria-hidden="true">
                play_arrow
              </i>
            </button>
          )}
          <button disabled title="Previous event">
            <i className="material-icons" aria-hidden="true">
              skip_previous
            </i>
          </button>
          <button disabled title="The following event">
            <i className="material-icons" aria-hidden="true">
              skip_next
            </i>
          </button>
        </div>
      </div>
    );
  }

  stop() {
    this.props.setTime(new Date(Date.UTC(1970, 0, 1)));
  }
  getVideo() {
    let videoArray = this.props.items.video;
    if (videoArray[0].items == 0) return videoArray[0];
    let last = this.props.items.video.length - 1;
    for (let i = last; i > -1; i--) {
      let video = videoArray[i].items[0];
      let duration = videoArray[i].duration;
      if (
        video.geometry == null &&
        this.props.time <= TimelineModel.dateFromString(duration) &&
        this.props.time >= TimelineModel.dateFromString(video.start)
      )
        return videoArray[i];
    }
    // returning blank if no item is in range
    console.log("blank returning");
    return { id: "videotrack0", duration: "00:00:00,000", items: [] };
  }
}

Preview.propTypes = {
  project: PropTypes.string.isRequired,
  resources: PropTypes.object.isRequired,
  items: PropTypes.object.isRequired,
  time: PropTypes.object.isRequired,
  playing: PropTypes.bool.isRequired,
  pause: PropTypes.func.isRequired,
  play: PropTypes.func.isRequired,
  loadDataAsync: PropTypes.func.isRequired,
  setTime: PropTypes.func.isRequired,
};
