/**
 * @file SubmitToolbar.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import PropTypes from "prop-types";
import { server } from "../../config";

export default class SubmitToolbar extends Component {
  constructor(props) {
    super(props);
    this.startVideoProcessing = this.startVideoProcessing.bind(this);
    this.message = "Processing output video";
  }
  render() {
    return (
      <div className="right">
        {this.props.progress === 100 &&
          this.props.processingMessage === this.message && (
            <a
              href={"/project/" + this.props.project + "/output.mp4"}
              target="_blank"
              rel="noreferrer"
            >
              View the resulting video
            </a>
          )}
        {this.props.progress !== null && this.props.progress < 100 ? (
          <div>
            <label htmlFor="progress">{this.props.processingMessage} </label>
            {this.props.progress}%
            <progress id="progress" value={this.props.progress} max="100" />
            <button disabled>
              <i className="material-icons" aria-hidden="true">
                done_outline
              </i>
              Complete
            </button>
          </div>
        ) : (
          <button onClick={this.startVideoProcessing} className="success">
            <i className="material-icons" aria-hidden="true">
              done_outline
            </i>
            Complete
          </button>
        )}
      </div>
    );
  }
  startVideoProcessing() {
    console.log(this.props);
    const url = `${server.apiUrl}/project/${this.props.project}`;
    const params = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    };

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err === "undefined") {
          this.props.onProcessing(this.message);
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch((error) => this.props.fetchError(error.message));
  }
}

SubmitToolbar.propTypes = {
  progress: PropTypes.number,
  project: PropTypes.string.isRequired,
  fetchError: PropTypes.func.isRequired,
  processingMessage: PropTypes.string.isRequired,
  onProcessing: PropTypes.func.isRequired,
};
