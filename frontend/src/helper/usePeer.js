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
  // callsRef stores ONLY outgoing calls (calls WE initiated to remote peers).
  // Incoming calls are NEVER stored here — mixing them caused key collisions
  // that destroyed remote audio/video whenever a second peer turned on their mic.
  const callsRef = useRef({});
  const knownPeersRef = useRef(new Set());
  const [remoteStreams, setRemoteStreams] = useState([]);

  // peerId -> <audio> element map so remote voices play independently of
  // whether our own mic is on or off.
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
      if (!peerRef.current || !stream) return;

      const callKey = `${peerId}-${type}`;

      // Close the previous OUTGOING call for this peer+type if one exists.
      // Because callsRef only contains outgoing calls, we will never
      // accidentally close an incoming call from this peer.
      if (callsRef.current[callKey]) {
        callsRef.current[callKey].close();
        delete callsRef.current[callKey];
      }

      const call = peerRef.current.call(peerId, stream, {
        metadata: { type, username: uname },
      });

      // The remote peer always answers with call.answer() — no stream back.
      // This event is kept as a safety net but should not fire in normal use.
      call.on("stream", (remoteStream) => {
        addStream(peerId, remoteStream, type, uname);
      });

      // Outgoing call closing: just clean up the tracking entry.
      // We do NOT remove remote streams here — that is handled exclusively
      // by the INCOMING call's close event on our side.
      call.on("close", () => {
        delete callsRef.current[callKey];
      });

      call.on("error", (err) => console.error("Outgoing call error:", err));

      callsRef.current[callKey] = call;
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
      // Always answer with NO stream.
      //
      // The previous code answered with localStream which caused two problems:
      //   1. Key collision: callsRef stored incoming calls under the same key as
      //      outgoing ones. When B later called A, callPeer found A's key already
      //      occupied by the *incoming* call from A and closed it, destroying A's
      //      stream on B's side — exactly the "can't hear after someone turns on
      //      mic" bug.
      //   2. Bidirectional confusion: answering with your own stream created a
      //      reverse flow that doubled connections and broke cross-platform (Mac ↔
      //      Windows) scenarios due to SDP negotiation differences.
      //
      // The reference implementation (fampiyush/virtual-meet) uses call.answer()
      // with no stream for the same reason.
      call.answer();

      call.on("stream", (remoteStream) => {
        addStream(
          call.peer,
          remoteStream,
          call.metadata?.type || "mic",
          call.metadata?.username,
        );
      });

      const incomingType = call.metadata?.type || "mic";

      // When the remote peer closes their outgoing call (they turn off their
      // mic/screen, or they disconnect), remove their stream from our state.
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

  // Close all OUTGOING mic calls. Call this when turning off the microphone
  // so remote peers' incoming call close handlers fire and they remove our
  // stream from their UI. Without this, ghost connections linger.
  const stopMicCalls = useCallback(() => {
    Object.keys(callsRef.current)
      .filter((key) => key.endsWith("-mic"))
      .forEach((key) => {
        callsRef.current[key].close();
        delete callsRef.current[key];
      });
  }, []);

  // Close all OUTGOING screen calls. Remote peers' incoming call close
  // handlers will remove our screen stream from their UI automatically.
  // We do NOT manually wipe remote screen streams here — if somehow a remote
  // sharer's stream is in our state, it must only be removed by its own
  // incoming call's close event.
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