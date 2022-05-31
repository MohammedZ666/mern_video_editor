import React from "react";

const Footer = () => {
  return (
    <footer className="flex flex-col items-center sm:flex-row sm:justify-between px-6 py-4 bg-gray-100 dark:bg-gray-800">
      <p className="text-sm text-gray-400">
        © Copyright 2022. All Rights Reserved.
      </p>

      <div className="flex mt-3 -mx-2 sm:mt-0">
        <a
          href="/"
          className="mx-2 text-sm text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          {" "}
          Teams{" "}
        </a>

        <a
          href="/"
          className="mx-2 text-sm text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          {" "}
          Privacy{" "}
        </a>

        <a
          href="/"
          className="mx-2 text-sm text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          {" "}
          Cookies{" "}
        </a>
      </div>
    </footer>
  );
};

export default Footer;
