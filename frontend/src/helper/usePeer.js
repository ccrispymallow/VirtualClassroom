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
  const callsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const audioElementsRef = useRef({});
  // One shared silent AudioContext for the lifetime of the hook.
  const silentCtxRef = useRef(null);

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  // ── Silent stream helper ───────────────────────────────────────────────────
  // Always returns a stream with a real (silent) audio track so WebRTC SDP
  // negotiation succeeds on all browsers/OS combos.
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

  // ── replaceTrack helper ────────────────────────────────────────────────────
  // Swaps the audio track in all existing outgoing mic calls WITHOUT closing
  // them. This keeps the peer connection alive (so you keep receiving audio)
  // while only changing what you send.
  const replaceMicTrack = useCallback((newTrack) => {
    Object.entries(callsRef.current)
      .filter(([key]) => key.endsWith("-mic"))
      .forEach(([, call]) => {
        const pc = call.peerConnection;
        if (!pc) return;
        const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
        if (sender) {
          sender
            .replaceTrack(newTrack)
            .catch((err) => console.error("replaceTrack error:", err));
        }
      });
  }, []);

  // Keep a ref so socket handlers always reach the latest version.
  const replaceMicTrackRef = useRef(replaceMicTrack);
  useEffect(() => {
    replaceMicTrackRef.current = replaceMicTrack;
  }, [replaceMicTrack]);

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
        // Answer with real mic stream if live, otherwise silent.
        // Either way the connection is established so we RECEIVE their audio.
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

    // ── user-joined ──────────────────────────────────────────────────────────
    // A new peer joined. Call them immediately with whatever we have —
    // real mic stream if on, silent stream if off. This guarantees the
    // connection exists so BOTH sides can hear each other right away.
    socket.on("user-joined", ({ peerId }) => {
      if (!peerId) return;
      knownPeersRef.current.add(peerId);

      const micStream = micStreamRef.current;
      const micIsLive =
        micStream &&
        micStream.getAudioTracks().length > 0 &&
        micStream.getAudioTracks()[0].readyState === "live";

      // Always call — use real stream or silent fallback
      callPeerRef.current(
        peerId,
        micIsLive ? micStream : getSilentStream(),
        "mic",
        username,
      );

      if (screenStreamRef.current) {
        callPeerRef.current(
          peerId,
          screenStreamRef.current,
          "screen",
          username,
        );
      }
    });

    // ── existing-peers ───────────────────────────────────────────────────────
    // Same logic: call everyone who's already in the room on join.
    socket.on("existing-peers", (peers) => {
      peers.forEach(({ peerId }) => {
        if (!peerId) return;
        knownPeersRef.current.add(peerId);

        const micStream = micStreamRef.current;
        const micIsLive =
          micStream &&
          micStream.getAudioTracks().length > 0 &&
          micStream.getAudioTracks()[0].readyState === "live";

        callPeerRef.current(
          peerId,
          micIsLive ? micStream : getSilentStream(),
          "mic",
          username,
        );

        if (screenStreamRef.current) {
          callPeerRef.current(
            peerId,
            screenStreamRef.current,
            "screen",
            username,
          );
        }
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

  // broadcastMic: used when turning mic ON.
  // Uses replaceTrack on existing calls so connections stay alive.
  // Falls back to a full callPeer for any peer not yet connected.
  const broadcastMic = useCallback(
    (stream) => {
      const newTrack = stream?.getAudioTracks?.()?.[0] ?? null;
      getAllPeerIds().forEach((peerId) => {
        const callKey = `${peerId}-mic`;
        if (callsRef.current[callKey] && newTrack) {
          // Connection already exists — just swap the track, don't redial
          const pc = callsRef.current[callKey].peerConnection;
          if (pc) {
            const sender = pc
              .getSenders()
              .find((s) => s.track?.kind === "audio");
            if (sender) {
              sender
                .replaceTrack(newTrack)
                .catch((err) =>
                  console.error("broadcastMic replaceTrack error:", err),
                );
              return;
            }
          }
        }
        // No existing call for this peer yet — dial them
        callPeer(peerId, stream, "mic", username);
      });
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

  // muteMic: replaces the sent track with a silent one WITHOUT closing calls.
  // The peer connection stays alive so both sides keep receiving audio.
  const muteMic = useCallback(() => {
    const silentTrack = getSilentStream().getAudioTracks()[0];
    if (silentTrack) replaceMicTrack(silentTrack);
  }, [getSilentStream, replaceMicTrack]);

  // stopMicCalls kept for API compatibility but now just mutes instead of
  // destroying connections, preventing the "can't hear after mute" bug.
  const stopMicCalls = useCallback(() => {
    muteMic();
  }, [muteMic]);

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
    muteMic,
    replaceMicTrack,
  };
};
