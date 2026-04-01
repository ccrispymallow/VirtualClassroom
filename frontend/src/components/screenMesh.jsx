import { useRef, useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { VideoTexture, LinearFilter } from "three";
import { Html } from "@react-three/drei";
import { useRoom } from "../components/roomContext";

function FullscreenOverlay({ stream, onClose }) {
  const videoRef = useCallback(
    (el) => {
      if (el && stream) {
        el.srcObject = stream;
        el.play().catch(() => {});
      }
    },
    [stream],
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: "16px",
          right: "20px",
          zIndex: 1000000,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: "8px",
          color: "#fff",
          fontSize: "18px",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        title="Close fullscreen (F)"
      >
        ✕
      </button>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100vw", height: "100vh", objectFit: "contain" }}
      />
    </div>
  );
}

export default function ScreenMesh({ position = [0, 2, -8] }) {
  const { screenStream } = useRoom();
  const meshRef = useRef();
  const [fullscreen, setFullscreen] = useState(false);

  // F key toggles fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "f") {
        e.stopPropagation();
        e.preventDefault();
        setFullscreen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // 3D mesh texture
  useEffect(() => {
    if (!screenStream || !meshRef.current) return;
    const video = document.createElement("video");
    video.srcObject = screenStream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});

    const texture = new VideoTexture(video);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    meshRef.current.material.map = texture;
    meshRef.current.material.needsUpdate = true;

    return () => {
      video.pause();
      video.srcObject = null;
      texture.dispose();
      if (meshRef.current) {
        meshRef.current.material.map = null;
        meshRef.current.material.needsUpdate = true;
      }
    };
  }, [screenStream]);

  // Mount/unmount fullscreen overlay completely outside R3F
  useEffect(() => {
    if (!fullscreen || !screenStream) return;

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const close = () => setFullscreen(false);
    root.render(<FullscreenOverlay stream={screenStream} onClose={close} />);

    return () => {
      root.unmount();
      document.body.removeChild(container);
    };
  }, [fullscreen, screenStream]);

  const isActive = !!screenStream;

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[6, 3.375]} />
      <meshStandardMaterial
        color={isActive ? "#ffffff" : "#0b0f1a"}
        toneMapped={false}
      />

      {/* Only render 3D labels when NOT in fullscreen */}
      {!fullscreen && !isActive && (
        <Html
          transform
          occlude
          distanceFactor={8}
          position={[0, 0, 0.01]}
          center
        >
          <div
            style={{
              color: "#334155",
              fontSize: "13px",
              fontFamily: "sans-serif",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            No screen share active
          </div>
        </Html>
      )}

      {!fullscreen && isActive && (
        <Html
          transform
          occlude
          distanceFactor={8}
          position={[0, -1.9, 0.01]}
          center
        >
          <div
            style={{
              color: "#475569",
              fontSize: "10px",
              fontFamily: "sans-serif",
              pointerEvents: "none",
              background: "rgba(11,15,26,0.6)",
              padding: "2px 8px",
              borderRadius: "6px",
            }}
          >
            Press F for fullscreen
          </div>
        </Html>
      )}
    </mesh>
  );
}
