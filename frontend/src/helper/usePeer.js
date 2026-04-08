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
    audio.srcObject = stream;
    audio.play().catch((err) => {
      console.warn("Remote audio autoplay blocked for peer:", peerId, err);
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

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;

      const callKey = `${peerId}-${type}`;
      const existingCall = callsRef.current[callKey];

      if (existingCall) {
        if (
          existingCall.__localStreamId &&
          existingCall.__localStreamId === stream.id
        ) {
          return;
        }
        existingCall.close();
        delete callsRef.current[callKey];
      }

      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });

      call.on("stream", (remoteStream) => {
        addStream(peerId, remoteStream, type, uname);
      });

      call.on("close", () => {
        removeStreamByType(peerId, type);
        delete callsRef.current[callKey];
      });

      call.on("error", (err) => console.error("Call error:", err));

      call.__localStreamId = stream.id;
      callsRef.current[callKey] = call;
    },
    [removeStreamByType, addStream],
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
      const localStream = micStreamRef.current || new MediaStream();
      call.answer(localStream);

      const getIncomingType = (remoteStream) => {
        const metadataType = call.metadata?.type;
        if (metadataType === "screen" || metadataType === "mic")
          return metadataType;
        const hasVideo = remoteStream?.getVideoTracks?.().length > 0;
        return hasVideo ? "screen" : "mic";
      };

      let incomingType = call.metadata?.type === "screen" ? "screen" : "mic";

      call.on("stream", (remoteStream) => {
        incomingType = getIncomingType(remoteStream);
        addStream(
          call.peer,
          remoteStream,
          incomingType,
          call.metadata?.username,
        );

        if (incomingType === "mic") {
          playRemoteAudio(call.peer, remoteStream);
        }
      });

      call.on("close", () => removeStreamByType(call.peer, incomingType));
      call.on("error", (err) => console.error("Call error:", err));

      const inCallKey = `in-${call.peer}-${incomingType}`;
      callsRef.current[inCallKey] = call;
      call.on("close", () => {
        delete callsRef.current[inCallKey];
      });
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

    socket.on("peer-screen-stopped", ({ peerId }) => {
      removeStreamByType(peerId, "screen");
    });

    return () => {
      Object.values(audioElementsRef.current).forEach((audio) => {
        audio.pause();
        audio.srcObject = null;
      });
      audioElementsRef.current = {};

      peer.destroy();
      peerRef.current = null;
      callsRef.current = {};
      socket.off("user-joined");
      socket.off("existing-peers");
      socket.off("peer-screen-stopped");
    };
  }, [
    roomCode,
    userId,
    username,
    userRole,
    userAvatar,
    callPeer,
    addStream,
    playRemoteAudio,
    removeStreams,
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
      getAllPeerIds().forEach((peerId) => {
        callPeer(peerId, stream, "screen", username);
      });
    },
    [callPeer, username, getAllPeerIds],
  );

  const stopScreenCalls = useCallback(() => {
    Object.keys(callsRef.current)
      .filter((key) => key.endsWith("-screen"))
      .forEach((key) => {
        callsRef.current[key].close();
        delete callsRef.current[key];
      });
    setRemoteStreams((prev) => prev.filter((s) => s.type !== "screen"));

    // Tell all peers via socket to remove your screen immediately
    socket.emit("stop-screen-share");
  }, [socket]);

  return {
    remoteStreams,
    peerRef,
    broadcastMic,
    broadcastScreen,
    stopScreenCalls,
  };
};
