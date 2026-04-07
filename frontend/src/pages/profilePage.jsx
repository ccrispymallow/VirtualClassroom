import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import "../App.css"; // Ensure styles are imported

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_PATHS = {
  boy: "/boy.glb",
  girl: "/girl.glb",
};

const AVATAR_OPTIONS = [
  { id: "boy", label: "Boy", icon: "/man.svg", gradientClass: "gradient-boy" },
  {
    id: "girl",
    label: "Girl",
    icon: "/woman.svg",
    gradientClass: "gradient-girl",
  },
];

const CAMERA_CONFIG = { position: [0, 1.6, 2.8], fov: 50 };

Object.values(MODEL_PATHS).forEach((path) => {
  try {
    useGLTF.preload(path);
  } catch {
    /* use fallback */
  }
});

// ─── Procedural fallback avatars ──────────────────────────────────────────────

const SKIN = "#fdbcb4";

function BoyAvatar() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#a39181" />
      </mesh>
      {[
        [-0.25, 0.9],
        [0.25, 0.9],
      ].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      ))}
      {[
        [-0.1, 0.3],
        [0.1, 0.3],
      ].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0]}>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
    </group>
  );
}

function GirlAvatar() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={SKIN} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.35, 0.7, 32]} />
        <meshStandardMaterial color="#a39181" />
      </mesh>
      {[
        [-0.25, 0.9],
        [0.25, 0.9],
      ].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      ))}
      {[
        [-0.1, 0.2],
        [0.1, 0.2],
      ].map(([x, y]) => (
        <mesh key={x} position={[x, y, 0]}>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      ))}
    </group>
  );
}

const FallbackAvatars = { boy: BoyAvatar, girl: GirlAvatar };

// ─── 3-D avatar scene components ─────────────────────────────────────────────

function AvatarModel({ avatarType }) {
  const { scene, animations } = useGLTF(MODEL_PATHS[avatarType]);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, clone);

  useEffect(() => {
    const idle = names.includes("Standing") ? "Standing" : names[0];
    if (idle) actions[idle]?.reset().play();
  }, [actions, names]);

  return <primitive object={clone} />;
}

function Avatar3DViewer({ avatarType }) {
  return (
    <Canvas camera={CAMERA_CONFIG}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} />
      <Suspense fallback={null}>
        <AvatarModel key={avatarType} avatarType={avatarType} />
      </Suspense>
      <OrbitControls
        target={[0, 1, 0]}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={3}
      />
    </Canvas>
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function updateUserProfile(userId, payload) {
  const res = await fetch(
    `${import.meta.env.VITE_BACKEND_URL}/api/users/users/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update profile");
  return data.user;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setAvatar] = useState("boy");
  const [previewAvatar, setPreview] = useState("boy");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "{}");
    if (!session.id) {
      // navigate("/");
      // return;
    }
    setUser(session);
    setUsername(session.username ?? "");
    setAvatar(session.avatar ?? "boy");
    setPreview(session.avatar ?? "boy");
  }, [navigate]);

  const handleAvatarSelect = useCallback((id) => {
    setAvatar(id);
    setPreview(id);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const trimmed = username.trim();
      if (!trimmed) {
        setStatus({ type: "error", message: "Username is required" });
        return;
      }
      setLoading(true);
      setStatus({ type: "loading", message: "Saving changes…" });

      try {
        const updatedUser = await updateUserProfile(user.id, {
          username: trimmed,
          avatar: selectedAvatar,
        });
        const newSession = {
          ...user,
          username: updatedUser.username,
          avatar: selectedAvatar,
        };
        localStorage.setItem("userSession", JSON.stringify(newSession));
        setUser(newSession);
        setStatus({
          type: "success",
          message: "Profile updated successfully!",
        });
        setTimeout(() => navigate("/homepage"), 1500);
      } catch (err) {
        setStatus({
          type: "error",
          message: err.message || "Something went wrong",
        });
      } finally {
        setLoading(false);
      }
    },
    [username, selectedAvatar, user, navigate],
  );

  if (!user) return null;

  const selectedOption = AVATAR_OPTIONS.find((o) => o.id === selectedAvatar);

  return (
    <div className="app-wrapper">
      {/* ── Header ── */}
      <header className="profile-header">
        <button onClick={() => navigate("/homepage")} className="nav-brand">
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
        </button>
        <h1>Edit Profile</h1>
        <div className="spacer" aria-hidden />
      </header>

      {/* ── Main grid ── */}
      <main className="profile-layout">
        {/* ── Left: 3-D viewer + avatar picker ── */}
        <div className="profile-panel">
          <div className="viewer-container">
            <div className="viewer-canvas">
              <Avatar3DViewer avatarType={previewAvatar} />
            </div>
          </div>

          <section className="avatar-section">
            <h2>Choose Your Avatar</h2>
            <div className="avatar-grid">
              {AVATAR_OPTIONS.map(({ id, label, icon, gradientClass }) => {
                const isSelected = selectedAvatar === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleAvatarSelect(id)}
                    aria-pressed={isSelected}
                    className={`avatar-btn ${isSelected ? `active ${gradientClass}` : ""}`}
                  >
                    <div className={`avatar-emoji ${gradientClass}`}>
                      <img
                        src={icon}
                        alt={label}
                        style={{
                          width: "28px",
                          height: "28px",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="avatar-hint">
              Select an avatar that will appear in the classroom
            </p>
          </section>
        </div>

        {/* ── Right: form ── */}
        <div className="profile-panel">
          <div className="profile-card">
            <h2>Profile Information</h2>

            <form onSubmit={handleSubmit}>
              <div>
                <label
                  className="field-hint"
                  style={{
                    marginTop: 0,
                    marginBottom: "8px",
                    textTransform: "uppercase",
                  }}
                >
                  Current Avatar
                </label>
                <div
                  className={`current-avatar-badge ${selectedOption?.gradientClass}`}
                >
                  {selectedOption && (
                    <img
                      src={selectedOption.icon}
                      alt={selectedOption.label}
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="field">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
                <span className="field-hint">
                  This name will be visible to others in the classroom
                </span>
              </div>

              <div className="field">
                <label>Email</label>
                <input type="email" value={user.email ?? ""} disabled />
              </div>

              <div className="field">
                <label>Role</label>
                <input
                  type="text"
                  value={user.role ?? ""}
                  disabled
                  style={{ textTransform: "capitalize" }}
                />
              </div>

              {status && (
                <div
                  className={`status ${status.type}`}
                  style={{ marginTop: "16px" }}
                >
                  {status.type === "loading"}
                  {status.type === "success"}
                  {status.type === "error"}
                  {status.message}
                </div>
              )}

              <div className="button-group">
                <button
                  type="button"
                  onClick={() => navigate("/homepage")}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn">
                  {loading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
