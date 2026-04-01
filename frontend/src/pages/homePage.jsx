import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const isInstructor = user.role === "instructor"; // 👈

  const [showUserPanel, setShowUserPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("join");
  const [joinForm, setJoinForm] = useState({
    room_code: "",
    room_password: "",
  });
  const [createForm, setCreateForm] = useState({
    room_name: "",
    room_password: "",
    capacity: "",
  });
  const [status, setStatus] = useState(null);

  const inputClass =
    "w-full px-3.5 py-2.5 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

  const handleJoin = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Joining classroom..." });
    try {
      const res = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...joinForm,
          user_id: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join.");
      setStatus({ type: "success", message: "Joined! Entering classroom..." });
      setTimeout(
        () => navigate("/classroom/" + data.classroom.room_code),
        1000,
      );
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Creating classroom..." });
    const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const res = await fetch("/api/classrooms/createClassroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_name: createForm.room_name,
          room_code,
          room_password: createForm.room_password,
          capacity: createForm.capacity || 5,
          creator_id: user.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create.");
      setStatus({
        type: "success",
        message: `Created! Room code: ${room_code}`,
      });
      setTimeout(() => navigate("/classroom/" + room_code), 1000);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0b0f1a] px-4 py-6 relative">
      {/* top bar */}
      <div className="flex items-center justify-between max-w-5xl mx-auto mb-16">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg">
            🎓
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-200">
            Virtual<span className="text-cyan-400">Class</span>
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserPanel(!showUserPanel)}
            className="flex items-center gap-2.5 bg-[#111827] border border-[#1e2d45] rounded-2xl px-3 py-2 hover:border-blue-500/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
              {user.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="text-left">
              <p className="text-slate-200 text-xs font-semibold">
                {user.username || "Guest"}
              </p>
              <p className="text-slate-500 text-[11px] capitalize">
                {user.role || "user"}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${showUserPanel ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showUserPanel && (
            <div className="absolute right-0 top-14 w-64 bg-[#111827] border border-[#1e2d45] rounded-2xl p-4 z-50 shadow-xl">
              <div className="flex flex-col items-center mb-4 pb-4 border-b border-[#1e2d45]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl mb-2">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </div>
                <p className="text-slate-200 font-semibold text-sm">
                  {user.username}
                </p>
                <p className="text-slate-500 text-xs">{user.email}</p>
                <span className="mt-1.5 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[11px] rounded-full capitalize">
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full px-3 py-2 rounded-xl bg-[#1a2235] text-slate-300 text-xs font-semibold hover:bg-[#1e2d45] transition-colors text-left flex items-center gap-2"
                >
                  <span>✏️</span> Edit Profile & Avatar
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors text-left flex items-center gap-2"
                >
                  <span>🚪</span> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-100 mb-3">
          Your Virtual{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
            Classroom
          </span>
        </h1>
        <p className="text-slate-500 text-sm">
          {isInstructor
            ? "Create or join a 3D classroom and teach in real time"
            : "Join a classroom and learn together in real time"}
        </p>
      </div>

      {/* main card */}
      <div className="max-w-[460px] mx-auto">
        <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl px-9 py-10 relative overflow-hidden">
          <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-blue-500/10 pointer-events-none" />

          {/* tabs — only show Create tab for instructors 👇 */}
          {isInstructor && (
            <div className="flex gap-1 bg-[#0b0f1a] rounded-xl p-1 mb-7">
              {["join", "create"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setStatus(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                    activeTab === tab
                      ? "bg-blue-500 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tab === "join" ? "🚪 Join Room" : "✨ Create Room"}
                </button>
              ))}
            </div>
          )}

          {/* status */}
          {status && (
            <div
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium mb-4 border ${
                status.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : status.type === "error"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/25"
              }`}
            >
              {status.type === "loading" && "⏳"}
              {status.type === "success" && "✅"}
              {status.type === "error" && "❌"}
              {status.message}
            </div>
          )}

          {/* students always see join form, instructors see based on activeTab 👇 */}
          {!isInstructor || activeTab === "join" ? (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Room Code
                </label>
                <input
                  placeholder="Enter room code"
                  className={inputClass}
                  value={joinForm.room_code}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, room_code: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Password{" "}
                  <span className="normal-case text-slate-600">
                    (if required)
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={joinForm.room_password}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, room_password: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={status?.type === "loading"}
                className="w-full py-3 mt-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl text-white text-sm font-bold hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Classroom →
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Room Name
                </label>
                <input
                  placeholder="My Classroom"
                  className={inputClass}
                  value={createForm.room_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, room_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Password{" "}
                  <span className="normal-case text-slate-600">(optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={inputClass}
                  value={createForm.room_password}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      room_password: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Capacity
                </label>
                <input
                  type="number"
                  placeholder="Max students (default 5)"
                  className={inputClass}
                  min="1"
                  value={createForm.capacity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val < 1) return;
                    setCreateForm({ ...createForm, capacity: e.target.value });
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={status?.type === "loading"}
                className="w-full py-3 mt-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl text-white text-sm font-bold hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status?.type === "loading"
                  ? "Creating…"
                  : "Create Classroom →"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
