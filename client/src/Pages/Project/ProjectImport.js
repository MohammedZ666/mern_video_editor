import axios from "axios";
import { useEffect, useState } from "react";
import Footer from "../../Component/Layout/Footer";
import { useNavigate } from "react-router-dom";
const ProjectImport = () => {
  const [files, setFiles] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState({ files: null });
  const [token, setToken] = useState(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const loadImageMeta = (file) => {
    let _URL = window.URL || window.webkitURL;
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = _URL.createObjectURL(file);
    });
  };
  const loadVideoMeta = (file) => {
    let _URL = window.URL || window.webkitURL;
    return new Promise((resolve, reject) => {
      let video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = function () {
        resolve(this);
      };
      video.onerror = reject;
      video.src = _URL.createObjectURL(file);
    });
  };
  const loadAudioMeta = (file) => {
    let _URL = window.URL || window.webkitURL;
    return new Promise((resolve, reject) => {
      let audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.onloadedmetadata = function () {
        resolve(this);
      };
      audio.onerror = reject;
      audio.src = _URL.createObjectURL(file);
    });
  };
  const processDuration = (duration) => {
    let hours = Math.trunc(duration / 3600);
    let mins = Math.trunc((duration % 3600) / 60);
    let secs = Math.trunc((duration % 3600) % 60);
    let millis = Math.trunc((((duration % 3600) % 60) - secs) * 1000);
    hours = hours < 10 ? `0${hours}` : `${hours}`;
    mins = mins < 10 ? `0${mins}` : `${mins}`;
    secs = secs < 10 ? `0${secs}` : `${secs}`;
    millis = millis === 0 ? `00${millis}` : `${millis}`;
    return `${hours}:${mins}:${secs},${millis}`;
  };
  const loadMetaData = async (file) => {
    let meta = {};
    // meta.lastModified = file.lastModified;
    // meta.lastModifiedDate = file.lastModifiedDate;
    // meta.size = file.size;
    meta.mime = file.type;
    if (file.type.includes("image")) {
      let temp = await loadImageMeta(file);
      meta.width = temp.width;
      meta.height = temp.height;
    } else if (file.type.includes("video")) {
      let temp = await loadVideoMeta(file);
      meta.videoWidth = temp.videoWidth;
      meta.videoHeight = temp.videoHeight;
      meta.duration = processDuration(temp.duration);
    } else if (file.type.includes("audio")) {
      let temp = await loadAudioMeta(file);
      meta.duration = processDuration(temp.duration);
    }

    return meta;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    let metas = {};
    let fileCount = files.length;
    for (let i = 0; i < files.length; i++) {
      metas[files[i].name] = await loadMetaData(files[i]);
    }
    let data = { fileCount, projectName, metas };
    formData.append("data", JSON.stringify(data));

    // This is added later in a seperate loop so that busboy.on('file',()=>{})
    // works inside busboy.on('field',()=>{}) in backend.
    for (let i = 0; i < files.length; i++) {
      formData.append("file[]", files[i]);
    }
    try {
      const response = await axios.post("/api/project-import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          console.log(progressEvent.loaded);
          setProgress(progressEvent.loaded);
        },
      });
      console.log(response);
      window.location.replace(`/project/${response.data.id}`);
    } catch (err) {
      console.log(err);
      const serverError = err.response.data;
      if (serverError) {
        setError(serverError);
      }
    }
  };
  useEffect(() => {
    let tokenTemp = localStorage.getItem("token");
    if (!tokenTemp) {
      navigate("/login", { replace: true });
      return;
    }
    setToken(tokenTemp);
  }, []);
  return (
    <div className="">
      <div className="bg-white dark:bg-gray-700 min-h-screen pb-4 pt-8">
        <div className="w-5/6 mx-auto overflow-hidden dark:bg-gray-800 rounded-lg shadow-xl lg:max-w-md">
          <div className="w-full px-6 py-8 md:px-8">
            <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-white">
              Video editor
            </h2>

            <p className="text-sm text-center text-gray-600 dark:text-gray-200">
              Import project
            </p>
            <div className="flex items-center justify-between mt-4">
              <span className="w-1/5 border-b dark:border-gray-600 lg:w-1/4"></span>
              <span className="w-1/5 border-b dark:border-gray-400 lg:w-1/4"></span>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-200">
                  Project name
                </label>
                <input
                  className="block w-full px-4 py-2 text-gray-700 bg-white border rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-opacity-40 dark:focus:border-blue-300 focus:outline-none focus:ring focus:ring-blue-300"
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                  }}
                />
                {error.files && <div className="error-msg">{error.files}</div>}
              </div>
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-200">
                  Upload files
                </label>
                <input
                  id="file"
                  type={"file"}
                  multiple
                  onChange={(e) => {
                    setFiles(e.target.files);
                  }}
                />
                {error.files && <div className="error-msg">{error.files}</div>}
              </div>
              {progress === 0 && files.length > 0 && (
                <div className="mt-8">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 tracking-wide text-white transition-colors duration-200 transform bg-gray-700 rounded hover:bg-gray-600 focus:outline-none focus:bg-gray-600"
                  >
                    Upload
                  </button>
                </div>
              )}
              {progress > 0 && (
                <progress value={progress} max="100">
                  {progress}%
                </progress>
              )}
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default ProjectImport;
