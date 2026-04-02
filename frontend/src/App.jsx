import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/loginPage";
import Home from "./pages/homePage";
import MainEngine from "./pages/mainEngine";
import ProfilePage from "./pages/profilePage";

export default function App() {
  return (
    <Routes>
      <Route path="/homepage" element={<Home />} />
      <Route path="/" element={<LoginPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/classroom/:roomCode" element={<MainEngine />} />
    </Routes>
  );
}
