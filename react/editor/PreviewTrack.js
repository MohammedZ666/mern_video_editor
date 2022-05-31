/**
 * @file PreviewTrack.js
 * @author Vladan Kudlac <vladankudlac@gmail.com>
 */

import React, { Component, useRef } from "react";
import PropTypes from "prop-types";
import TimelineModel from "./TimelineModel";
import "./Draggable";
import Draggable from "./Draggable";
export default class PreviewTrack extends Component {
  constructor(props) {
    super(props);

    this.items = null;
    this.currentItem = null;

    this.prevA = React.createRef();
    this.prevALoaded = true;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.prevA.current) {
      if (!this.prevALoaded) {
        this.prevA.current.onloadeddata = (video) => {
          video.target.currentTime = this.calcCurrentTime();
        };
        this.prevA.current.load();
        console.log(this.props.playing);
        this.prevALoaded = true;
      }

      if (this.props.playing) {
        // play
        this.prevA.current.play();
      } else if (!this.props.playing && prevProps.playing) {
        // pause
        this.prevA.current.pause();
        this.prevA.current.currentTime = this.calcCurrentTime();
      } else if (!this.props.playing && !prevProps.playing) {
        // move
        this.prevA.current.currentTime = this.calcCurrentTime();
      }
    }
  }

  render() {
    if (this.props.track.items.length === 0) {
      return <div> No preview available </div>;
    }
    if (
      this.items === null ||
      this.props.playing === false ||
      this.items.length === 0
    ) {
      this.items = TimelineModel.getItemInRange(
        this.props.track,
        null,
        this.props.time,
        "23:59:59,999"
      );
    }

    if (this.items.length > 0 && this.items[0].start <= this.props.time) {
      if (
        this.currentItem !== null &&
        this.currentItem.resource !== this.items[0].resource
      ) {
        this.prevALoaded = false; // source has changed, reload video
      }
      this.currentItem = this.items[0];
      this.items.splice(0, 1);
    }

    if (this.currentItem === null) return null;

    const prevAext = this.props.resources[this.currentItem.resource].name
      .split(".")
      .pop();

    let images = [];
    let allResources = Object.values(this.props.resources);
    let time = {};
    this.props.allTracks.video.forEach((video) => {
      video.items.forEach((item) => {
        if (item) {
          time[item.resource] = {
            in: item.in,
            out: item.out,
            geometry: item.geometry,
            transitionId: item.transitionId,
          };
        }
      });
    });
    images = [];
    for (let i = 0; i < allResources.length; i++) {
      let temp = { ...allResources[i] };
      let isImage = temp["mime"].includes("image") && time[temp["id"]];
      if (isImage) {
        temp["in"] = time[temp["id"]].in;
        temp["out"] = time[temp["id"]].out;
        temp["geometry"] = time[temp["id"]].geometry;
        temp["transitionId"] = time[temp["id"]].transitionId;
        temp["ext"] = `${allResources[i]["name"].split(".")[1]}`;
        temp["ref"] = React.createRef();
        images.push(temp);
      }
    }
    return (
      <div>
        <video
          style={{
            position: "relative",
            height: "100%",
            width: "100%",
            zIndex: 1,
          }}
          ref={this.prevA}
        >
          <source
            type={this.props.resources[this.currentItem.resource].mime}
            src={
              this.props.project +
              "/file/" +
              this.currentItem.resource +
              "?ext=" +
              prevAext
            }
          />
        </video>
        {images.map((image, i) => {
          const parentDims = window.getComputedStyle(
            document.getElementById("preview-player")
          );
          const parentWidth = Number(parentDims.width.replace("px", ""));
          const parentHeight = Number(parentDims.height.replace("px", ""));
          const aspectRatio = image.width / image.height;
          const imageDim = {
            width: image.width,
            height: image.height,
            parentDims: { parentWidth, parentHeight },
            geometry: image.geometry,
            transitionId: image.transitionId,
          };
          return (
            <div key={i}>
              {TimelineModel.timeInBetween(
                image.in,
                image.out,
                this.props.time
              ) &&
                imageDim.geometry && (
                  <Draggable
                    loadDataAsync={this.props.loadDataAsync}
                    imageRef={image.ref}
                    imageDim={imageDim}
                    project={this.props.project}
                    view={
                      <img
                        onMouseDown={(e) => {
                          e.preventDefault();
                          return false;
                        }}
                        style={{
                          width: `${
                            ((imageDim.geometry.height *
                              imageDim.parentDims.parentHeight) /
                              100) *
                            aspectRatio
                          }px`,
                          height: `${
                            (imageDim.geometry.height *
                              imageDim.parentDims.parentHeight) /
                            100
                          }px`,
                        }}
                        ref={image.ref}
                        alt="Logo"
                        src={
                          this.props.project +
                          "/file/" +
                          image.id +
                          `?ext=${image.ext}`
                        }
                      />
                    }
                  />
                )}
            </div>
          );
        })}
      </div>
    );
  }

  calcCurrentTime() {
    return (
      (TimelineModel.dateFromString(this.props.time).getTime() -
        TimelineModel.dateFromString(this.currentItem.start).getTime() +
        TimelineModel.dateFromString(this.currentItem.in).getTime()) /
      1000
    ); // convert ms to seconds
  }
}

PreviewTrack.propTypes = {
  project: PropTypes.string.isRequired,
  resources: PropTypes.object.isRequired,
  track: PropTypes.object.isRequired,
  allTracks: PropTypes.object.isRequired,
  time: PropTypes.string.isRequired,
  playing: PropTypes.bool.isRequired,
  loadDataAsync: PropTypes.func.isRequired,
};
