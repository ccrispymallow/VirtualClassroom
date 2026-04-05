import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL_PATHS = {
  boy: "/model 2/boy.glb",
  girl: "/model 2/girl.glb",
};

const AVATAR_OPTIONS = [
  {
    id: "boy",
    label: "Boy",
    emoji: "👦",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    id: "girl",
    label: "Girl",
    emoji: "👧",
    gradient: "from-pink-500 to-pink-600",
  },
];

const CAMERA_CONFIG = { position: [0, 1.6, 2.8], fov: 50 };

// Preload both models upfront; failures are silenced — fallbacks handle them.
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
        <meshStandardMaterial color="#4a90e2" />
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
        <meshStandardMaterial color="#e2458a" />
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

/**
 * Tries to load a GLB model; falls back to the procedural mesh on any error.
 * Clones the scene so multiple instances don't share the same object graph.
 */
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
        {/* key forces a full remount when avatarType changes */}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarSelector({ selected, onSelect }) {
  return (
    <section className="space-y-3">
      <h2 className="px-2 text-lg font-semibold text-slate-200">
        Choose Your Avatar
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {AVATAR_OPTIONS.map(({ id, label, emoji, gradient }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-pressed={isSelected}
              className={[
                "rounded-xl border-2 p-4 text-sm font-semibold transition-all",
                isSelected
                  ? `border-blue-500 bg-gradient-to-br ${gradient} text-white shadow-lg shadow-blue-500/30`
                  : "border-[#1e2d45] bg-[#111827] text-slate-300 hover:border-blue-500/50",
              ].join(" ")}
            >
              <div
                className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-xl`}
              >
                {emoji}
              </div>
              {label}
            </button>
          );
        })}
      </div>

      <p className="px-2 text-xs text-slate-500">
        Select an avatar that will appear in the classroom
      </p>
    </section>
  );
}

function ReadOnlyField({ label, value, type = "text" }) {
  return (
    <div>
      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled
        className="w-full cursor-not-allowed rounded-xl border border-[#1e2d45] bg-[#0b0f1a] px-4 py-3 text-sm text-slate-500 outline-none"
      />
    </div>
  );
}

function StatusBanner({ status }) {
  if (!status) return null;

  const styles = {
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    error: "bg-red-500/10   text-red-400   border-red-500/30",
    loading: "bg-blue-500/10  text-blue-400  border-blue-500/30",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-4 text-sm font-medium ${styles[status.type] ?? styles.loading}`}
    >
      {status.message}
    </div>
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

// ─── Custom hook ──────────────────────────────────────────────────────────────

function useProfileForm(navigate) {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setAvatar] = useState("boy");
  const [previewAvatar, setPreview] = useState("boy");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Bootstrap from session storage
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("userSession") || "{}");
    if (!session.id) {
      navigate("/");
      return;
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

  return {
    user,
    username,
    setUsername,
    selectedAvatar,
    previewAvatar,
    handleAvatarSelect,
    loading,
    status,
    handleSubmit,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    user,
    username,
    setUsername,
    selectedAvatar,
    previewAvatar,
    handleAvatarSelect,
    loading,
    status,
    handleSubmit,
  } = useProfileForm(navigate);

  const selectedOption = AVATAR_OPTIONS.find((o) => o.id === selectedAvatar);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0b0f1a] px-4 py-6">
      {/* ── Header ── */}
      <header className="mx-auto mb-12 flex max-w-6xl items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/homepage")}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-lg">
            🎓
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-200">
            Virtual<span className="text-cyan-400">Class</span>
          </span>
        </button>

        <h1 className="text-2xl font-bold text-slate-100">Edit Profile</h1>

        {/* Spacer — keeps the heading visually centred */}
        <div className="w-9" aria-hidden />
      </header>

      {/* ── Main grid ── */}
      <main className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ── Left: 3-D viewer + avatar picker ── */}
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#111827]">
              <div className="h-[400px] bg-gradient-to-br from-[#1a2235] to-[#0f1419]">
                <Avatar3DViewer avatarType={previewAvatar} />
              </div>
            </div>

            <AvatarSelector
              selected={selectedAvatar}
              onSelect={handleAvatarSelect}
            />
          </div>

          {/* ── Right: form ── */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#1e2d45] bg-[#111827] p-8">
              <h2 className="mb-6 text-xl font-semibold text-slate-200">
                Profile Information
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {/* Current avatar badge */}
                <div>
                  <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                    Current Avatar
                  </p>
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${selectedOption?.gradient ?? "from-blue-500 to-cyan-400"} text-4xl`}
                  >
                    {selectedOption?.emoji}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-[#1e2d45] bg-[#0b0f1a] px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500 transition-colors"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    This name will be visible to others in the classroom
                  </p>
                </div>

                <ReadOnlyField
                  label="Email (Read-only)"
                  value={user.email ?? ""}
                  type="email"
                />
                <ReadOnlyField label="Role" value={user.role ?? ""} />

                <StatusBanner status={status} />

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/homepage")}
                    className="flex-1 rounded-xl bg-[#1a2235] px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-[#1e2d45]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
