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
  const outgoingCallsRef = useRef({});
  const incomingCallsRef = useRef({});
  const activeIncomingByPeerTypeRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);

  // KEY FIX: a map of peerId -> <audio> element so remote voices auto-play
  // independently of whether YOUR mic is on or off.
  const audioElementsRef = useRef({});

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  // ── Attach a remote mic stream to a real <audio> element and play it ──
  const playRemoteAudio = useCallback((peerId, stream) => {
    // Reuse the existing element for this peer, or create a new one
    if (!audioElementsRef.current[peerId]) {
      const audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current[peerId] = audio;
    }

    const audio = audioElementsRef.current[peerId];
    audio.srcObject = stream;
    audio.play().catch((err) => {
      // Autoplay can be blocked by the browser on the very first interaction.
      // This is rare once the user has already clicked something in your app.
      console.warn("Remote audio autoplay blocked for peer:", peerId, err);
    });
  }, []);

  // ── Stop and remove the audio element for a peer that left ──
  const stopRemoteAudio = useCallback((peerId) => {
    const audio = audioElementsRef.current[peerId];
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      delete audioElementsRef.current[peerId];
    }
  }, []);

  const addStream = useCallback(
    (peerId, stream, type, uname) => {
      // If this is a mic stream, also wire it up to an audio element right away
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
        const next = prev.filter((s) => !(s.peerId === peerId && s.type === type));
        return next.length === prev.length ? prev : next;
      });
    },
    [stopRemoteAudio],
  );

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;

      const callKey = `${peerId}-${type}`;

      if (outgoingCallsRef.current[callKey]) {
        outgoingCallsRef.current[callKey].close();
        delete outgoingCallsRef.current[callKey];
      }

      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });

      call.on("stream", (remoteStream) => {
        addStream(peerId, remoteStream, type, uname);
      });

      call.on("close", () => {
        // Outgoing call lifecycle should not tear down inbound media.
        delete outgoingCallsRef.current[callKey];
      });

      call.on("error", (err) => console.error("Call error:", err));

      outgoingCallsRef.current[callKey] = call;
    },
    [addStream],
  );

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
      const localStream =
        call.metadata?.type === "screen"
          ? screenStreamRef.current
          : micStreamRef.current;

      // Answer with your stream if available, or an empty answer if not.
      // This is what was broken before: you were answering with micStreamRef
      // which could be null if mic was off, AND you weren't playing their audio.
      call.answer(localStream ?? undefined);

      call.on("stream", (remoteStream) => {
        addStream(
          call.peer,
          remoteStream,
          call.metadata?.type || "mic",
          call.metadata?.username,
        );
      });

      const incomingType = call.metadata?.type || "mic";
      const incomingCallKey = `${call.peer}-${incomingType}-${Date.now()}-${Math.random()}`;
      const peerTypeKey = `${call.peer}-${incomingType}`;
      activeIncomingByPeerTypeRef.current[peerTypeKey] = incomingCallKey;

      call.on("close", () => {
        // Ignore stale close events from superseded incoming calls.
        if (activeIncomingByPeerTypeRef.current[peerTypeKey] === incomingCallKey) {
          removeStreamByType(call.peer, incomingType);
          delete activeIncomingByPeerTypeRef.current[peerTypeKey];
        }
        delete incomingCallsRef.current[incomingCallKey];
      });
      call.on("error", (err) => {
        if (activeIncomingByPeerTypeRef.current[peerTypeKey] === incomingCallKey) {
          removeStreamByType(call.peer, incomingType);
          delete activeIncomingByPeerTypeRef.current[peerTypeKey];
        }
        console.error("Call error:", err);
      });

      incomingCallsRef.current[incomingCallKey] = call;
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

    return () => {
      // Clean up all audio elements on unmount
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current = {};

      peer.destroy();
      peerRef.current = null;
      outgoingCallsRef.current = {};
      incomingCallsRef.current = {};
      activeIncomingByPeerTypeRef.current = {};
      socket.off("user-joined");
      socket.off("existing-peers");
    };
  }, [
    roomCode,
    userId,
    username,
    userRole,
    userAvatar,
    callPeer,
    addStream,
    removeStreamByType,
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
      const peerIds = getAllPeerIds();
      peerIds.forEach((peerId) => {
        callPeer(peerId, stream, "screen", username);
      });
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
    setRemoteStreams((prev) => prev.filter((s) => s.type !== "screen"));
  }, []);

  return {
    remoteStreams,
    peerRef,
    broadcastMic,
    broadcastScreen,
    stopScreenCalls,
  };
};