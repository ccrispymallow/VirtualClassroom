import { useRef, useState, useCallback } from "react";

export const useMedia = () => {
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

  // Add 'onStopCallback' as a parameter
  const startScreen = useCallback(async (onStopCallback) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setScreenOn(false);
        if (onStopCallback) onStopCallback();
      };

      setScreenOn(true);
      return stream;
    } catch (err) {
      return null; // User clicked Cancel
    }
  }, []);

  // Also add it to the manual stop function just in case
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
    stopMic,
    startScreen,
    stopScreen,
  };
};
