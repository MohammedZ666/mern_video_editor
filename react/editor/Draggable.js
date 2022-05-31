import React, { useCallback, useRef, useState } from "react";
import { server } from "../../config";

const Draggable = ({ view, imageRef, imageDim, project, loadDataAsync }) => {
  const aspectRatio = imageDim.width / imageDim.height;
  const [position, setPosition] = useState({
    x: (imageDim.geometry.x * imageDim.parentDims.parentWidth) / 100,
    y: (imageDim.geometry.y * imageDim.parentDims.parentHeight) / 100,
  });
  const [size, setSize] = useState({
    x:
      ((imageDim.geometry.height * imageDim.parentDims.parentHeight) / 100) *
      aspectRatio,
    y: (imageDim.geometry.height * imageDim.parentDims.parentHeight) / 100,
  });
  const elementRef = useRef(null);
  const [resize, setResize] = useState(false);
  const sizeOffset = 30;
  // ${server.apiUrl}/project/${this.props.project}/track
  const syncWatermark = async () => {
    const url = `${server.apiUrl}/project/${project}/syncWatermark`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        x: (position.x * 100) / imageDim.parentDims.parentWidth,
        y: (position.y * 100) / imageDim.parentDims.parentHeight,
        width:
          ((size.y * 100) / imageDim.parentDims.parentHeight) * aspectRatio,
        height: (size.y * 100) / imageDim.parentDims.parentHeight,
        transitionId: imageDim.transitionId,
      }),
    };
    try {
      const response = await fetch(url, params);
      if (response.status == 200) {
        await loadDataAsync();
        return true;
      }
    } catch (error) {
      console.log(error.message);
      return false;
    }
  };
  const onMouseDown = useCallback(
    (event) => {
      event.preventDefault();
      const onMouseMove = (event) => {
        const element = elementRef.current;
        const imageElem = imageRef.current;

        if (element) {
          if (!resize) {
            position.x += event.movementX;
            position.y += event.movementY;
            position.x = position.x < 0 ? 0 : position.x;
            position.y = position.y < 0 ? 0 : position.y;
            position.x =
              position.x > imageDim.parentDims.parentWidth - size.x
                ? imageDim.parentDims.parentWidth - size.x
                : position.x;
            position.y =
              position.y > imageDim.parentDims.parentHeight - size.y
                ? imageDim.parentDims.parentHeight - size.y
                : position.y;
            element.style.top = `${position.y}px`;
            element.style.left = `${position.x}px`;
          } else {
            const { width, height } = window.getComputedStyle(element);
            let motion =
              event.movementX > event.movementY
                ? event.movementX
                : event.movementY;
            size.y = parseInt(height, 10) + motion;
            size.y =
              size.y > imageDim.parentDims.parentHeight
                ? imageDim.parentDims.parentHeight - sizeOffset
                : size.y;
            size.x = size.y * aspectRatio;
            //size.x = size.x > imageDim.parentDims.parentWidth ? imageDim.parentDims.parentWidth - sizeOffset : size.x
            element.style.width = `${size.x}px`;
            element.style.height = `${size.y}px`;
            imageElem.style.width = `${size.x - 6}px`;
            imageElem.style.height = `${size.y - 6}px`;

            position.x = position.x < 0 ? 0 : position.x;
            position.y = position.y < 0 ? 0 : position.y;
            position.x =
              position.x > imageDim.parentDims.parentWidth - size.x
                ? imageDim.parentDims.parentWidth - size.x
                : position.x;
            position.y =
              position.y > imageDim.parentDims.parentHeight - size.y
                ? imageDim.parentDims.parentHeight - size.y
                : position.y;
            element.style.top = `${position.y}px`;
            element.style.left = `${position.x}px`;
          }
          setPosition(position);
          setSize(size);
        }
      };
      const onMouseUp = async () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        await syncWatermark();
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [resize, position, elementRef, imageRef]
  );
  return (
    <div
      ref={elementRef}
      onMouseDown={onMouseDown}
      draggable={false}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: "absolute",
        zIndex: 1,
      }}
    >
      {view}
      <div
        onMouseEnter={() => setResize(true)}
        onMouseLeave={() => setResize(false)}
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: "6px",
          height: "6px",
          backgroundColor: "white",
        }}
      >
        {" "}
      </div>
    </div>
  );
};
export default Draggable;
