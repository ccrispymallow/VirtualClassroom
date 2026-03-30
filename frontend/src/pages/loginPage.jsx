import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
        message: error.message || "Something went wrong.",
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
      navigate("/homepage");
    } catch (error) {
      setLoginStatus({
        type: "error",
        message: error.message || "Something went wrong.",
      });
    }
  };

  const inputClass =
    "w-full px-3.5 py-2.5 bg-[#1a2235] border border-[#1e2d45] rounded-xl text-slate-200 text-sm font-sans outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-[460px]">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl px-9 py-10 relative overflow-hidden">
          {/* decorative glow */}
          <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-blue-500/10 pointer-events-none" />

          {/* brand */}
          <div className="flex items-center gap-2.5 mb-9">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg">
              🎓
            </div>
            <span className="text-sm font-bold tracking-wide text-slate-200">
              Virtual<span className="text-cyan-400">Class</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-100 mb-1.5">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 mb-8">
            Sign in to your classroom account
          </p>

          {/* tabs */}
          <div className="flex gap-1 bg-[#1a2235] rounded-xl p-1 mb-7">
            {["login", "register"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setLoginStatus(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* status */}
          {loginStatus && (
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium mb-4 border ${
                loginStatus.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : loginStatus.type === "error"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/25"
              }`}
            >
              {loginStatus.type === "loading" && "⏳"}
              {loginStatus.type === "success" && "✅"}
              {loginStatus.type === "error" && "❌"}
              {loginStatus.message}
            </div>
          )}

          {/* login form */}
          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  className={inputClass}
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={loginStatus?.type === "loading"}
                className="w-full py-3 mt-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl text-white text-sm font-bold hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In →
              </button>
            </form>
          ) : (
            /* register form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Username
                </label>
                <input
                  placeholder="johndoe"
                  className={inputClass}
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  className={inputClass}
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Role
                </label>
                <select
                  className={inputClass}
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
                className="w-full py-3 mt-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl text-white text-sm font-bold hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginStatus?.type === "loading"
                  ? "Creating…"
                  : "Create Account →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
