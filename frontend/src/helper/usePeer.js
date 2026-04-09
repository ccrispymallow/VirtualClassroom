import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";

export const usePeer = ({
  roomCode,
  user,
  socket,
  micStreamRef,
  screenStreamRef,
  // NEW: callback so the room context can set/clear screenStream for viewers
  onRemoteScreenStream,
}) => {
  const peerRef = useRef(null);
  // callsRef stores ONLY outgoing calls we initiated.
  // Incoming calls are never stored here — mixing them caused key collisions
  // that destroyed remote audio whenever a second peer turned on their mic.
  const callsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const audioElementsRef = useRef({});
  // Keeps the silent AudioContext alive for the lifetime of the hook.
  // We reuse one context instead of creating a new one per incoming call.
  const silentCtxRef = useRef(null);

  // ── Receive-audio toggle ───────────────────────────────────────────────────
  // Tracks whether remote audio playback is enabled. Default ON.
  const [receiveAudioOn, setReceiveAudioOn] = useState(true);
  const receiveAudioOnRef = useRef(true);

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  // Keep a stable ref so the peer.on("call") handler always uses the latest
  // callback without needing to be re-registered.
  const onRemoteScreenStreamRef = useRef(onRemoteScreenStream);
  useEffect(() => {
    onRemoteScreenStreamRef.current = onRemoteScreenStream;
  }, [onRemoteScreenStream]);

  // ── Silent stream helper ───────────────────────────────────────────────────
  const getSilentStream = useCallback(() => {
    if (!silentCtxRef.current || silentCtxRef.current.state === "closed") {
      silentCtxRef.current = new AudioContext();
    }
    const ctx = silentCtxRef.current;
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    osc.stop(ctx.currentTime + 1);
    return dest.stream;
  }, []);

  // ── Audio ──────────────────────────────────────────────────────────────────

  const playRemoteAudio = useCallback((peerId, stream) => {
    if (!audioElementsRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current[peerId] = audio;
    }
    const audio = audioElementsRef.current[peerId];
    if (audio.srcObject === stream) {
      // Stream already set — just respect the current mute state
      audio.muted = !receiveAudioOnRef.current;
      return;
    }
    audio.srcObject = stream;
    audio.muted = !receiveAudioOnRef.current;
    audio.play().catch(() => {
      const retry = () => {
        audio.play().catch(() => {});
      };
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

  // ── Public: toggle receive audio ──────────────────────────────────────────
  // Mutes / unmutes all existing remote audio elements immediately,
  // and records the preference so future elements are created correctly.
  const toggleReceiveAudio = useCallback(() => {
    const next = !receiveAudioOnRef.current;
    receiveAudioOnRef.current = next;
    setReceiveAudioOn(next);
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.muted = !next;
    });
  }, []);

  // ── Stream state ───────────────────────────────────────────────────────────

  const addStream = useCallback(
    (peerId, stream, type, uname) => {
      if (type === "mic") {
        playRemoteAudio(peerId, stream);
      }

      if (type === "screen") {
        onRemoteScreenStreamRef.current?.(stream);
        const [track] = stream.getVideoTracks();
        if (track) {
          track.addEventListener(
            "ended",
            () => {
              onRemoteScreenStreamRef.current?.(null);
            },
            { once: true },
          );
        }
      }

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
      if (type === "screen") {
        onRemoteScreenStreamRef.current?.(null);
      }
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
        const hadScreen = prev.some(
          (s) => s.peerId === peerId && s.type === "screen",
        );
        if (hadScreen) {
          onRemoteScreenStreamRef.current?.(null);
        }
        const next = prev.filter((s) => s.peerId !== peerId);
        return next.length === prev.length ? prev : next;
      });
    },
    [stopRemoteAudio],
  );

  // ── Outgoing calls ─────────────────────────────────────────────────────────

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;
      const callKey = `${peerId}-${type}`;
      if (callsRef.current[callKey]) {
        callsRef.current[callKey].close();
        delete callsRef.current[callKey];
      }
      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });
      call.on("stream", (remoteStream) =>
        addStream(peerId, remoteStream, type, uname),
      );
      call.on("close", () => {
        delete callsRef.current[callKey];
      });
      call.on("error", (err) => console.error("Outgoing call error:", err));
      callsRef.current[callKey] = call;
    },
    [addStream],
  );

  const callPeerRef = useRef(callPeer);
  useEffect(() => {
    callPeerRef.current = callPeer;
  }, [callPeer]);

  const getAllPeerIds = useCallback(
    () => Array.from(knownPeersRef.current),
    [],
  );

  // ── Peer lifecycle with reconnection ──────────────────────────────────────

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
        const micStream = micStreamRef.current;
        const micIsLive =
          micStream &&
          micStream.getAudioTracks().length > 0 &&
          micStream.getAudioTracks()[0].readyState === "live";

        const answerStream = micIsLive ? micStream : getSilentStream();
        call.answer(answerStream);

        call.on("stream", (remoteStream) => {
          addStream(
            call.peer,
            remoteStream,
            call.metadata?.type || "mic",
            call.metadata?.username,
          );
        });

        const incomingType = call.metadata?.type || "mic";
        call.on("close", () => removeStreamByType(call.peer, incomingType));
        call.on("error", (err) => console.error("Incoming call error:", err));
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
        if (!destroyed && !peer.destroyed) {
          peer.reconnect();
        }
      });
    };

    setupPeer();

    socket.on("user-joined", ({ peerId }) => {
      if (!peerId) return;
      knownPeersRef.current.add(peerId);
      if (micStreamRef.current)
        callPeerRef.current(peerId, micStreamRef.current, "mic", username);
      if (screenStreamRef.current)
        callPeerRef.current(
          peerId,
          screenStreamRef.current,
          "screen",
          username,
        );
    });

    socket.on("existing-peers", (peers) => {
      peers.forEach(({ peerId }) => {
        if (!peerId) return;
        knownPeersRef.current.add(peerId);
        if (micStreamRef.current)
          callPeerRef.current(peerId, micStreamRef.current, "mic", username);
        if (screenStreamRef.current)
          callPeerRef.current(
            peerId,
            screenStreamRef.current,
            "screen",
            username,
          );
      });
    });

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current = {};
      peerRef.current?.destroy();
      peerRef.current = null;
      callsRef.current = {};
      if (silentCtxRef.current && silentCtxRef.current.state !== "closed") {
        silentCtxRef.current.close();
        silentCtxRef.current = null;
      }
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
  ]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const broadcastMic = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) =>
        callPeer(peerId, stream, "mic", username),
      );
    },
    [callPeer, username, getAllPeerIds],
  );

  const broadcastScreen = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) =>
        callPeer(peerId, stream, "screen", username),
      );
    },
    [callPeer, username, getAllPeerIds],
  );

  const stopMicCalls = useCallback(() => {
    Object.keys(callsRef.current)
      .filter((key) => key.endsWith("-mic"))
      .forEach((key) => {
        callsRef.current[key].close();
        delete callsRef.current[key];
      });
  }, []);

  const stopScreenCalls = useCallback(() => {
    Object.keys(callsRef.current)
      .filter((key) => key.endsWith("-screen"))
      .forEach((key) => {
        callsRef.current[key].close();
        delete callsRef.current[key];
      });
  }, []);

  return {
    remoteStreams,
    peerRef,
    broadcastMic,
    broadcastScreen,
    stopMicCalls,
    stopScreenCalls,
    // NEW
    receiveAudioOn,
    toggleReceiveAudio,
  };
};
