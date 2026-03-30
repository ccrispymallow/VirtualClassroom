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

  const startScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = stream;
      // Auto-stop when user clicks browser's "Stop sharing"
      stream.getVideoTracks()[0].onended = () => {
        screenStreamRef.current = null;
        setScreenOn(false);
      };
      setScreenOn(true);
      return stream;
    } catch (err) {
      return null;
    }
  }, []);

  const stopScreen = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
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
