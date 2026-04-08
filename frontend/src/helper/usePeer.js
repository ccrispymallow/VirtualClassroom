import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";

export const usePeer = ({
  roomCode,
  user,
  socket,
  micStreamRef,
  screenStreamRef,
}) => {
  const peerRef = useRef(null);
  // callsRef stores ONLY outgoing calls we initiated.
  // Incoming calls are never stored here — mixing them caused key collisions
  // that destroyed remote audio whenever a second peer turned on their mic.
  const callsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const audioElementsRef = useRef({});

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  // ── Audio ──────────────────────────────────────────────────────────────────

  const playRemoteAudio = useCallback((peerId, stream) => {
    if (!audioElementsRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current[peerId] = audio;
    }
    const audio = audioElementsRef.current[peerId];
    // Guard: don't reassign same stream (avoids interrupted-play DOMException)
    if (audio.srcObject === stream) return;
    audio.srcObject = stream;
    audio.play().catch(() => {
      // Autoplay blocked — retry silently on next user interaction
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

  // Stable ref so reconnect/socket handlers always use the latest callPeer
  // without triggering effect re-runs.
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

    // ICE servers: always include STUN; add free TURN for cross-network/Safari.
    // Without TURN, Safari and peers behind strict NAT will fail to connect.
    const iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      // Free public TURN — replace with your own Coturn/Metered for production
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
      // Increase ping interval — Safari aggressively closes idle WS connections
      pingInterval: 5000,
      config: { iceServers },
    };

    let destroyed = false; // prevents stale retries after unmount
    let reconnectTimer = null;
    let reconnectDelay = 2000; // exponential back-off: 2s → 4s → … → 30s

    const setupPeer = () => {
      if (destroyed) return;

      const peer = new Peer(undefined, peerConfig);
      peerRef.current = peer;

      peer.on("open", (peerId) => {
        reconnectDelay = 2000; // reset back-off on successful open
        socket.emit("join-room", {
          roomCode,
          user: { id: userId, username, role: userRole, avatar: userAvatar },
          peerId,
        });
      });

      peer.on("call", (call) => {
        // Answer with an empty MediaStream.
        // call.answer() with no args omits the SDP media section, causing
        // negotiation failures on Safari/Firefox and cross-OS pairs.
        call.answer(new MediaStream());

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
        // Never store in callsRef — outgoing calls only.
      });

      peer.on("error", (err) => {
        console.error("PeerJS error:", err);
        // These types mean the WS to the PeerJS signalling server was lost.
        // Tear down and reconnect with exponential back-off.
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

      // "disconnected" fires when the WS drops but the Peer object still lives.
      // peer.reconnect() is cheaper than a full teardown/rebuild.
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
  };
};
