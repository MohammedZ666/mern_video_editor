import React from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../Component/Layout/Footer";

const Home = ({ user }) => {
  const navigate = useNavigate();
  return (
    <div className="">
      {user && (
        <div className="text-center">
          <h2>Your Projects</h2>
          {user.projects && (
            <ul>
              {user.projects.map((project, index) => (
                <li key={index}>
                  <a href={`/project/${project._id}`}>{project.name}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div
        className="w-full bg-center bg-cover min-h-screen h-[35rem]"
        style={{
          backgroundImage:
            "url(" +
            "https://www.dolphin.com.bd/pub/media/rokanthemes/blog/images/v/i/video_editing_pc.png" +
            ")",
        }}
      >
        <div className="flex items-center justify-center w-full h-full bg-gray-900 bg-opacity-50">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white uppercase lg:text-3xl">
              Build Your new{" "}
              <span className="text-blue-400 underline">Video</span>
            </h1>
            <button
              onClick={() => {
                window.location.href = "/create";
              }}
              className="w-full px-4 py-2 mt-4 text-sm font-medium text-white uppercase transition-colors duration-200 transform bg-blue-600 rounded-md lg:w-auto hover:bg-blue-500 focus:outline-none focus:bg-blue-500"
            >
              Start project
            </button>
            <button
              onClick={() => {
                navigate("/import", { replace: false });
              }}
              className="w-full px-4 py-2 mt-4 text-sm font-medium text-white uppercase transition-colors duration-200 transform bg-blue-600 rounded-md lg:w-auto hover:bg-blue-500 focus:outline-none focus:bg-blue-500"
            >
              Import project
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Home;
