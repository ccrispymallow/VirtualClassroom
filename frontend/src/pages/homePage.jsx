import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css"; // Ensures styles are imported

const LiveBadge = () => (
  <span className="badge live">
    <span className="dot" /> LIVE
  </span>
);

const OfflineBadge = () => <span className="badge offline">OFFLINE</span>;

const DeleteConfirm = ({ roomName, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Delete Room?</h3>
      <p>
        <span>"{roomName}"</span> will be permanently deleted.
      </p>
      <div className="modal-actions">
        <button onClick={onCancel} className="btn-outline">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-danger">
          Delete
        </button>
      </div>
    </div>
  </div>
);

const PasswordPrompt = ({ roomName, onConfirm, onCancel, error }) => {
  const [pw, setPw] = useState("");
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Password Required</h3>
        <p>
          Enter password for <span>"{roomName}"</span>
        </p>
        <div className="field">
          <input
            type="password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm(pw)}
            autoFocus
          />
        </div>
        {error && (
          <p style={{ color: "var(--error)", marginTop: "-10px" }}>{error}</p>
        )}
        <div className="modal-actions">
          <button onClick={onCancel} className="btn-outline">
            Cancel
          </button>
          <button onClick={() => onConfirm(pw)} className="btn">
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

const StartSessionModal = ({ room, onConfirm, onCancel, loading }) => (
  <div className="modal-overlay">
    <div className="modal">
      <div
        className="modal-icon"
        style={{ background: "rgba(59, 130, 246, 0.1)" }}
      >
        🏫
      </div>
      <h3>Start a New Session?</h3>
      <p>
        <span>"{room.room_name}"</span>
      </p>
      <p style={{ marginBottom: "16px" }}>
        This will set the room as live so students can join.
      </p>
      <div className="modal-actions">
        <button onClick={onCancel} disabled={loading} className="btn-outline">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading} className="btn">
          {loading ? "Starting…" : "Start Session"}
        </button>
      </div>
    </div>
  </div>
);

const AlreadyActiveModal = ({ activeRoom, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal">
      <div
        className="modal-icon"
        style={{ background: "rgba(245, 158, 11, 0.1)" }}
      >
        ⚠️
      </div>
      <h3>You already have an active session</h3>
      <p>
        <span style={{ color: "var(--warn)" }}>"{activeRoom.room_name}"</span>{" "}
        is currently live.
      </p>
      <p style={{ marginBottom: "16px" }}>
        End the session before starting a new one.
      </p>
      <button
        onClick={onCancel}
        className="btn-outline"
        style={{ width: "100%" }}
      >
        Got it
      </button>
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
  const [alreadyActiveRoom, setAlreadyActiveRoom] = useState(null);

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
    if (room.live_status === "live") {
      setSessionTarget(room);
      return;
    }
    const existingLive = myRooms.find(
      (r) => r.id !== room.id && r.live_status === "live",
    );
    if (existingLive) {
      setAlreadyActiveRoom(existingLive);
      return;
    }
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
        message: `"${room.room_name}" is not currently active. Wait for your instructor.`,
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

  const closeAllMenus = () => {
    setMyRooms((prev) => prev.map((r) => ({ ...r, _menuOpen: false })));
    setShowUserPanel(false);
  };

  return (
    <div className="app-wrapper" onClick={closeAllMenus}>
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
      {alreadyActiveRoom && (
        <AlreadyActiveModal
          activeRoom={alreadyActiveRoom}
          onCancel={() => setAlreadyActiveRoom(null)}
        />
      )}

      {/* Navbar */}
      <div className="navbar" onClick={(e) => e.stopPropagation()}>
        <div className="nav-brand">
          <div className="brand-icon" style={{ width: "36px", height: "36px" }}>
            <img
              src="/logo.svg"
              style={{ width: "24px", filter: "brightness(0) invert(1)" }}
              alt="Logo"
            />
          </div>
          <span className="brand-name" style={{ fontSize: "16px" }}>
            Virtual<span>Class</span>
          </span>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowUserPanel(!showUserPanel)}
            className="user-menu-btn"
          >
            <div className="user-avatar">
              {user.username?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="user-info">
              <p className="name">{user.username || "Guest"}</p>
              <p className="role">{user.role || "user"}</p>
            </div>
            <span
              style={{
                fontSize: "10px",
                marginLeft: "4px",
                transform: showUserPanel ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              ▼
            </span>
          </button>

          {showUserPanel && (
            <div className="dropdown">
              <div className="dropdown-header">
                <div className="user-avatar dropdown-avatar">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </div>
                <p className="name">{user.username}</p>
                <p className="role" style={{ fontSize: "11px" }}>
                  {user.email}
                </p>
                <span className="dropdown-role">{user.role}</span>
              </div>
              <button
                onClick={() => navigate("/profile")}
                className="dropdown-action"
              >
                <span>✏️</span> Edit Profile & Avatar
              </button>
              <button onClick={handleLogout} className="dropdown-action danger">
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="hero">
        <h1>
          Your Virtual <span>Classroom</span>
        </h1>
        <p>
          {isInstructor
            ? "Create or join a 3D classroom and teach in real time"
            : "Join a classroom and learn together in real time"}
        </p>
      </div>

      <div className="home-layout">
        {/* Form Card */}
        <div className="card">
          {isInstructor && (
            <div className="tabs">
              {["join", "create"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setStatus(null);
                  }}
                  className={`tab ${activeTab === tab ? "active" : ""}`}
                >
                  {tab === "join" ? "🚪 Join Room" : "✨ Create Room"}
                </button>
              ))}
            </div>
          )}

          {status && (
            <div className={`status ${status.type}`}>
              {status.type === "loading" && "⏳ "}
              {status.type === "success" && "✅ "}
              {status.type === "error" && "❌ "}
              {status.message}
            </div>
          )}

          {!isInstructor || activeTab === "join" ? (
            <form onSubmit={handleJoin}>
              <div className="field">
                <label>Room Code</label>
                <input
                  placeholder="Enter room code"
                  value={joinForm.room_code}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, room_code: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>
                  Password{" "}
                  <span style={{ textTransform: "none" }}>(if required)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={joinForm.room_password}
                  onChange={(e) =>
                    setJoinForm({ ...joinForm, room_password: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={status?.type === "loading"}
                className="btn"
              >
                Join Classroom
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Room Name</label>
                <input
                  placeholder="My Classroom"
                  value={createForm.room_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, room_name: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>
                  Password{" "}
                  <span style={{ textTransform: "none" }}>(optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={createForm.room_password}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      room_password: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Capacity</label>
                <input
                  type="number"
                  placeholder="Max students"
                  min="1"
                  value={createForm.capacity}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, capacity: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={status?.type === "loading"}
                className="btn"
              >
                {status?.type === "loading" ? "Creating…" : "Create Classroom"}
              </button>
            </form>
          )}
        </div>

        {/* My Rooms Panel */}
        <div className="card" onClick={(e) => e.stopPropagation()}>
          <h2 className="card-title">
            {isInstructor
              ? "🏫 My Created Rooms"
              : "📚 Previously Joined Rooms"}
          </h2>

          {roomsLoading ? (
            <div className="spinner"></div>
          ) : myRooms.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "12px",
                margin: "32px 0",
              }}
            >
              {isInstructor
                ? "No rooms yet. Create one to get started."
                : "You haven't joined any rooms yet."}
            </p>
          ) : (
            <div>
              {myRooms.map((room) => {
                const isLive = room.live_status === "live";
                return (
                  <div
                    key={room.id}
                    onClick={(e) => {
                      if (e.target.closest("[data-menu-btn]")) return;
                      if (isInstructor) handleInstructorEnterRoom(room, e);
                      else {
                        setStatus(null);
                        enterRoom(room);
                      }
                    }}
                    className="room-item"
                  >
                    <div className="room-icon">🏫</div>
                    <div className="room-info">
                      <div className="room-header">
                        <p className="room-name">{room.room_name}</p>
                        {isLive ? <LiveBadge /> : <OfflineBadge />}
                      </div>
                      <p className="room-code">
                        {room.room_code}
                        {room.room_password ? " · 🔒" : ""}
                      </p>
                    </div>

                    <div className="room-actions" data-menu-btn>
                      <button
                        data-menu-btn
                        className="room-menu-btn"
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
                      >
                        ···
                      </button>

                      {room._menuOpen && (
                        <div className="room-dropdown">
                          {isInstructor ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMyRooms((prev) =>
                                  prev.map((r) => ({ ...r, _menuOpen: false })),
                                );
                                setDeleteTarget({
                                  id: room.id,
                                  room_name: room.room_name,
                                });
                              }}
                              className="dropdown-action danger"
                              style={{ marginBottom: 0, borderRadius: 0 }}
                            >
                              🗑️ Delete Room
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromList(room);
                              }}
                              className="dropdown-action"
                              style={{ marginBottom: 0, borderRadius: 0 }}
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
  );
}
