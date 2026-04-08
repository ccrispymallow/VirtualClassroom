import { useRef, useState, useCallback, useEffect } from "react";

export const useMedia = () => {
  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      micStreamRef.current = stream;
      setMicOn(true);
      return stream;
    } catch {
      alert("Microphone access denied.");
      return null;
    }
  }, []);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicOn(false);
  }, []);

  const startScreen = useCallback(async (onStopCallback) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
          cursor: "always",
        },
        // Audio on display streams often triggers autoplay/policy issues
        // on receivers and is not required for this classroom use case.
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

      videoTrack.onended = () => {
        if (screenStreamRef.current !== stream) return;
        screenStreamRef.current = null;
        setScreenOn(false);
        onStopCallback?.();
      };

      setScreenOn(true);
      return stream;
    } catch {
      return null; // User clicked Cancel
    }
  }, []);

  const stopScreen = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStreamRef.current = null;
    setScreenOn(false);
  }, []);

  useEffect(() => {
    return () => {
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      micStreamRef.current = null;
      screenStreamRef.current = null;
    };
  }, []);

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