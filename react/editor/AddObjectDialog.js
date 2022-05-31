/**
 * @file NewProjectDialog.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import Modal from "react-modal";
import { server, config } from "../../config";
import FetchErrorDialog from "./FetchErrorDialog";
import domtoimage from "dom-to-image";
import bodyParser from "body-parser";
import { nanoid } from "nanoid";

Modal.setAppElement(document.body);

export default class AddObjectDialog extends Component {
  constructor(props) {
    super(props);
    this.submitObject = this.submitObject.bind(this);
    this.charLimit = 200;
    this.state = {
      showFetchError: false,
      fetchError: "",
      charLen: 0,
    };

    this.closeFetchErrorDialog = this.closeFetchErrorDialog.bind(this);
  }

  async submitObject() {
    const parentDims = window.getComputedStyle(
      document.getElementById("preview-player")
    );
    const parentWidth = Number(parentDims.width.replace("px", ""));
    const parentHeight = Number(parentDims.height.replace("px", ""));
    const url = `${server.apiUrl}/project/${this.props.project}/object`;

    const fontSize = 20;
    let htmlString = document.getElementById("objectCode").value;
    const objectParent = document.createElement("div");
    objectParent.style.cssText = `text-align:center;display:grid;place-items:center;`;
    const object = document.createElement("span");
    //object.style.cssText = `width:${imageHeight}px; height:${imageWidth}px;border: 5px solid #FFFF00;display:flex;align-items:center;justify-content:center`;
    object.style.cssText = `color:white;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px`;
    object.innerHTML = htmlString.trim();
    objectParent.appendChild(object);
    let imageWidth = parentWidth / 4;
    let imageHeight = parentHeight / 4;
    let totalLineHeight = this.getTextHeight(
      htmlString,
      `${fontSize}px`,
      imageWidth
    );
    while (totalLineHeight > imageHeight) {
      imageHeight++;
      imageWidth = (imageHeight * 16) / 9;
      totalLineHeight = this.getTextHeight(
        htmlString,
        `${fontSize}px`,
        imageWidth
      );
    }
    let base64 = "";
    try {
      base64 = await domtoimage.toPng(objectParent, {
        quality: 100,
        width: imageWidth,
        height: imageHeight,
      });
    } catch (error) {
      console.log(error);
      base64 = "";
    }
    if (base64 === "") return;

    const fileName =
      htmlString.length > 6
        ? `${htmlString.substring(0, 6)}${nanoid(4)}.png`
        : `${htmlString}${nanoid(4)}.png`;
    let body = {
      width: imageWidth,
      height: imageHeight,
      base64Image: base64,
      filename: fileName,
      mimeType: "image/png",
    };
    if (htmlString.length > this.charLimit) {
      alert(`Text content should be less than ${this.charLimit} characters`);
    } else {
      const params = {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(body),
      };

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
  getTextWidth(text, font) {
    // re-use canvas object for better performance
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }
  getTextHeight(text, font, divWidth) {
    // re-use canvas object for better performance
    const textWidth = this.getTextWidth(text, font);
    const fontSize = Number(font.replace("px", ""));
    return Math.ceil(textWidth / divWidth) * fontSize * 2;
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
            <h2> Please paste the html code in the text area below</h2>

            <textarea
              id="objectCode"
              name="w3review"
              rows="15"
              cols="50"
              onChange={(e) => {
                this.setState({
                  charLen: e.target.value.length,
                });
              }}
            ></textarea>
            <p>
              {`${this.state.charLen} characters of ${this.charLimit} total`}
            </p>
            <div>
              <button
                onClick={async () => {
                  await this.submitObject();
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
