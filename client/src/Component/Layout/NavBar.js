import React, { useState } from "react";
import { Link } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Fade from "@mui/material/Fade";
import userLogo from "../../Assets/user.png";
import Toggle from "../../Config/DarkModeConfig/Toggle";

const NavBar = ({ user }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleSignOut = () => {
    localStorage.removeItem("token");
    window.location.reload(false);
  };

  const [navbarOpen, setNavbarOpen] = useState(false);
  return (
    <nav className="bg-gray-100 shadow-lg dark:bg-gray-800">
      <div className="container px-6 py-3 mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                className="text-xl font-bold text-gray-800 transition-colors duration-200 transform dark:text-white lg:text-xl hover:text-gray-700 dark:hover:text-gray-300"
                to="/"
              >
                Video Editor
              </Link>
            </div>

            <div className="flex md:hidden">
              <button
                onClick={() => setNavbarOpen(!navbarOpen)}
                type="button"
                className="text-gray-500 dark:text-gray-200 hover:text-gray-600 dark:hover:text-gray-400 focus:outline-none focus:text-gray-600 dark:focus:text-gray-400"
                aria-label="toggle menu"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path
                    fillRule="evenodd"
                    d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2z"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <div
            className={"items-center md:flex" + (navbarOpen ? "" : " hidden")}
          >
            {/* <div className="flex flex-col mt-2 md:flex-row md:mt-0 md:mx-1">
              <Link
                className="my-1 text-sm leading-5 text-gray-700 transition-colors duration-200 transform dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:underline md:mx-4 md:my-0"
                to="/"
              >
                Home
              </Link>
            </div> */}
            {!user && (
              <div className="flex items-center py-2 -mx-1 md:mx-0">
                <Link
                  className="block w-1/2 px-3 py-2 mx-1 text-sm font-medium leading-5 text-center text-white transition-colors duration-200 transform bg-gray-500 rounded-md hover:bg-blue-600 md:mx-2 md:w-auto"
                  to="login"
                >
                  Login
                </Link>
                <Link
                  className="block w-1/2 px-3 py-2 mx-1 text-sm font-medium leading-5 text-center text-white transition-colors duration-200 transform bg-blue-500 rounded-md hover:bg-blue-600 md:mx-0 md:w-auto"
                  to="register"
                >
                  Register
                </Link>
              </div>
            )}
            {user && (
              <div>
                <p className="dark:text-white text-black">
                  {"Welcome, " + user.name}
                </p>
              </div>
            )}
            <div>
              <div className="ml-0 md:ml-2">
                <button
                  // onClick={() => setIsActive(!isActive)}
                  onClick={handleClick}
                  className="w-9 h-9 overflow-hidden border-2 border-gray-500 rounded-full mt-1"
                >
                  <img
                    src={userLogo}
                    className="object-cover w-full h-full"
                    alt="avatar"
                  />
                </button>
              </div>
              <Menu
                id="fade-menu"
                MenuListProps={{
                  "aria-labelledby": "fade-button",
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                TransitionComponent={Fade}
              >
                <MenuItem onClick={handleClose}>
                  {user && (
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-600"
                    >
                      Your Profile
                    </Link>
                  )}
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  <Toggle />
                </MenuItem>
                <MenuItem onClick={handleClose}>
                  {user && (
                    <Link
                      to="logout"
                      onClick={handleSignOut}
                      className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-600"
                    >
                      Sign Out
                    </Link>
                  )}
                </MenuItem>
              </Menu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
