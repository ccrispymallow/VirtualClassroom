import { useState } from "react";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginStatus, setLoginStatus] = useState(null);

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
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
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
        message: error.message || "Something went wrong. Please try again.",
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginStatus({ type: "loading", message: "Signing you in..." });
    try {
      const res = await fetch("/api/users/loginUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Login failed. Please try again.");
      localStorage.setItem("userSession", JSON.stringify(data.user));
      setLoginStatus({ type: "success", message: "Logged in successfully!" });
      // navigate("/homepage");
    } catch (error) {
      setLoginStatus({
        type: "error",
        message: error.message || "Something went wrong. Please try again.",
      });
    }
  };

  return (
    <>
      <div className="container">
        <div className="left-panel">
          <div className="brand">
            <div className="brand-icon">🎓</div>
            <div className="brand-name">
              Virtual<span>Class</span>
            </div>
          </div>

          <h1 className="heading">Welcome back</h1>
          <p className="subheading">Sign in to your classroom account</p>

          <div className="tabs">
            <button
              className={`tab ${activeTab === "login" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("login");
                setLoginStatus(null);
              }}
            >
              Sign In
            </button>
            <button
              className={`tab ${activeTab === "register" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("register");
                setLoginStatus(null);
              }}
            >
              Register
            </button>
          </div>

          {loginStatus && (
            <div className={`status ${loginStatus.type}`}>
              {loginStatus.type === "loading" && "⏳"}
              {loginStatus.type === "success" && "✅"}
              {loginStatus.type === "error" && "❌"}
              {loginStatus.message}
            </div>
          )}

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
                className="btn"
                type="submit"
                disabled={loginStatus?.type === "loading"}
              >
                Sign In →
              </button>
            </form>
          ) : (
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
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <button
                className="btn"
                type="submit"
                disabled={loginStatus?.type === "loading"}
              >
                {loginStatus?.type === "loading"
                  ? "Creating…"
                  : "Create Account →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
