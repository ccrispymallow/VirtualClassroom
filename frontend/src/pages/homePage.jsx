import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LiveBadge = () => (
  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    LIVE
  </span>
);

const OfflineBadge = () => (
  <span className="px-2 py-0.5 bg-slate-700/40 text-slate-500 text-[10px] font-bold rounded-full">
    OFFLINE
  </span>
);

const DeleteConfirm = ({ roomName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 w-72 shadow-2xl">
      <p className="text-slate-200 text-sm font-semibold text-center mb-1">
        Delete Room?
      </p>
      <p className="text-slate-500 text-xs text-center mb-5">
        <span className="text-slate-300 font-medium">"{roomName}"</span> will be
        permanently deleted.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-[#1e2d45] text-slate-400 text-xs font-semibold hover:bg-[#1a2235] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

const PasswordPrompt = ({ roomName, onConfirm, onCancel, error }) => {
  const [pw, setPw] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 w-72 shadow-2xl">
        <p className="text-slate-200 text-sm font-semibold text-center mb-1">
          Password Required
        </p>
        <p className="text-slate-500 text-xs text-center mb-4">
          Enter password for{" "}
          <span className="text-slate-300 font-medium">"{roomName}"</span>
        </p>
        <input
          type="password"
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm(pw)}
          className="w-full px-3.5 py-2.5 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600 mb-2"
          autoFocus
        />
        {error && (
          <p className="text-rose-400 text-xs text-center mb-2">{error}</p>
        )}
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-[#1e2d45] text-slate-400 text-xs font-semibold hover:bg-[#1a2235] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(pw)}
            className="flex-1 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

const StartSessionModal = ({ room, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-6 w-80 shadow-2xl">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-400/10 flex items-center justify-center text-2xl">
          🏫
        </div>
      </div>
      <p className="text-slate-200 text-sm font-semibold text-center mb-1">
        Start a New Session?
      </p>
      <p className="text-slate-500 text-xs text-center mb-1">
        <span className="text-slate-300 font-medium">"{room.room_name}"</span>
      </p>
      <p className="text-slate-600 text-xs text-center mb-5">
        This will set the room as live so students can join.
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl border border-[#1e2d45] text-slate-400 text-xs font-semibold hover:bg-[#1a2235] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start Session"}
        </button>
      </div>
    </div>
  </div>
);

const checkRoomLive = async (roomId) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/sessions/live/${roomId}`,
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.active === true;
  } catch {
    return false;
  }
};

export default function Home() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("userSession") || "{}");
  const isInstructor = user.role === "instructor" || user.role === "prof";

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
  const [myRooms, setMyRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pwTarget, setPwTarget] = useState(null);
  const [pwError, setPwError] = useState("");
  const [sessionTarget, setSessionTarget] = useState(null);
  const [sessionStarting, setSessionStarting] = useState(false);

  const inputClass =
    "w-full px-3.5 py-2.5 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

  useEffect(() => {
    if (!user.id) return;
    setRoomsLoading(true);
    const url = isInstructor
      ? `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/user/${user.id}?role=${user.role}`
      : `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/user/${user.id}/joined`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMyRooms(data.rooms || []))
      .catch(console.error)
      .finally(() => setRoomsLoading(false));
  }, [user.id, isInstructor]);

  const handleInstructorEnterRoom = (room, e) => {
    if (e.target.closest("[data-menu-btn]")) return;
    setSessionTarget(room);
  };

  const handleStartSession = async () => {
    if (!sessionTarget) return;
    setSessionStarting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/sessions/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: sessionTarget.id }),
        },
      );
      if (!res.ok) {
        let msg = "Failed to start session";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }
      setMyRooms((prev) =>
        prev.map((r) =>
          r.id === sessionTarget.id ? { ...r, live_status: "live" } : r,
        ),
      );
      localStorage.setItem("currentRoom", JSON.stringify(sessionTarget));
      navigate("/classroom/" + sessionTarget.room_code);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSessionStarting(false);
      setSessionTarget(null);
    }
  };

  const enterRoom = async (room, passwordOverride = null) => {
    setStatus({ type: "loading", message: "Checking session status…" });
    const isLive = await checkRoomLive(room.id);
    if (!isLive) {
      setStatus({
        type: "error",
        message: `"${room.room_name}" is not currently active. Wait for your instructor to start the session.`,
      });
      setPwTarget(null);
      return;
    }
    if (room.room_password && !passwordOverride) {
      setStatus(null);
      setPwTarget(room);
      setPwError("");
      return;
    }
    setStatus({ type: "loading", message: "Joining classroom…" });
    try {
      const joinRes = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_code: room.room_code,
            room_password: passwordOverride || "",
            user_id: user.id,
          }),
        },
      );
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setPwError(joinData.error || "Wrong password.");
        setStatus(null);
        return;
      }
      localStorage.setItem("currentRoom", JSON.stringify(joinData.classroom));
      setPwTarget(null);
      setStatus(null);
      navigate("/classroom/" + room.room_code);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  const handlePasswordSubmit = (pw) => {
    if (!pw.trim()) {
      setPwError("Password cannot be empty.");
      return;
    }
    enterRoom(pwTarget, pw);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Looking up classroom…" });
    try {
      const lookupRes = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/code/${joinForm.room_code.trim().toUpperCase()}`,
      );
      if (!lookupRes.ok) {
        const err = await lookupRes.json();
        throw new Error(err.error || "Room not found.");
      }
      const lookupData = await lookupRes.json();
      const room = lookupData.classroom || lookupData;
      await enterRoom(
        { ...room, room_password: joinForm.room_password ? "yes" : "" },
        joinForm.room_password || null,
      );
    } catch (error) {
      setStatus({ type: "loading", message: "Joining classroom…" });
      try {
        const res = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...joinForm, user_id: user.id }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to join.");
        localStorage.setItem("currentRoom", JSON.stringify(data.classroom));
        setStatus({ type: "success", message: "Joined! Entering classroom…" });
        setTimeout(
          () => navigate("/classroom/" + data.classroom.room_code),
          1000,
        );
      } catch (fallbackError) {
        setStatus({ type: "error", message: fallbackError.message });
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus({ type: "loading", message: "Creating classroom..." });
    const room_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/classrooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_name: createForm.room_name,
            room_code,
            room_password: createForm.room_password,
            capacity: createForm.capacity || 5,
            creator_id: user.id,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create.");
      const roomData = data.classroom || {
        id: data.id || data.room_id || null,
        room_code,
        room_name: createForm.room_name,
      };
      localStorage.setItem("currentRoom", JSON.stringify(roomData));
      setMyRooms((prev) => [{ ...roomData, live_status: null }, ...prev]);
      setStatus({
        type: "success",
        message: `Created! Room code: ${room_code}`,
      });
      setTimeout(() => navigate("/classroom/" + room_code), 1000);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    }
  };

  const handleDeleteRoom = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteTarget.id, user_id: user.id }),
        },
      );
      if (!res.ok) throw new Error("Failed to delete");
      setMyRooms((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRemoveFromList = async (room) => {
    setMyRooms((prev) => prev.filter((r) => r.id !== room.id));
    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/classrooms/${room.id}/leave`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        },
      );
    } catch (err) {
      console.error("Failed to remove from room:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    localStorage.removeItem("currentRoom");
    navigate("/");
  };

  // Close all menus when clicking outside
  const closeAllMenus = () => {
    setMyRooms((prev) => prev.map((r) => ({ ...r, _menuOpen: false })));
    setShowUserPanel(false);
  };

  return (
    <div
      className="min-h-screen bg-[#0b0f1a] px-4 py-6 relative"
      onClick={closeAllMenus}
    >
      {deleteTarget && (
        <DeleteConfirm
          roomName={deleteTarget.room_name}
          onConfirm={handleDeleteRoom}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {pwTarget && (
        <PasswordPrompt
          roomName={pwTarget.room_name}
          onConfirm={handlePasswordSubmit}
          onCancel={() => {
            setPwTarget(null);
            setPwError("");
          }}
          error={pwError}
        />
      )}
      {sessionTarget && (
        <StartSessionModal
          room={sessionTarget}
          onConfirm={handleStartSession}
          onCancel={() => setSessionTarget(null)}
          loading={sessionStarting}
        />
      )}

      {/* Top bar */}
      <div
        className="flex items-center justify-between max-w-5xl mx-auto mb-16"
        onClick={(e) => e.stopPropagation()}
      >
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
            onClick={(e) => {
              e.stopPropagation();
              setShowUserPanel(!showUserPanel);
            }}
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

      {/* Hero */}
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

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
        {/* Form card */}
        <div className="w-full max-w-[460px]">
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl px-9 py-10 relative overflow-hidden">
            <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-blue-500/10 pointer-events-none" />
            {isInstructor && (
              <div className="flex gap-1 bg-[#0b0f1a] rounded-xl p-1 mb-7">
                {["join", "create"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setStatus(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === tab ? "bg-blue-500 text-white" : "text-slate-500 hover:text-slate-300"}`}
                  >
                    {tab === "join" ? "🚪 Join Room" : "✨ Create Room"}
                  </button>
                ))}
              </div>
            )}
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
                      setJoinForm({
                        ...joinForm,
                        room_password: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={status?.type === "loading"}
                  className="w-full py-3 mt-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-xl text-white text-sm font-bold hover:opacity-90 hover:-translate-y-px active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Classroom
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
                      setCreateForm({
                        ...createForm,
                        room_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Password{" "}
                    <span className="normal-case text-slate-600">
                      (optional)
                    </span>
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
                      setCreateForm({
                        ...createForm,
                        capacity: e.target.value,
                      });
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
                    : "Create Classroom"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* My Rooms panel */}
        <div
          className="w-full max-w-[460px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
              {isInstructor
                ? "🏫 My Created Rooms"
                : "📚 Previously Joined Rooms"}
            </h2>
            {roomsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#1e2d45] border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : myRooms.length === 0 ? (
              <p className="text-slate-600 text-xs text-center py-8">
                {isInstructor
                  ? "No rooms yet. Create one to get started."
                  : "You haven't joined any rooms yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {myRooms.map((room) => {
                  const isLive = room.live_status === "live";
                  return (
                    <div
                      key={room.id}
                      onClick={(e) => {
                        if (e.target.closest("[data-menu-btn]")) return;
                        if (isInstructor) {
                          handleInstructorEnterRoom(room, e);
                        } else {
                          // ── Student: click card to join ──
                          setStatus(null);
                          enterRoom(room);
                        }
                      }}
                      className="relative bg-[#0f172a] border border-[#1e2d45] rounded-xl px-4 py-3 flex items-center gap-3 hover:border-blue-500/30 transition-colors cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-400/10 flex items-center justify-center text-base flex-shrink-0">
                        🏫
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-slate-200 text-xs font-semibold truncate">
                            {room.room_name}
                          </p>
                          {isLive ? <LiveBadge /> : <OfflineBadge />}
                        </div>
                        <p className="text-slate-600 text-[11px] font-mono">
                          {room.room_code}
                          {room.room_password ? " · 🔒" : ""}
                        </p>
                      </div>

                      {/* 3-dot menu */}
                      <div className="relative" data-menu-btn>
                        <button
                          data-menu-btn
                          onClick={(e) => {
                            e.stopPropagation();
                            setMyRooms((prev) =>
                              prev.map((r) =>
                                r.id === room.id
                                  ? { ...r, _menuOpen: !r._menuOpen }
                                  : { ...r, _menuOpen: false },
                              ),
                            );
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1a2235] transition-colors text-lg font-bold leading-none"
                          title="Options"
                        >
                          ···
                        </button>

                        {room._menuOpen && (
                          <div className="absolute right-0 top-9 w-44 bg-[#111827] border border-[#1e2d45] rounded-xl shadow-xl z-20 overflow-hidden">
                            {isInstructor ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMyRooms((prev) =>
                                    prev.map((r) => ({
                                      ...r,
                                      _menuOpen: false,
                                    })),
                                  );
                                  setDeleteTarget({
                                    id: room.id,
                                    room_name: room.room_name,
                                  });
                                }}
                                className="w-full px-3 py-2.5 text-left text-rose-400 text-xs font-semibold hover:bg-rose-500/10 transition-colors flex items-center gap-2"
                              >
                                🗑️ Delete Room
                              </button>
                            ) : (
                              // Student: only "Remove from list"
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveFromList(room);
                                }}
                                className="w-full px-3 py-2.5 text-left text-slate-400 text-xs font-semibold hover:bg-[#1a2235] transition-colors flex items-center gap-2"
                              >
                                ✕ Remove from list
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
