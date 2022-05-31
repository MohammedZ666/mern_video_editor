import React from "react";
import { ThemeContext } from "./themeContext";

const Toggle = () => {
  const { theme, setTheme } = React.useContext(ThemeContext);
  return (
    <div>
      {theme === "dark" ? (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="block px-4 w-full text-left py-2 text-sm text-gray-600 dark:text-gray-600"
        >
          Light Mode
        </button>
      ) : (
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="block px-4 w-full text-left py-2 text-sm text-gray-600 dark:text-gray-600"
        >
          Dark Mode
        </button>
      )}
    </div>
  );
};

export default Toggle;
