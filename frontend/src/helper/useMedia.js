import { useRef, useState, useCallback } from "react";

/**
 * KEY INSIGHT FROM GITHUB CODE:
 *
 * Hearing others has NOTHING to do with your mic stream.
 * It works via PeerJS: peer.on('call') → call.answer(yourStream) → call.on('stream') → play their audio.
 *
 * Bug 1 fix: answer() incoming calls with an empty stream when mic is off,
 *            so the incoming audio channel still opens.
 * Bug 2 fix: when mic restarts, replace the track on ALL existing calls
 *            instead of creating new calls (avoids broken duplicate connections).
 */

export const useMedia = (peerRef, socketRef) => {
  const micStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Stores active PeerJS call objects: { [peerId]: call }
  const activeCallsRef = useRef({});

  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  // ─────────────────────────────────────────────
  // INCOMING CALL HANDLER
  // Call this once when peer is ready, e.g. inside your room-join useEffect:
  //   setupIncomingCallHandler()
  // ─────────────────────────────────────────────
  const setupIncomingCallHandler = useCallback(() => {
    if (!peerRef?.current) return;

    peerRef.current.on("call", (call) => {
      // Answer with current mic stream if available, otherwise an empty stream.
      // This is what lets you HEAR others even when your mic is off.
      const streamToSend = micStreamRef.current || new MediaStream();
      call.answer(streamToSend);

      // Store the call so we can replace tracks later (Bug 2 fix)
      activeCallsRef.current[call.peer] = call;

      // Play incoming audio/video from the remote peer
      call.on("stream", (remoteStream) => {
        // You need to attach remoteStream to an <audio> or <video> element.
        // Example: document.getElementById(`audio-${call.peer}`).srcObject = remoteStream
        // Wire this up however your UI handles remote streams.
        console.log("Receiving stream from", call.peer, remoteStream);
      });

      call.on("close", () => {
        delete activeCallsRef.current[call.peer];
      });
    });
  }, [peerRef]);

  // ─────────────────────────────────────────────
  // CALL A NEW USER (mirrors connectToNewUser in GitHub)
  // Call this when a new peer joins the room.
  // ─────────────────────────────────────────────
  const callPeer = useCallback(
    (peerId, stream, type = "audio") => {
      if (!peerRef?.current) return;
      const options = { metadata: { type } };
      const call = peerRef.current.call(peerId, stream, options);

      activeCallsRef.current[peerId] = call;

      call.on("stream", (remoteStream) => {
        console.log("Receiving stream from", peerId, remoteStream);
        // Attach remoteStream to your UI here
      });

      call.on("close", () => {
        delete activeCallsRef.current[peerId];
      });
    },
    [peerRef],
  );

  // ─────────────────────────────────────────────
  // MIC — start
  // ─────────────────────────────────────────────
  const startMic = useCallback(
    async (playerKeys = []) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        micStreamRef.current = stream;
        const newTrack = stream.getAudioTracks()[0];

        // BUG 2 FIX:
        // Instead of creating brand-new PeerJS calls (which breaks existing connections),
        // replace the audio track on every existing call's sender.
        const existingPeerIds = Object.keys(activeCallsRef.current);

        if (existingPeerIds.length > 0) {
          // There are already active calls — replace the track on each one
          existingPeerIds.forEach((peerId) => {
            const call = activeCallsRef.current[peerId];
            // Access the underlying RTCPeerConnection
            const pc = call.peerConnection;
            if (!pc) return;

            const sender = pc
              .getSenders()
              .find((s) => s.track && s.track.kind === "audio");

            if (sender) {
              // Hot-swap the track — no renegotiation needed
              sender.replaceTrack(newTrack);
            } else {
              // No audio sender yet (call was answered with empty stream)
              // Add the track so audio flows from now on
              pc.addTrack(newTrack, stream);
            }
          });
        } else if (playerKeys.length > 0) {
          // BUG 1 FIX:
          // First time turning on mic and there are peers — call them now.
          // (Normally you'd call peers immediately when they join,
          //  passing an empty stream so the channel is ready before mic is on.)
          playerKeys.forEach((key) => {
            callPeer(key.peerId, stream, "audio");
          });
        }

        setMicOn(true);
        return stream;
      } catch (err) {
        if (err.message === "Permission denied") {
          alert("Please allow microphone access from browser to use the mic.");
        } else if (err.message === "Device in use") {
          alert("Microphone is already in use by another app.");
        }
        console.error(err);
        return null;
      }
    },
    [callPeer],
  );

  // ─────────────────────────────────────────────
  // MIC — stop (mute)
  // Stops local tracks but keeps the PeerJS call alive
  // so incoming audio from others continues to work.
  // ─────────────────────────────────────────────
  const stopMic = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    // ✅ Do NOT close activeCallsRef — that would cut off incoming audio (Bug 1)
    setMicOn(false);
  }, []);

  // ─────────────────────────────────────────────
  // SCREEN SHARE — start
  // ─────────────────────────────────────────────
  const startScreen = useCallback(
    async (playerKeys = [], peerConn = [], onStopCallback) => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { max: 1920 }, height: { max: 1080 } },
          audio: true,
        });

        screenStreamRef.current = stream;

        // Notify other peers via data channel (matches GitHub pattern)
        peerConn.forEach((conn) => {
          conn.send({
            type: "screen",
            screen: true,
            peerId: peerRef?.current?.id,
          });
        });

        // Call each peer with the screen stream
        playerKeys.forEach((key) => {
          callPeer(key.peerId, stream, "screen");
        });

        // Browser's native "Stop sharing" button
        stream.getVideoTracks()[0].onended = () => {
          screenStreamRef.current = null;
          setScreenOn(false);
          if (onStopCallback) onStopCallback();
        };

        setScreenOn(true);
        return stream;
      } catch (err) {
        console.error(err);
        return null; // User cancelled
      }
    },
    [peerRef, callPeer],
  );

  // ─────────────────────────────────────────────
  // SCREEN SHARE — stop
  // ─────────────────────────────────────────────
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
    callPeer,
    setupIncomingCallHandler, // ← call this once when peer is ready
    activeCallsRef,
  };
};
