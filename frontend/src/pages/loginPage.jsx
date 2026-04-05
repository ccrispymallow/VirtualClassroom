import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

export default function Login() {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginStatus, setLoginStatus] = useState(null);
  const navigate = useNavigate();
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoginStatus({ type: "loading", message: "Creating your account..." });
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createForm),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Registration failed. Please try again.");
      setLoginStatus({
        type: "success",
        message: "Account created successfully!",
      });
    } catch (error) {
      setLoginStatus({
        type: "error",
        message: error.message || "Something went wrong.",
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginStatus({ type: "loading", message: "Signing you in..." });
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/loginUser`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loginForm),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Login failed. Please try again.");
      localStorage.setItem("userSession", JSON.stringify(data.user));
      setLoginStatus({ type: "success", message: "Logged in successfully!" });
      navigate("/homepage");
    } catch (error) {
      setLoginStatus({
        type: "error",
        message: error.message || "Something went wrong.",
      });
    }
  };

  return (
    <div className="container">
      <div className="left-panel">
        {/* brand */}
        <div className="brand">
          <div className="brand-icon">
            <img
              src="/logo.svg"
              style={{ width: "24px", filter: "brightness(0) invert(1)" }}
              alt="VirtualClass Logo"
            />
          </div>
          <span className="brand-name">
            Virtual<span>Class</span>
          </span>
        </div>

        <h1 className="heading">Welcome back</h1>
        <p className="subheading">Sign in to your classroom account</p>

        {/* tabs */}
        <div className="tabs">
          {["login", "register"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setLoginStatus(null);
              }}
              className={`tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* status */}
        {loginStatus && (
          <div className={`status ${loginStatus.type}`}>
            {loginStatus.type === "loading"}
            {loginStatus.type === "success"}
            {loginStatus.type === "error"}
            {loginStatus.message}
          </div>
        )}

        {/* login form */}
        {activeTab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@school.edu"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              disabled={loginStatus?.type === "loading"}
              className="btn"
            >
              Sign In
            </button>
          </form>
        ) : (
          /* register form */
          <form onSubmit={handleRegister}>
            <div className="field">
              <label>Username</label>
              <input
                placeholder="johndoe"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm({ ...createForm, username: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@school.edu"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({ ...createForm, role: e.target.value })
                }
              >
                <option value="">Select role</option>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loginStatus?.type === "loading"}
              className="btn"
            >
              {loginStatus?.type === "loading" ? "Creating…" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
