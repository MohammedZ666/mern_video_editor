import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./Component/Layout/NavBar";
import Home from "./Pages/Home/Home";
import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";
import Profile from "./Pages/Profile/Profile";
import ProjectImport from "./Pages/Project/ProjectImport";

const App = () => {
  const [user, setUser] = useState(null);
  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    try {
      if (!token) return;
      const user = (
        await axios.get("auth/user", {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-type": "Application/json",
            Authorization: `Bearer ${token}`,
          },
        })
      ).data.user;
      if (user) setUser(user);
      else localStorage.removeItem("token");
    } catch (err) {
      console.log(err);
    }
  };
  useEffect(() => {
    fetchUser();
  }, []);
  return (
    <BrowserRouter>
      <NavBar user={user} />
      <Routes>
        <Route path="/" element={<Home user={user} />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<Profile user={user} />} />
        <Route path="import" element={<ProjectImport />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
