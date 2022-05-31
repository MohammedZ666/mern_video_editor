/**
 * @file Sources.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import { server } from "../../config";
import timeManager from "../../models/timeManager";
import Uploader from "./Uploader";
import SourcesTableRow from "./SourcesTableRow";
import PropTypes from "prop-types";
import TimelineModel from "./TimelineModel";
import AddObjectDialog from "./AddObjectDialog";
import AddBlankVideoDialog from "./AddBlankVideoDialog";
export default class Sources extends Component {
  constructor(props) {
    super(props);

    this.delResource = this.delResource.bind(this);
    this.putResource = this.putResource.bind(this);
    this.openAddObjectDialog = this.openAddObjectDialog.bind(this);
    this.closeAddObjectDialog = this.closeAddObjectDialog.bind(this);
    this.openAddBlankVideoDialog = this.openAddBlankVideoDialog.bind(this);
    this.closeAddBlankVideoDialog = this.closeAddBlankVideoDialog.bind(this);

    this.state = {
      showAddObjectDialog: false,
      showAddBlankVideoDialog: false,
    };
  }

  delResource(id) {
    const url = `${server.apiUrl}/project/${this.props.project}/file/${id}`;
    const params = {
      method: "DELETE",
    };

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err === "undefined") {
          this.props.onDelResource(id);
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch((error) => this.props.fetchError(error.message));
  }

  putResource(id) {
    // Get duration for image files
    let duration = null;
    if (new RegExp(/^image\//).test(this.props.items[id].mime)) {
      duration = "00:00:05,000";
      if (duration === null) return;

      if (!timeManager.isValidDuration(duration)) {
        alert("Enter a non-zero length in the format HH:MM:SS,sss");
        this.putResource(id);
        return;
      }
    }
    const trackId = this.props.items[id].mime.includes("audio/")
      ? "audiotrack0"
      : "videotrack0";
    let body = {
      track: trackId,
      duration: duration,
      in: null,
      out: null,
    };
    const isImage = this.props.items[id].mime.includes("image");
    if (isImage) {
      const timeline = Object.assign({}, this.props.timeline);
      const track = TimelineModel.findTrack(timeline, trackId);
      const timeEnd = timeManager.addDuration(track.duration, duration);
      body["in"] = track.duration;
      body["out"] = timeEnd;
    }
    // Send request to API
    const url = `${server.apiUrl}/project/${this.props.project}/file/${id}`;
    const params = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err === "undefined") {
          this.props.onPutResource(id, duration, trackId);
          if (isImage) this.initTrack(id, data.trackId);
          else this.props.loadData();
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch((error) => this.props.fetchError(error.message));
  }
  openAddObjectDialog(e) {
    this.setState({ showAddObjectDialog: true });
  }
  closeAddObjectDialog(e) {
    this.setState({ showAddObjectDialog: false });
  }
  openAddBlankVideoDialog() {
    this.setState({ showAddBlankVideoDialog: true });
  }
  closeAddBlankVideoDialog() {
    this.setState({ showAddBlankVideoDialog: false });
  }
  initTrack(resource, trackId) {
    const url = `${server.apiUrl}/project/${this.props.project}/item/move`;
    const parentDims = window.getComputedStyle(
      document.getElementById("preview-player")
    );
    const parentWidth = Number(parentDims.width.replace("px", ""));
    const parentHeight = Number(parentDims.height.replace("px", ""));
    const params = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        track: trackId,
        transitionId: trackId,
        trackTarget: trackId,
        item: 0,
        time: "00:00:00,000",
        endTime: "00:00:20,000",
        duration: "00:00:20,000",
        resource: resource,
        parentWidth: parentWidth,
        parentHeight: parentHeight,
      }),
    };

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err !== "undefined") {
          alert(`${data.err}\n\n${data.msg}`);
        } else {
          this.props.loadData();
        }
      })
      .catch((error) => this.props.fetchError(error.message));
  }
  render() {
    return (
      <div id={"sources"}>
        <h3>
          <i className="material-icons" aria-hidden="true">
            video_library
          </i>
          List of shots
        </h3>
        {this.state.showAddObjectDialog && (
          <AddObjectDialog
            closeDialog={this.closeAddObjectDialog}
            project={this.props.project}
            loadData={this.props.loadData}
          />
        )}
        {this.state.showAddBlankVideoDialog && (
          <AddBlankVideoDialog
            closeDialog={this.closeAddBlankVideoDialog}
            project={this.props.project}
            loadData={this.props.loadData}
            onProcessing={this.props.onProcessing}
          />
        )}

        <table>
          <tbody>
            {Object.keys(this.props.items).map((key) => (
              <SourcesTableRow
                key={key}
                item={this.props.items[key]}
                onRemove={this.delResource}
                onInsert={this.putResource}
              />
            ))}
            <tr>
              <td colSpan="3">
                <Uploader
                  onAdd={(resource) => this.props.onAddResource(resource)}
                  project={this.props.project}
                />

                <div>
                  <button onClick={this.openAddObjectDialog}>
                    Upload Object
                  </button>
                </div>
                <div>
                  <button onClick={this.openAddBlankVideoDialog}>
                    Add Blank Video
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

Sources.propTypes = {
  project: PropTypes.string.isRequired,
  items: PropTypes.object.isRequired,
  onAddResource: PropTypes.func.isRequired,
  onDelResource: PropTypes.func.isRequired,
  onPutResource: PropTypes.func.isRequired,
  fetchError: PropTypes.func.isRequired,
  loadData: PropTypes.func.isRequired,
  timeline: PropTypes.object.isRequired,
  onProcessing: PropTypes.func.isRequired,
};
