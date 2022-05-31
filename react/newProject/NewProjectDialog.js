/**
 * @file NewProjectDialog.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import Modal from "react-modal";
import { server } from "../../config";
import FetchErrorDialog from "../editor/FetchErrorDialog";

Modal.setAppElement(document.body);

export default class NewProjectDialog extends Component {
  constructor(props) {
    super(props);
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.replace("/login");
    }
    this.state = {
      showFetchError: false,
      fetchError: "",
      resolution: null,
      name: null,
      token: token,
    };

    this.closeFetchErrorDialog = this.closeFetchErrorDialog.bind(this);
  }
  createProject() {
    if (!this.state.name) {
      alert("Please provide a project name");
      return;
    }
    if (!this.state.resolution) {
      alert("Please select a resolution to continue");
      return;
    }
    const url = `${server.apiUrl}/project`;
    const params = {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`,
      },
      body: JSON.stringify({
        resolution: this.state.resolution,
        name: this.state.name,
      }),
    };

    fetch(url, params)
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.err === "undefined") {
          window.location = `${server.serverUrl}/project/${data.project}`;
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
          contentLabel="New project"
          className={"modal"}
          overlayClassName={"null"}
        >
          <h2 className={"logo"}>
            <img src={"/icons/favicon.svg"} alt={"logo"} />
            Video editor
          </h2>
          <div>
            <div>
              <label htmlFor="project-name">Project Name: </label>
              <input
                required
                id="project-name"
                type={"text"}
                onChange={(e) => {
                  this.setState({ name: e.target.value });
                }}
              />
            </div>
            <div>
              <label htmlFor="resolution">Resolution: </label>
              <select
                required
                name="resolution"
                id="resolution"
                onChange={(e) => {
                  this.setState({ resolution: e.target.value });
                }}
              >
                <option hidden disabled selected value={this.state.resolution}>
                  -- select an option --
                </option>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
                <option value="240">240p</option>
              </select>
            </div>
          </div>
          <div>
            <button onClick={() => this.createProject()}>
              Create a new project
            </button>
          </div>
        </Modal>
      </div>
    );
  }
}
