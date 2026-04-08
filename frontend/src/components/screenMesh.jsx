import { useEffect, useRef, useCallback, useState } from "react";
import { Html } from "@react-three/drei";
import { VideoTexture, LinearFilter, SRGBColorSpace } from "three";
import { useRoom } from "../components/roomContext";
import { createRoot } from "react-dom/client";

function VideoMaterial({ stream }) {
  const matRef = useRef(null);

  useEffect(() => {
    if (!stream || !matRef.current) return;

    // Guard: make sure the stream actually has live video tracks before we
    // create a VideoTexture. An ended / empty stream causes the WebGL error:
    // "INVALID_VALUE: texImage2D: no video"
    const videoTracks = stream.getVideoTracks();
    if (!videoTracks.length || videoTracks[0].readyState === "ended") return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;

    let tex = null;
    let rafId = null;

    const attachTexture = () => {
      if (!matRef.current) return;

      tex = new VideoTexture(video);
      tex.minFilter = LinearFilter;
      tex.magFilter = LinearFilter;
      tex.colorSpace = SRGBColorSpace;

      matRef.current.map = tex;
      matRef.current.needsUpdate = true;

      // Pump texture updates until the video is genuinely playing.
      // Without this, R3F's VideoTexture update doesn't fire until the
      // first decoded frame arrives — the mesh stays black for seconds.
      const pumpTexture = () => {
        if (!matRef.current || !tex) return;
        tex.needsUpdate = true;
        matRef.current.needsUpdate = true;
        // Keep pumping while the video hasn't started playing yet
        if (video.paused || video.readyState < 2) {
          rafId = requestAnimationFrame(pumpTexture);
        }
      };
      rafId = requestAnimationFrame(pumpTexture);
    };

    const tryPlay = () => {
      video
        .play()
        .then(() => {
          // Video is now playing — safe to create the texture
          attachTexture();
        })
        .catch(() => {
          // Autoplay blocked — retry on next user gesture
          const retry = () => {
            video
              .play()
              .then(attachTexture)
              .catch(() => {});
          };
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

    // Wait for the video to have decoded frame data before playing
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    // If the track ends (sharer stops), clean up immediately
    const onTrackEnded = () => {
      video.pause();
      video.srcObject = null;
    };
    videoTracks[0].addEventListener("ended", onTrackEnded);

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener("canplay", tryPlay);
      videoTracks[0].removeEventListener("ended", onTrackEnded);
      video.pause();
      video.srcObject = null;
      if (tex) {
        tex.dispose();
        tex = null;
      }
      if (matRef.current) {
        matRef.current.map = null;
        matRef.current.needsUpdate = true;
      }
    };
  }, [stream]);

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

  // Close fullscreen automatically when the stream goes away
  useEffect(() => {
    if (!screenStream && fullscreen) {
      setFullscreen(false);
    }
  }, [screenStream, fullscreen]);

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

  // Fullscreen overlay
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
