import { useEffect, useRef, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { VideoTexture, LinearFilter, SRGBColorSpace } from "three";
import { useRoom } from "../components/roomContext";
import { createRoot } from "react-dom/client";

// ─── VideoMaterial ─────────────────────────────────────────────────────────────
// Key insight: Three.js VideoTexture.needsUpdate must be set to true on EVERY
// render frame — it does NOT auto-update inside React Three Fiber without
// useFrame. Without this, the texture uploads one frame and then freezes,
// showing black or a single frozen frame on the mesh.
function VideoMaterial({ stream }) {
  const matRef = useRef(null);
  const texRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!stream) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;
    videoRef.current = video;

    const tex = new VideoTexture(video);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.colorSpace = SRGBColorSpace;
    texRef.current = tex;

    if (matRef.current) {
      matRef.current.map = tex;
      matRef.current.needsUpdate = true;
    }

    const tryPlay = () => {
      video.play().catch(() => {
        const retry = () => video.play().catch(() => {});
        document.addEventListener("click", retry, {
          once: true,
          capture: true,
        });
        document.addEventListener("keydown", retry, {
          once: true,
          capture: true,
        });
      });
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.pause();
      video.srcObject = null;
      tex.dispose();
      texRef.current = null;
      videoRef.current = null;
      if (matRef.current) {
        matRef.current.map = null;
        matRef.current.needsUpdate = true;
      }
    };
  }, [stream]);

  // ✅ This is the critical fix: tell Three.js to re-upload the video texture
  // to the GPU on every single render frame. Without this, VideoTexture only
  // uploads once and the mesh stays black or frozen.
  useFrame(() => {
    const tex = texRef.current;
    const video = videoRef.current;
    if (!tex || !video || video.readyState < 2) return;
    tex.needsUpdate = true;
  });

  return <meshStandardMaterial ref={matRef} toneMapped={false} />;
}

// ─── Fullscreen overlay ───────────────────────────────────────────────────────
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

// ─── Screen mesh ──────────────────────────────────────────────────────────────
export default function ScreenMesh({ position = [0, 1.8, -7.4] }) {
  const { screenStream } = useRoom();
  const [fullscreen, setFullscreen] = useState(false);
  const isActive = !!screenStream;

  // F key toggles fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if (!screenStream) return;
      const activeTag = document.activeElement?.tagName;
      if (
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT"
      ) {
        return;
      }
      if (e.key.toLowerCase() === "f") {
        e.stopPropagation();
        e.preventDefault();
        setFullscreen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [screenStream]);

  // Fullscreen overlay — rendered outside the Canvas via a portal
  useEffect(() => {
    if (!fullscreen || !screenStream) return;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <FullscreenOverlay
        stream={screenStream}
        onClose={() => setFullscreen(false)}
      />,
    );
    return () => {
      root.unmount();
      document.body.removeChild(container);
    };
  }, [fullscreen, screenStream]);

  return (
    <mesh position={position} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[4.5, 2.2]} />

      {isActive ? (
        <VideoMaterial stream={screenStream} />
      ) : (
        <meshStandardMaterial color="#0a0a0a" toneMapped={false} />
      )}

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
              color: "#475569",
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
          position={[0, -1.2, 0.01]}
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
