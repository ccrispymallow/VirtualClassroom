import { useRef, useState, useCallback } from "react";

export const useMedia = ({ socket, roomCode, userId } = {}) => {
  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setMicOn(true);
      return stream;
    } catch (err) {
      alert("Microphone access denied.");
      return null;
    }
  }, []);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicOn(false);
  }, []);

  const startScreen = useCallback(
    async (onStopCallback) => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30, max: 60 },
            cursor: "always",
          },
          audio: false,
        });

        const [videoTrack] = stream.getVideoTracks();
        if (!videoTrack) {
          stream.getTracks().forEach((t) => t.stop());
          alert(
            "No screen video track was captured. Please try sharing again.",
          );
          return null;
        }

        videoTrack.enabled = true;
        videoTrack.contentHint = "detail";
        screenStreamRef.current = stream;

        // Fired when: user clicks "Stop sharing" in browser UI,
        // OR the capture fails mid-session (MediaStreamTrack ended due to
        // capture failure). Both cases need identical cleanup.
        const handleTrackEnd = () => {
          // Guard: already cleaned up (e.g. stopScreen was called first)
          if (!screenStreamRef.current) return;

          screenStreamRef.current = null;
          setScreenOn(false);

          // Tell the server the share is gone so other users can share
          if (socket && roomCode && userId) {
            socket.emit("screen-share-stop", { roomCode, userId });
          }

          if (onStopCallback) onStopCallback();
        };

        videoTrack.addEventListener("ended", handleTrackEnd, { once: true });

        // Also listen for mute which can precede a capture failure on some
        // browsers — if the track goes muted and then ends, handleTrackEnd
        // above still fires so this is just belt-and-suspenders logging.
        videoTrack.addEventListener("mute", () => {
          console.warn("Screen share track muted — possible capture issue.");
        });

        setScreenOn(true);
        return stream;
      } catch {
        // User clicked Cancel or permission denied — nothing to clean up
        return null;
      }
    },
    [socket, roomCode, userId],
  );

  const stopScreen = useCallback(
    (onStopCallback) => {
      if (!screenStreamRef.current) return;
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenOn(false);

      // Tell the server the share stopped
      if (socket && roomCode && userId) {
        socket.emit("screen-share-stop", { roomCode, userId });
      }

      if (onStopCallback) onStopCallback();
    },
    [socket, roomCode, userId],
  );

  return {
    micStreamRef,
    screenStreamRef,
    micOn,
    screenOn,
    startMic,
    stopMic,
    startScreen,
    stopScreen,
  };
};
