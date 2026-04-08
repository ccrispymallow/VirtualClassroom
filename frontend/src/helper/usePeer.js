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
  const debugSeqRef = useRef(0);

  const userId = user?.id ?? "";
  const username = user?.username ?? "";
  const userRole = user?.role ?? "";
  const userAvatar = user?.avatar ?? "boy";

  const debugLog = useCallback((event, data = {}) => {
    const seq = ++debugSeqRef.current;
    console.debug(`[voice-debug #${seq}] ${event}`, data);
  }, []);

  const addStream = useCallback(
    (peerId, stream, type, uname) => {
      debugLog("add-stream", {
        peerId,
        type,
        username: uname,
        streamId: stream?.id,
        audioTracks: stream?.getAudioTracks?.().length ?? 0,
      });

      const audioTrack = stream?.getAudioTracks?.()[0];
      if (audioTrack) {
        audioTrack.onmute = () =>
          debugLog("remote-track-muted", { peerId, type, streamId: stream.id });
        audioTrack.onunmute = () =>
          debugLog("remote-track-unmuted", { peerId, type, streamId: stream.id });
        audioTrack.onended = () =>
          debugLog("remote-track-ended", { peerId, type, streamId: stream.id });
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
    [debugLog],
  );

  const removeStreamByType = useCallback(
    (peerId, type) => {
      debugLog("remove-stream-by-type", { peerId, type });
      setRemoteStreams((prev) => {
        const next = prev.filter((s) => !(s.peerId === peerId && s.type === type));
        return next.length === prev.length ? prev : next;
      });
    },
    [debugLog],
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
      debugLog("outgoing-call-created", {
        callKey,
        peerId,
        type,
        localStreamId: stream?.id,
      });

      call.on("stream", (remoteStream) => {
        debugLog("outgoing-call-stream", {
          callKey,
          peerId,
          type,
          remoteStreamId: remoteStream?.id,
        });
        addStream(peerId, remoteStream, type, uname);
      });

      call.on("close", () => {
        // Outgoing call lifecycle should not tear down inbound media.
        debugLog("outgoing-call-close", { callKey, peerId, type });
        delete outgoingCallsRef.current[callKey];
      });

      call.on("error", (err) => {
        debugLog("outgoing-call-error", { callKey, peerId, type, err: err?.message });
        console.error("Call error:", err);
      });

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
      debugLog("peer-open", { peerId, roomCode, userId });
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
      debugLog("incoming-call-answered", {
        fromPeer: call.peer,
        type: call.metadata?.type || "mic",
        answeredWithLocalStream: Boolean(localStream),
        localStreamId: localStream?.id || null,
      });

      call.on("stream", (remoteStream) => {
        debugLog("incoming-call-stream", {
          fromPeer: call.peer,
          type: call.metadata?.type || "mic",
          remoteStreamId: remoteStream?.id,
        });
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
          debugLog("incoming-call-close-active", {
            fromPeer: call.peer,
            type: incomingType,
            incomingCallKey,
          });
          removeStreamByType(call.peer, incomingType);
          delete activeIncomingByPeerTypeRef.current[peerTypeKey];
        } else {
          debugLog("incoming-call-close-stale", {
            fromPeer: call.peer,
            type: incomingType,
            incomingCallKey,
          });
        }
        delete incomingCallsRef.current[incomingCallKey];
      });
      call.on("error", (err) => {
        if (activeIncomingByPeerTypeRef.current[peerTypeKey] === incomingCallKey) {
          debugLog("incoming-call-error-active", {
            fromPeer: call.peer,
            type: incomingType,
            incomingCallKey,
            err: err?.message,
          });
          removeStreamByType(call.peer, incomingType);
          delete activeIncomingByPeerTypeRef.current[peerTypeKey];
        } else {
          debugLog("incoming-call-error-stale", {
            fromPeer: call.peer,
            type: incomingType,
            incomingCallKey,
            err: err?.message,
          });
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