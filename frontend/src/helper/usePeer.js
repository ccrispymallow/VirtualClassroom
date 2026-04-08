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
  const callsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);

  const audioElementsRef = useRef({});

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  const playRemoteAudio = useCallback((peerId, stream) => {
    if (!audioElementsRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current[peerId] = audio;
    }
    const audio = audioElementsRef.current[peerId];
    // Don't reassign the same stream — avoids a redundant interrupted play()
    if (audio.srcObject === stream) return;
    audio.srcObject = stream;
    audio.play().catch(() => {
      // Browser blocked autoplay (no prior user gesture yet).
      // Retry silently on the next click or keypress anywhere on the page.
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

  const hasExpectedTrack = useCallback((stream, type) => {
    if (!stream) return false;
    const tracks =
      type === "screen" ? stream.getVideoTracks() : stream.getAudioTracks();
    return tracks.some((track) => track.readyState === "live");
  }, []);

  const addStream = useCallback(
    (peerId, stream, type, uname) => {
      if (type === "mic") {
        playRemoteAudio(peerId, stream);
      }
      setRemoteStreams((prev) => {
        const existing = prev.find(
          (s) => s.peerId === peerId && s.type === type,
        );
        if (existing?.stream === stream && existing?.username === uname) {
          return prev;
        }
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
      if (type === "mic") {
        stopRemoteAudio(peerId);
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
        const next = prev.filter((s) => s.peerId !== peerId);
        return next.length === prev.length ? prev : next;
      });
    },
    [stopRemoteAudio],
  );

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream || !hasExpectedTrack(stream, type)) return;

      const callKey = `${peerId}-${type}`;

      if (callsRef.current[callKey]) {
        callsRef.current[callKey].close();
        delete callsRef.current[callKey];
      }

      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });

      call.on("close", () => {
        delete callsRef.current[callKey];
      });

      call.on("error", (err) => console.error("Outgoing call error:", err));

      callsRef.current[callKey] = call;
    },
    [hasExpectedTrack],
  );

  const removePeer = useCallback(
    (peerId) => {
      if (!peerId) return;
      knownPeersRef.current.delete(peerId);
      Object.keys(callsRef.current)
        .filter((key) => key.startsWith(`${peerId}-`))
        .forEach((key) => {
          callsRef.current[key].close();
          delete callsRef.current[key];
        });
      removeStreams(peerId);
    },
    [removeStreams],
  );

  const resetPeerSession = useCallback(() => {
    Object.values(callsRef.current).forEach((call) => call.close());
    callsRef.current = {};
    knownPeersRef.current.clear();
    Object.values(audioElementsRef.current).forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current = {};
    setRemoteStreams([]);
    if (peerRef.current && !peerRef.current.destroyed) {
      peerRef.current.destroy();
    }
    peerRef.current = null;
  }, []);

  const getAllPeerIds = useCallback(() => {
    return Array.from(knownPeersRef.current);
  }, []);

  useEffect(() => {
    if (!userId || !roomCode) return;

    const isLocal =
      !import.meta.env.VITE_PEER_HOST ||
      import.meta.env.VITE_PEER_HOST === "localhost";

    const peer = new Peer(undefined, {
      host: import.meta.env.VITE_PEER_HOST || "localhost",
      port: isLocal ? 9000 : 443,
      path: "/peerjs",
      secure: !isLocal,
    });

    peerRef.current = peer;

    peer.on("open", (peerId) => {
      socket.emit("join-room", {
        roomCode,
        user: { id: userId, username, role: userRole, avatar: userAvatar },
        peerId,
      });
    });

    peer.on("call", (call) => {
      call.answer();

      call.on("stream", (remoteStream) => {
        const incomingType = call.metadata?.type || "mic";
        if (!hasExpectedTrack(remoteStream, incomingType)) return;
        addStream(
          call.peer,
          remoteStream,
          incomingType,
          call.metadata?.username,
        );
      });

      const incomingType = call.metadata?.type || "mic";

      call.on("close", () => removeStreamByType(call.peer, incomingType));
      call.on("error", (err) => console.error("Incoming call error:", err));

      // DO NOT store in callsRef. callsRef is exclusively for outgoing calls.
    });

    peer.on("error", (err) => console.error("PeerJS error:", err));

    socket.on("user-joined", ({ peerId }) => {
      if (!peerId) return;
      knownPeersRef.current.add(peerId);

      if (micStreamRef.current) {
        callPeer(peerId, micStreamRef.current, "mic", username);
      }
      if (screenStreamRef.current) {
        callPeer(peerId, screenStreamRef.current, "screen", username);
      }
    });

    socket.on("existing-peers", (peers) => {
      peers.forEach(({ peerId }) => {
        if (!peerId) return;
        knownPeersRef.current.add(peerId);

        if (micStreamRef.current) {
          callPeer(peerId, micStreamRef.current, "mic", username);
        }
        if (screenStreamRef.current) {
          callPeer(peerId, screenStreamRef.current, "screen", username);
        }
      });
    });

    socket.on("peer-left", ({ peerId }) => {
      removePeer(peerId);
    });

    return () => {
      resetPeerSession();
      socket.off("user-joined");
      socket.off("existing-peers");
      socket.off("peer-left");
    };
  }, [
    roomCode,
    userId,
    username,
    userRole,
    userAvatar,
    socket,
    micStreamRef,
    screenStreamRef,
    callPeer,
    addStream,
    hasExpectedTrack,
    removeStreamByType,
    resetPeerSession,
    removePeer,
  ]);

  const broadcastMic = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) => {
        callPeer(peerId, stream, "mic", username);
      });
    },
    [callPeer, username, getAllPeerIds],
  );

  const broadcastScreen = useCallback(
    (stream) => {
      getAllPeerIds().forEach((peerId) => {
        callPeer(peerId, stream, "screen", username);
      });
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
    resetPeerSession,
  };
};