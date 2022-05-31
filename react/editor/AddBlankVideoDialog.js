/**
 * @file NewProjectDialog.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import Modal from "react-modal";
import { server } from "../../config";
import FetchErrorDialog from "./FetchErrorDialog";
import PropTypes from "prop-types";

Modal.setAppElement(document.body);

export default class AddBlankVideoDialog extends Component {
  constructor(props) {
    super(props);
    this.submitBlankVideo = this.submitBlankVideo.bind(this);
    this.state = {
      showFetchError: false,
      fetchError: "",
      hexColor: "",
      time: "",
    };
    this.closeFetchErrorDialog = this.closeFetchErrorDialog.bind(this);
  }

  submitBlankVideo() {
    this.props.onProcessing("Blank video processing");
    const body = {
      hexColor: this.state.hexColor,
      time: this.state.time,
    };

    const params = {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(body),
    };
    const url = `${server.apiUrl}/project/${this.props.project}/blank-video`;

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err === "undefined") {
          this.props.loadData();
        } else {
          alert(`${data.err}\n\n${data.msg}`);
        }
      })
      .catch((error) => this.openFetchErrorDialog(error.message));
  }

  /**
   * Show Connection error dialog
   *
   * @param {String} msg
   */
  openFetchErrorDialog(msg) {
    this.setState({
      showFetchError: true,
      fetchError: msg,
    });
  }

  /**
   * Close Connection error dialog
   */
  closeFetchErrorDialog() {
    this.setState({
      showFetchError: false,
      fetchError: "",
    });
  }

  render() {
    return (
      <div>
        {this.state.showFetchError && (
          <FetchErrorDialog
            msg={this.state.fetchError}
            onClose={this.closeFetchErrorDialog}
          />
        )}
        <Modal
          isOpen={true}
          contentLabel="Upload Object"
          className={"modal"}
          overlayClassName={"overlay"}
        >
          <div>
            <h2> Add blank video</h2>
            <div>
              <label htmlFor="hexColor"> Hexcode for background color</label>{" "}
              <br></br>
              <input
                name="hexColor"
                value={this.state.hexColor}
                onChange={(e) => this.setState({ hexColor: e.target.value })}
                type={"text"}
              />
            </div>

            <br></br>
            <div>
              <label htmlFor="time"> Video time</label>
              <br></br>
              <input
                name="hexColor"
                type={"text"}
                value={this.state.time}
                onChange={(e) => this.setState({ time: e.target.value })}
                placeholder="00:00:00,000"
                pattern="[0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}"
              />
            </div>
            <br></br>
            <small>Format: 00:00:00,000</small>
            <div>
              <button
                onClick={() => {
                  this.submitBlankVideo();
                  this.props.closeDialog();
                }}
              >
                Submit
              </button>
              <button onClick={this.props.closeDialog}>Cancel</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }
}
AddBlankVideoDialog.propTypes = {
  project: PropTypes.string.isRequired,
  closeDialog: PropTypes.func.isRequired,
  loadData: PropTypes.func.isRequired,
  onProcessing: PropTypes.func.isRequired,
};
