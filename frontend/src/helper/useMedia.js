import { useRef, useState, useCallback } from "react";

export const useMedia = () => {
  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const startMic = useCallback(
    async (activeCallsRef = null, deviceId = undefined) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        });

        micStreamRef.current = stream;
        const newTrack = stream.getAudioTracks()[0];

        if (activeCallsRef?.current) {
          Object.values(activeCallsRef.current).forEach((call) => {
            const pc = call.peerConnection;
            if (!pc) return;

            const sender = pc
              .getSenders()
              .find((s) => s.track?.kind === "audio");

            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, stream);
            }
          });
        }

        setMicOn(true);
        return stream;
      } catch (err) {
        if (
          err.name === "NotAllowedError" ||
          err.message === "Permission denied"
        ) {
          alert("Please allow microphone access from browser to use the mic.");
        } else if (err.message === "Device in use") {
          alert(
            "Microphone is already in use, please close all other apps using the microphone.",
          );
        }
        console.error(err);
        return null;
      }
    },
    [],
  );

  const acquireMicSilently = useCallback(
    async (activeCallsRef = null, deviceId = undefined) => {
      if (micStreamRef.current) return micStreamRef.current; // already acquired
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        });

        // Immediately disable the track — user hasn't turned on mic yet
        stream.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });

        micStreamRef.current = stream;
        const newTrack = stream.getAudioTracks()[0];

        // Inject into any already-open peer connections
        if (activeCallsRef?.current) {
          Object.values(activeCallsRef.current).forEach((call) => {
            const pc = call.peerConnection;
            if (!pc) return;
            const sender = pc
              .getSenders()
              .find((s) => s.track?.kind === "audio");
            if (sender) {
              sender.replaceTrack(newTrack);
            } else {
              pc.addTrack(newTrack, stream);
            }
          });
        }

        // micOn stays false — track is present but disabled
        return stream;
      } catch (err) {
        // Silent fail — user hasn't explicitly asked for mic yet
        console.warn("Silent mic acquire failed:", err);
        return null;
      }
    },
    [],
  );

  const stopMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
    }
    setMicOn(false);
  }, []);

  const unmuteMic = useCallback(
    async (activeCallsRef = null, deviceId = undefined) => {
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
        setMicOn(true);

        if (activeCallsRef?.current) {
          const currentTrack = micStreamRef.current.getAudioTracks()[0];
          if (currentTrack) {
            Object.values(activeCallsRef.current).forEach((call) => {
              const pc = call.peerConnection;
              if (!pc) return;
              const sender = pc
                .getSenders()
                .find((s) => s.track?.kind === "audio");
              if (sender) {
                sender.replaceTrack(currentTrack);
              } else {
                pc.addTrack(currentTrack, micStreamRef.current);
              }
            });
          }
        }

        return micStreamRef.current;
      }

      return startMic(activeCallsRef, deviceId);
    },
    [startMic],
  );

  const stopMicFully = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setMicOn(false);
  }, []);

  const startScreen = useCallback(async (onStopCallback) => {
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
        alert("No screen video track was captured. Please try sharing again.");
        return null;
      }

      videoTrack.enabled = true;
      videoTrack.contentHint = "detail";
      screenStreamRef.current = stream;

      // Browser's native "Stop sharing" button
      videoTrack.onended = () => {
        screenStreamRef.current = null;
        setScreenOn(false);
        if (onStopCallback) onStopCallback();
      };

      setScreenOn(true);
      return stream;
    } catch (err) {
      console.error(err);
      return null; // User cancelled — no alert needed
    }
  }, []);

  const stopScreen = useCallback((onStopCallback) => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
    if (onStopCallback) onStopCallback();
  }, []);

  return {
    micStreamRef,
    screenStreamRef,
    micOn,
    screenOn,
    startMic,
    acquireMicSilently, // NEW — call this when user joins room
    stopMic, // mute — track stays alive, you still hear others
    unmuteMic, // unmute — re-enables same track, no reconnect needed
    stopMicFully, // full stop — use when leaving room only
    startScreen,
    stopScreen,
  };
};
