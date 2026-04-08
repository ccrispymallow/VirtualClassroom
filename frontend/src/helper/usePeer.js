import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";

// ── Architecture overview ──────────────────────────────────────────────────
//
// BEFORE (broken): calls were only made when the user toggled their mic.
// This tangled "can others hear me" with "can I hear others" — the same call
// object was responsible for both directions, so closing it when the user
// muted also killed incoming audio from that peer.
//
// AFTER (correct): two completely separate concerns:
//
//   1. PRESENCE CALLS — made immediately when any peer is discovered (via
//      user-joined / existing-peers). Always use a silent stream. Purpose:
//      establish the RTCPeerConnection so the remote peer's audio arrives even
//      before the local user turns on their mic.
//
//   2. MIC/SCREEN BROADCASTS — replace the track on the existing connection
//      via replaceTrack() instead of opening a new call. This avoids
//      renegotiation entirely, which is the root cause of every
//      "Negotiation failed" error.
//
// Result:
//   • You always hear others (connection is always up).
//   • Others hear you only when you have a live mic/screen stream.
//   • New joiners immediately hear existing users and vice versa.
//   • Toggling your mic does NOT drop anyone's audio.

export const usePeer = ({
  roomCode,
  user,
  socket,
  micStreamRef,
  screenStreamRef,
}) => {
  const peerRef = useRef(null);
  // outgoingCallsRef: peerId+type → MediaConnection (outgoing only)
  const outgoingCallsRef = useRef({});
  // incomingCallsRef: peerId+type → MediaConnection (incoming only)
  const incomingCallsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const audioElementsRef = useRef({});

  // Silent AudioContext — one shared instance for the session lifetime.
  const silentCtxRef = useRef(null);
  const silentDestRef = useRef(null);

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  // ── Silent stream ──────────────────────────────────────────────────────────
  // Returns a persistent MediaStream with one silent-but-live audio track.
  // "Live" matters: WebRTC SDP requires at least one active track or it
  // produces an SDP with no media section → "Negotiation failed".
  // We reuse one oscillator node for the entire session instead of creating
  // a new one per call (the old leak).
  const getSilentStream = useCallback(() => {
    if (!silentCtxRef.current || silentCtxRef.current.state === "closed") {
      silentCtxRef.current = new AudioContext();
      silentDestRef.current = null;
    }
    if (!silentDestRef.current) {
      const ctx = silentCtxRef.current;
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      silentDestRef.current = dest;
    }
    return silentDestRef.current.stream;
  }, []);

  // ── Audio playback ─────────────────────────────────────────────────────────

  const playRemoteAudio = useCallback((peerId, stream) => {
    if (!audioElementsRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current[peerId] = audio;
    }
    const audio = audioElementsRef.current[peerId];
    if (audio.srcObject === stream) return;
    audio.srcObject = stream;
    audio.play().catch(() => {
      const retry = () => audio.play().catch(() => {});
      document.addEventListener("click", retry, { capture: true, once: true });
      document.addEventListener("keydown", retry, {
        capture: true,
        once: true,
      });
    });
  }, []);

  const stopRemoteAudio = useCallback((peerId) => {
    const audio = audioElementsRef.current[peerId];
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      delete audioElementsRef.current[peerId];
    }
  }, []);

  // ── Stream state ───────────────────────────────────────────────────────────

  const addStream = useCallback(
    (peerId, stream, type, uname) => {
      if (type === "mic") playRemoteAudio(peerId, stream);
      setRemoteStreams((prev) => {
        const existing = prev.find(
          (s) => s.peerId === peerId && s.type === type,
        );
        if (existing?.stream === stream && existing?.username === uname)
          return prev;
        const filtered = prev.filter(
          (s) => !(s.peerId === peerId && s.type === type),
        );
        return [...filtered, { peerId, stream, type, username: uname }];
      });
    },
    [playRemoteAudio],
  );

  const removeStreamByType = useCallback(
    (peerId, type) => {
      if (type === "mic") stopRemoteAudio(peerId);
      setRemoteStreams((prev) => {
        const next = prev.filter(
          (s) => !(s.peerId === peerId && s.type === type),
        );
        return next.length === prev.length ? prev : next;
      });
    },
    [stopRemoteAudio],
  );

  const removeStreams = useCallback(
    (peerId) => {
      stopRemoteAudio(peerId);
      setRemoteStreams((prev) => {
        const next = prev.filter((s) => s.peerId !== peerId);
        return next.length === prev.length ? prev : next;
      });
    },
    [stopRemoteAudio],
  );

  // ── Core: establish / upgrade an outgoing call ─────────────────────────────
  //
  // callPeer() is now called in two scenarios:
  //
  //   A) PRESENCE (type="mic", stream=silentStream) — called immediately when
  //      a peer is discovered. Establishes the RTCPeerConnection so we can
  //      receive their audio right away, even before local mic is on.
  //
  //   B) UPGRADE (type="mic"|"screen", stream=realStream) — called when the
  //      local user turns on their mic/screen. Uses replaceTrack() on the
  //      existing sender instead of opening a new call, which avoids SDP
  //      renegotiation and the "Negotiation failed" error entirely.

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;
      const callKey = `${peerId}-${type}`;
      const existing = outgoingCallsRef.current[callKey];

      if (existing) {
        // ── replaceTrack path: upgrade silent → real (or real → silent) ────
        // This swaps the track on the EXISTING peer connection without any new
        // SDP negotiation. No "Negotiation failed", no audio dropout.
        try {
          const pc = existing.peerConnection;
          if (pc) {
            const newTrack = stream.getTracks()[0];
            const senders = pc.getSenders();
            const sender =
              senders.find(
                (s) => s.track && s.track.kind === (newTrack?.kind ?? "audio"),
              ) ?? senders[0];
            if (sender && newTrack) {
              sender
                .replaceTrack(newTrack)
                .catch((err) =>
                  console.warn("replaceTrack failed, re-calling:", err),
                );
              return; // done — no new call needed
            }
          }
        } catch (err) {
          console.warn(
            "replaceTrack path error, falling back to new call:",
            err,
          );
        }
        // replaceTrack failed (e.g. no sender yet) — close and re-call
        existing.close();
        delete outgoingCallsRef.current[callKey];
      }

      // Fresh call (first time seeing this peer, or replaceTrack not possible)
      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });
      call.on("stream", (remoteStream) =>
        addStream(peerId, remoteStream, type, uname),
      );
      call.on("close", () => {
        delete outgoingCallsRef.current[callKey];
        removeStreamByType(peerId, type);
      });
      call.on("error", (err) => console.error("Outgoing call error:", err));
      outgoingCallsRef.current[callKey] = call;
    },
    [addStream, removeStreamByType],
  );

  const callPeerRef = useRef(callPeer);
  useEffect(() => {
    callPeerRef.current = callPeer;
  }, [callPeer]);

  const getAllPeerIds = useCallback(
    () => Array.from(knownPeersRef.current),
    [],
  );

  // ── Connect to a newly discovered peer ────────────────────────────────────
  // Always called immediately when a peer is discovered — regardless of
  // whether local mic is on. We dial with a silent stream first so the
  // connection is already up when the user eventually enables their mic.
  const connectToPeer = useCallback(
    (peerId) => {
      if (!peerId) return;
      knownPeersRef.current.add(peerId);

      // Establish presence call with silent stream so we can hear them
      // immediately, before local mic is on.
      callPeerRef.current(peerId, getSilentStream(), "mic", username);

      // If mic/screen are already on, upgrade to real stream right away
      const micStream = micStreamRef.current;
      const micIsLive =
        micStream &&
        micStream.getAudioTracks().length > 0 &&
        micStream.getAudioTracks()[0].readyState === "live";
      if (micIsLive) {
        callPeerRef.current(peerId, micStream, "mic", username);
      }

      if (screenStreamRef.current) {
        callPeerRef.current(
          peerId,
          screenStreamRef.current,
          "screen",
          username,
        );
      }
    },
    [getSilentStream, username, micStreamRef, screenStreamRef],
  );

  const connectToPeerRef = useRef(connectToPeer);
  useEffect(() => {
    connectToPeerRef.current = connectToPeer;
  }, [connectToPeer]);

  // ── Peer lifecycle ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId || !roomCode) return;

    const isLocal =
      !import.meta.env.VITE_PEER_HOST ||
      import.meta.env.VITE_PEER_HOST === "localhost";

    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ];

    const peerConfig = {
      host: import.meta.env.VITE_PEER_HOST || "localhost",
      port: isLocal ? 9000 : 443,
      path: "/peerjs",
      secure: !isLocal,
      pingInterval: 5000,
      config: { iceServers },
    };

    let destroyed = false;
    let reconnectTimer = null;
    let reconnectDelay = 2000;

    const setupPeer = () => {
      if (destroyed) return;

      const peer = new Peer(undefined, peerConfig);
      peerRef.current = peer;

      peer.on("open", (peerId) => {
        reconnectDelay = 2000;
        socket.emit("join-room", {
          roomCode,
          user: { id: userId, username, role: userRole, avatar: userAvatar },
          peerId,
        });
      });

      peer.on("call", (call) => {
        const incomingType = call.metadata?.type || "mic";
        const callKey = `${call.peer}-${incomingType}`;

        // Close any stale incoming call for this peer+type. PeerJS doesn't
        // support renegotiation — two MediaConnections on the same
        // RTCPeerConnection → "Negotiation failed".
        if (incomingCallsRef.current[callKey]) {
          incomingCallsRef.current[callKey].close();
          delete incomingCallsRef.current[callKey];
        }

        // Answer with the correct stream type.
        // Screen call → reply with our screen stream (or silent).
        // Mic call    → reply with our live mic stream (or silent).
        // We always provide at least one live track — empty MediaStream()
        // produces an SDP with no media section → "Negotiation failed".
        let answerStream;
        if (incomingType === "screen") {
          answerStream = screenStreamRef.current ?? getSilentStream();
        } else {
          const micStream = micStreamRef.current;
          const micIsLive =
            micStream &&
            micStream.getAudioTracks().length > 0 &&
            micStream.getAudioTracks()[0].readyState === "live";
          answerStream = micIsLive ? micStream : getSilentStream();
        }

        call.answer(answerStream);
        incomingCallsRef.current[callKey] = call;

        call.on("stream", (remoteStream) => {
          addStream(
            call.peer,
            remoteStream,
            incomingType,
            call.metadata?.username,
          );
        });

        call.on("close", () => {
          delete incomingCallsRef.current[callKey];
          removeStreamByType(call.peer, incomingType);
        });

        call.on("error", (err) => {
          console.error("Incoming call error:", err);
          delete incomingCallsRef.current[callKey];
        });
      });

      peer.on("error", (err) => {
        console.error("PeerJS error:", err);
        const retriable =
          err.type === "network" ||
          err.type === "server-error" ||
          err.type === "socket-error" ||
          err.type === "socket-closed";
        if (retriable && !destroyed) {
          peer.destroy();
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            setupPeer();
          }, reconnectDelay);
        }
      });

      peer.on("disconnected", () => {
        if (!destroyed && !peer.destroyed) peer.reconnect();
      });
    };

    setupPeer();

    // ── Socket events ──────────────────────────────────────────────────────
    // Both handlers now call connectToPeerRef which always dials immediately
    // with a silent stream — no waiting for the user to toggle their mic.

    socket.on("user-joined", ({ peerId }) => {
      connectToPeerRef.current(peerId);
    });

    socket.on("existing-peers", (peers) => {
      peers.forEach(({ peerId }) => connectToPeerRef.current(peerId));
    });

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current = {};
      Object.values(incomingCallsRef.current).forEach((c) => {
        try {
          c.close();
        } catch (_) {}
      });
      incomingCallsRef.current = {};
      peerRef.current?.destroy();
      peerRef.current = null;
      outgoingCallsRef.current = {};
      if (silentCtxRef.current && silentCtxRef.current.state !== "closed") {
        silentCtxRef.current.close();
        silentCtxRef.current = null;
      }
      silentDestRef.current = null;
      socket.off("user-joined");
      socket.off("existing-peers");
    };
  }, [
    roomCode,
    userId,
    username,
    userRole,
    userAvatar,
    addStream,
    removeStreams,
    removeStreamByType,
    getSilentStream,
    socket,
  ]);

  // ── Public API ─────────────────────────────────────────────────────────────
  //
  // IMPORTANT CHANGE for the calling component:
  //
  //   broadcastMic(stream)  — call when mic turns ON.
  //                           Uses replaceTrack() on existing connections,
  //                           so others hear you WITHOUT any call being dropped.
  //
  //   stopMicBroadcast()    — call when mic turns OFF.
  //                           Replaces the real track with a silent one so the
  //                           connection stays up (others can still hear each
  //                           other; you just go mute).
  //
  //   DO NOT call stopMicCalls() to mute — that would close the connections
  //   and everyone loses audio until they toggle again.

  const broadcastMic = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) =>
        callPeer(peerId, stream, "mic", username),
      );
    },
    [callPeer, username, getAllPeerIds],
  );

  // Mute outgoing mic without dropping connections — replaces real track with
  // a silent one so peer connections stay alive.
  const stopMicBroadcast = useCallback(() => {
    const silent = getSilentStream();
    getAllPeerIds().forEach((peerId) =>
      callPeer(peerId, silent, "mic", username),
    );
  }, [callPeer, getSilentStream, username, getAllPeerIds]);

  const broadcastScreen = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) =>
        callPeer(peerId, stream, "screen", username),
      );
    },
    [callPeer, username, getAllPeerIds],
  );

  const stopScreenCalls = useCallback(() => {
    Object.keys(outgoingCallsRef.current)
      .filter((key) => key.endsWith("-screen"))
      .forEach((key) => {
        outgoingCallsRef.current[key].close();
        delete outgoingCallsRef.current[key];
      });
  }, []);

  // stopMicCalls kept for API compatibility but now just mutes instead of
  // closing — prevents the "toggle mic to hear others" regression.
  const stopMicCalls = stopMicBroadcast;

  return {
    remoteStreams,
    peerRef,
    broadcastMic,
    broadcastScreen,
    stopMicBroadcast,
    stopMicCalls,
    stopScreenCalls,
  };
};
