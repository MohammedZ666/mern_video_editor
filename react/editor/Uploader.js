/**
 * @file Uploader.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component } from "react";
import Dropzone from "react-dropzone-uploader";
import PropTypes from "prop-types";

export default class Uploader extends Component {
  constructor(props) {
    super(props);
    this.handleChangeStatus = this.handleChangeStatus.bind(this);
    this.getUploadParams = this.getUploadParams.bind(this);
  }
  getUploadParams = ({ file, meta }) => {
    const body = new FormData();
    body.append("meta", meta);
    return {
      url: `/api/project/${this.props.project}/file`,
      fields: { meta: JSON.stringify(meta) },
    };
  };

  // getUploadParams() {
  // 	return {
  // 		url: `/api/project/${this.props.project}/file`,
  // 	};
  // }

  handleChangeStatus({ meta, xhr, remove }, status) {
    if (status === "done") {
      const response = JSON.parse(xhr.response);
      let resource = {
        id: response.resource_id,
        name: meta.name,
        duration: response.length,
        mime: response.resource_mime,
        width: null,
        height: null,
      };
      if (meta.type.includes("image")) {
        resource["height"] = meta.height;
        resource["width"] = meta.width;
      } else if (meta.type.includes("video")) {
        resource["height"] = meta.videoHeight;
        resource["width"] = meta.videoWidth;
      }
      this.props.onAdd(resource);
      remove();
    } else if (status === "aborted") {
      alert(`${meta.name}, upload failed...`);
    }
  }

  render() {
    return (
      <Dropzone
        getUploadParams={this.getUploadParams}
        onChangeStatus={this.handleChangeStatus}
        accept="image/*,audio/*,video/*"
        inputContent={(files, extra) =>
          extra.reject
            ? "Only video, audio and image files can be uploaded."
            : "Upload files"
        }
        inputWithFilesContent={"Upload files"}
        styles={{
          dropzoneReject: { borderColor: "#7a281b", backgroundColor: "#DAA" },
        }}
      />
    );
  }
}

Uploader.propTypes = {
  onAdd: PropTypes.func.isRequired,
  project: PropTypes.string.isRequired,
};
