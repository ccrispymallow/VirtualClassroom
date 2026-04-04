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
  const [remoteStreams, setRemoteStreams] = useState([]);

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  const addStream = useCallback((peerId, stream, type, uname) => {
    setRemoteStreams((prev) => {
      const filtered = prev.filter(
        (s) => !(s.peerId === peerId && s.type === type),
      );
      return [...filtered, { peerId, stream, type, username: uname }];
    });
  }, []);

  const removeStreams = useCallback((peerId) => {
    setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
  }, []);

  const callPeer = useCallback(
    (peerId, stream, type, uname) => {
      if (!peerRef.current || !stream) return;

      const callKey = `${peerId}-${type}`;
      if (callsRef.current[callKey]) return;

      console.log("Calling peer:", peerId, "type:", type);
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

      call.on("error", (err) => console.error("📞 Call error:", err));

      callsRef.current[callKey] = call;
    },
    [removeStreams, addStream],
  );

  useEffect(() => {
    console.log("=== usePeer mount ===", { userId, roomCode });
    console.log("VITE_PEER_HOST:", import.meta.env.VITE_PEER_HOST);
    console.log("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);

    if (!userId || !roomCode) return;

    const isLocal =
      !import.meta.env.VITE_PEER_HOST ||
      import.meta.env.VITE_PEER_HOST === "localhost";

    const peer = new Peer(undefined, {
      host: import.meta.env.VITE_PEER_HOST || "localhost",
      port: isLocal ? 5001 : 443,
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
      call.on("error", (err) => console.error("📞 Call error:", err));

      callsRef.current[`${call.peer}-${call.metadata?.type}`] = call;
    });

    peer.on("error", (err) => console.error("PeerJS error:", err));

    socket.on("user-joined", ({ peerId, username: joinedUsername }) => {
      console.log("User joined:", joinedUsername, peerId);
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
        if (micStreamRef.current) {
          callPeer(peerId, micStreamRef.current, "mic", username);
        }
        if (screenStreamRef.current) {
          callPeer(peerId, screenStreamRef.current, "screen", username);
        }
      });
    });

    return () => {
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
      Object.keys(callsRef.current).forEach((key) => {
        if (key.endsWith("-mic")) {
          const peerId = key.replace("-mic", "");
          callPeer(peerId, stream, "mic", username);
        }
      });
    },
    [callPeer, username],
  );

  const broadcastScreen = useCallback(
    (stream) => {
      Object.keys(callsRef.current).forEach((key) => {
        if (key.endsWith("-screen")) {
          const peerId = key.replace("-screen", "");
          callPeer(peerId, stream, "screen", username);
        }
      });
    },
    [callPeer, username],
  );

  return { remoteStreams, peerRef, broadcastMic, broadcastScreen };
};
