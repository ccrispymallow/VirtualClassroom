import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const LoginPage = lazy(() => import("./pages/loginPage"));
const Home = lazy(() => import("./pages/homePage"));
const MainEngine = lazy(() => import("./pages/mainEngine"));
const ProfilePage = lazy(() => import("./pages/profilePage"));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/homepage" element={<Home />} />
        <Route path="/" element={<LoginPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/classroom/:roomCode" element={<MainEngine />} />
      </Routes>
    </Suspense>
  );
}
