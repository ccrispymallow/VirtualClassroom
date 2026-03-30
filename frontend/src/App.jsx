import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/loginPage";
import MainEngine from "./pages/mainEngine";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/test" element={<MainEngine />} />
    </Routes>
  );
}
