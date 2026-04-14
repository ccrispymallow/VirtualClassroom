/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { socket } from "../helper/socket";

const RoomContext = createContext(null);

const areParticipantsEqual = (prev, next) => {
  if (prev === next) return true;
  if (!Array.isArray(prev) || !Array.isArray(next)) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const a = prev[i];
    const b = next[i];
    if (
      a?.id !== b?.id ||
      a?.username !== b?.username ||
      a?.role !== b?.role ||
      a?.mic !== b?.mic ||
      a?.avatar !== b?.avatar
    ) {
      return false;
    }
  }
  return true;
};

export const RoomProvider = ({ children }) => {
  const [participants, setParticipants] = useState([]);
  const [screenStream, setScreenStream] = useState(null);
  const [avatarPosition, setAvatarPosition] = useState([0, 0, 7]);
  const [peerPositions, setPeerPositions] = useState({});
  const [peerMoving, setPeerMoving] = useState({});
  const [peerSitting, setPeerSitting] = useState({});
  const [peerYaws, setPeerYaws] = useState({});
  const [myEmote, setMyEmote] = useState(null);
  const [peerEmotes, setPeerEmotes] = useState({});
  const [chatMessages, setChatMessages] = useState([]);

  const [isSitting, setIsSitting] = useState(false);
  const [nearChair, setNearChair] = useState(false);

  const keysRef = useRef({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const posRef = useRef([0, 0, 7]);

  useEffect(() => {
    keysRef.current = {};
  }, []);

  useEffect(() => {
    const handlePeerMoved = ({ userId, position, yaw }) => {
      setPeerPositions((prev) => {
        const prevPos = prev[userId];
        if (
          prevPos &&
          prevPos[0] === position[0] &&
          prevPos[1] === position[1] &&
          prevPos[2] === position[2]
        ) {
          return prev;
        }
        return { ...prev, [userId]: position };
      });
      if (yaw !== undefined) {
        setPeerYaws((prev) =>
          prev[userId] === yaw ? prev : { ...prev, [userId]: yaw },
        );
      }
    };

    const handleParticipantsUpdate = (updatedList) => {
      setParticipants((prev) =>
        areParticipantsEqual(prev, updatedList) ? prev : updatedList,
      );
      const ids = new Set(updatedList.map((p) => p.id));

      setPeerPositions((prev) => {
        const next = {};
        for (const id in prev) if (ids.has(id)) next[id] = prev[id];
        return next;
      });
      setPeerSitting((prev) => {
        const next = {};
        for (const id in prev) if (ids.has(id)) next[id] = prev[id];
        return next;
      });
      setPeerYaws((prev) => {
        const next = {};
        for (const id in prev) if (ids.has(id)) next[id] = prev[id];
        return next;
      });
    };

    const handlePeerMoving = ({ userId, isMoving }) => {
      setPeerMoving((prev) =>
        prev[userId] === isMoving ? prev : { ...prev, [userId]: isMoving },
      );
    };

    const handlePeerSitting = ({ userId, isSitting: sitting, position }) => {
      setPeerSitting((prev) =>
        prev[userId] === sitting ? prev : { ...prev, [userId]: sitting },
      );
      if (sitting && position) {
        setPeerPositions((prev) => {
          const prevPos = prev[userId];
          if (
            prevPos &&
            prevPos[0] === position[0] &&
            prevPos[1] === position[1] &&
            prevPos[2] === position[2]
          ) {
            return prev;
          }
          return { ...prev, [userId]: position };
        });
      }
    };

    // When the sharer stops, the server emits screen-share-update { active: false }.
    // Clear screenStream so ScreenMesh reactively switches back to the idle state
    // without anyone needing to refresh.
    const handleScreenShareUpdate = ({ active }) => {
      if (!active) {
        setScreenStream(null);
      }
    };

    socket.on("peer-moved", handlePeerMoved);
    socket.on("participants-update", handleParticipantsUpdate);
    socket.on("peer-moving", handlePeerMoving);
    socket.on("sit-update", handlePeerSitting);
    socket.on("screen-share-update", handleScreenShareUpdate);

    return () => {
      socket.off("peer-moved", handlePeerMoved);
      socket.off("participants-update", handleParticipantsUpdate);
      socket.off("peer-moving", handlePeerMoving);
      socket.off("sit-update", handlePeerSitting);
      socket.off("screen-share-update", handleScreenShareUpdate);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("peer-emote", ({ userId, emote }) => {
      setPeerEmotes((prev) =>
        prev[userId] === emote ? prev : { ...prev, [userId]: emote },
      );
    });
    socket.on("receive-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off("peer-emote");
      socket.off("receive-message");
    };
  }, []);

  const value = useMemo(
    () => ({
      participants,
      setParticipants,
      screenStream,
      setScreenStream,
      avatarPosition,
      setAvatarPosition,
      peerPositions,
      setPeerPositions,
      peerMoving,
      peerSitting,
      isSitting,
      setIsSitting,
      nearChair,
      setNearChair,
      peerYaws,
      socket,
      keysRef,
      yawRef,
      pitchRef,
      posRef,
      myEmote,
      setMyEmote,
      peerEmotes,
      setPeerEmotes,
      chatMessages,
      setChatMessages,
    }),
    [
      participants,
      screenStream,
      avatarPosition,
      peerPositions,
      peerMoving,
      peerSitting,
      isSitting,
      nearChair,
      peerYaws,
      myEmote,
      peerEmotes,
      chatMessages,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => useContext(RoomContext);
