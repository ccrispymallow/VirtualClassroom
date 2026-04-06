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
        const filtered = prev.filter(
          (s) => !(s.peerId === peerId && s.type === type),
        );
        return [...filtered, { peerId, stream, type, username: uname }];
      });
    },
    [playRemoteAudio],
  );

  const removeStreams = useCallback(
    (peerId) => {
      stopRemoteAudio(peerId);
      setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
    },
    [stopRemoteAudio],
  );

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;

      const callKey = `${peerId}-${type}`;
      console.log("Calling peer:", peerId, "type:", type, "stream:", stream);

      if (callsRef.current[callKey]) {
        callsRef.current[callKey].close();
        delete callsRef.current[callKey];
      }

      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });

      call.on("stream", (remoteStream) => {
        addStream(peerId, remoteStream, type, uname);
      });

      call.on("close", () => {
        removeStreams(peerId);
        delete callsRef.current[callKey];
      });

      call.on("error", (err) => console.error("Call error:", err));

      callsRef.current[callKey] = call;
    },
    [removeStreams, addStream],
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
      console.log("PeerJS connected, my peerId:", peerId);
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

      call.on("close", () => removeStreams(call.peer));
      call.on("error", (err) => console.error("Call error:", err));

      callsRef.current[`${call.peer}-${call.metadata?.type}`] = call;
    });

    peer.on("error", (err) => console.error("PeerJS error:", err));

    socket.on("user-joined", ({ peerId, username: joinedUsername }) => {
      console.log("User joined:", joinedUsername, peerId);
      knownPeersRef.current.add(peerId);

      if (micStreamRef.current) {
        callPeer(peerId, micStreamRef.current, "mic", username);
      }
      if (screenStreamRef.current) {
        callPeer(peerId, screenStreamRef.current, "screen", username);
      }
    });

    socket.on("existing-peers", (peers) => {
      console.log("Existing peers in room:", peers);
      peers.forEach(({ peerId }) => {
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
    callPeer,
    addStream,
    removeStreams,
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
      console.log("Broadcasting screen to peers:", peerIds);
      peerIds.forEach((peerId) => {
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
  }, []);

  return {
    remoteStreams,
    peerRef,
    broadcastMic,
    broadcastScreen,
    stopScreenCalls,
  };
};
