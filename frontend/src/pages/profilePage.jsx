import { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const boyModelPath = "/boy.glb";
const girlModelPath = "/girl.glb";

// Fallback avatar models
const BoyAvatar = () => {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.2]} />
        <meshStandardMaterial color="#4a90e2" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      <mesh position={[0.25, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh position={[0.1, 0.3, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
};

const GirlAvatar = () => {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      {/* Body - dress */}
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.35, 0.7, 32]} />
        <meshStandardMaterial color="#e2458a" />
      </mesh>
      {/* Arms */}
      <mesh position={[-0.25, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      <mesh position={[0.25, 0.9, 0]}>
        <boxGeometry args={[0.08, 0.4, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
      <mesh position={[0.1, 0.2, 0]}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#fdbcb4" />
      </mesh>
    </group>
  );
};

// Avatar model component with error handling
const AvatarModel = ({ avatarType }) => {
  try {
    const modelUrl = avatarType === "boy" ? boyModelPath : girlModelPath;
    const { scene } = useGLTF(modelUrl);
    const clonedScene = scene.clone();
    return <primitive object={clonedScene} />;
  } catch {
    // Fallback to procedural models if GLB loading fails
    return avatarType === "boy" ? <BoyAvatar /> : <GirlAvatar />;
  }
};

// Preload models with error handling
try {
  useGLTF.preload(boyModelPath);
} catch {
  // Silently fail, will use fallback
}
try {
  useGLTF.preload(girlModelPath);
} catch {
  // Silently fail, will use fallback
}

const Avatar3DViewer = ({ avatarType }) => {
  return (
    <Canvas camera={{ position: [0, 1.6, 2.8], fov: 50 }}>
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
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("boy");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState("boy");

  const avatarOptions = [
    { id: "boy", label: "Boy", color: "from-blue-500 to-blue-600" },
    { id: "girl", label: "Girl", color: "from-pink-500 to-pink-600" },
  ];

  // Load user data from localStorage
  useEffect(() => {
    const userSession = JSON.parse(localStorage.getItem("userSession") || "{}");
    if (!userSession.id) {
      navigate("/");
      return;
    }
    setUser(userSession);
    setUsername(userSession.username || "");
    setSelectedAvatar(userSession.avatar || "boy");
    setPreviewAvatar(userSession.avatar || "boy");
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setStatus({ type: "error", message: "Username is required" });
      return;
    }

    setLoading(true);
    setStatus({ type: "loading", message: "Saving changes..." });

    try {
      const response = await fetch(`/api/users/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          avatar: selectedAvatar,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update localStorage with new user data
      const updatedUser = {
        ...user,
        username: data.user.username,
        avatar: selectedAvatar,
      };
      localStorage.setItem("userSession", JSON.stringify(updatedUser));

      setStatus({
        type: "success",
        message: "Profile updated successfully!",
      });

      setTimeout(() => {
        navigate("/homepage");
      }, 1500);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0b0f1a] px-4 py-6">
      <div className="flex items-center justify-between max-w-6xl mx-auto mb-12">
        <button
          onClick={() => navigate("/homepage")}
          className="flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-lg">
            🎓
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-200">
            Virtual<span className="text-cyan-400">Class</span>
          </span>
        </button>
        <h1 className="text-2xl font-bold text-slate-100">Edit Profile</h1>
        <div className="w-9" />
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left section - Avatar Selection */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl overflow-hidden">
              {/* 3D Model Viewer */}
              <div className="h-[400px] bg-gradient-to-br from-[#1a2235] to-[#0f1419]">
                <Avatar3DViewer avatarType={previewAvatar} />
              </div>
            </div>

            {/* Avatar Selection Buttons */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-200 px-2">
                Choose Your Avatar
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {avatarOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedAvatar(option.id);
                      setPreviewAvatar(option.id);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                      selectedAvatar === option.id
                        ? `border-blue-500 bg-gradient-to-br ${option.color} text-white shadow-lg shadow-blue-500/30`
                        : "border-[#1e2d45] bg-[#111827] text-slate-300 hover:border-blue-500/50"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-lg mx-auto mb-2 bg-gradient-to-br ${option.color} flex items-center justify-center text-xl`}
                    >
                      {option.id === "boy" ? "👦" : "👧"}
                    </div>
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 px-2">
                Select an avatar that will appear in the classroom
              </p>
            </div>
          </div>

          {/* Right section - Profile Form */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#111827] border border-[#1e2d45] rounded-2xl p-8">
              <h2 className="text-xl font-semibold text-slate-200 mb-6">
                Profile Information
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                {/* Current Avatar Display */}
                <div className="mb-8">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
                    Current Avatar
                  </p>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-4xl">
                    {selectedAvatar === "boy" ? "👦" : "👧"}
                  </div>
                </div>

                {/* Username Input */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wide mb-3 font-semibold">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    This name will be visible to others in the classroom
                  </p>
                </div>

                {/* Email Display (Read-only) */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wide mb-3 font-semibold">
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-4 py-3 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-500 outline-none text-sm cursor-not-allowed"
                  />
                </div>

                {/* Role Display (Read-only) */}
                <div>
                  <label className="block text-xs text-slate-400 uppercase tracking-wide mb-3 font-semibold">
                    Role
                  </label>
                  <input
                    type="text"
                    value={user.role || ""}
                    disabled
                    className="w-full px-4 py-3 bg-[#0b0f1a] border border-[#1e2d45] rounded-xl text-slate-500 outline-none text-sm cursor-not-allowed capitalize"
                  />
                </div>

                {/* Status Message */}
                {status && (
                  <div
                    className={`p-4 rounded-xl text-sm font-medium ${
                      status.type === "success"
                        ? "bg-green-500/10 text-green-400 border border-green-500/30"
                        : status.type === "error"
                          ? "bg-red-500/10 text-red-400 border border-red-500/30"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {status.message}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate("/homepage")}
                    className="flex-1 px-4 py-3 rounded-xl bg-[#1a2235] text-slate-300 font-semibold hover:bg-[#1e2d45] transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold hover:from-blue-600 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
