/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { socket } from "../helper/socket";

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const [participants, setParticipants] = useState([]);
  const [screenStream, setScreenStream] = useState(null);
  const [avatarPosition, setAvatarPosition] = useState([0, 0, 0]);
  const [peerPositions, setPeerPositions] = useState({});
  const [peerMoving, setPeerMoving] = useState({});
  const [peerYaws, setPeerYaws] = useState({});
  const [myEmote, setMyEmote] = useState(null);
  const [peerEmotes, setPeerEmotes] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const keysRef = useRef({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const posRef = useRef([0, 0, 0]);

  useEffect(() => {
    setMyEmote(null);
    setPeerEmotes({});
    setPeerPositions({});
    setPeerMoving({});
    setPeerYaws({});
    keysRef.current = {};
  }, []);

  useEffect(() => {
    const handlePeerMoved = ({ userId, position, yaw }) => {
      setPeerPositions((prev) => ({ ...prev, [userId]: position }));
      if (yaw !== undefined) {
        setPeerYaws((prev) => ({ ...prev, [userId]: yaw }));
      }
    };

    const handleParticipantsUpdate = (updatedList) => {
      setParticipants(updatedList);
      setPeerPositions((prev) => {
        const ids = new Set(updatedList.map((p) => p.id));
        const next = {};
        for (const id in prev) {
          if (ids.has(id)) next[id] = prev[id];
        }
        return next;
      });
    };

    const handlePeerMoving = ({ userId, isMoving }) => {
      setPeerMoving((prev) => ({ ...prev, [userId]: isMoving }));
    };

    socket.on("peer-moved", handlePeerMoved);
    socket.on("participants-update", handleParticipantsUpdate);
    socket.on("peer-moving", handlePeerMoving);

    return () => {
      socket.off("peer-moved", handlePeerMoved);
      socket.off("participants-update", handleParticipantsUpdate);
      socket.off("peer-moving", handlePeerMoving);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("peer-emote", ({ userId, emote }) => {
      setPeerEmotes((prev) => ({ ...prev, [userId]: emote }));
      setTimeout(() => {
        setPeerEmotes((prev) => ({ ...prev, [userId]: null }));
      }, 8000);
    });
    socket.on("receive-message", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });
    return () => {
      socket.off("peer-emote");
      socket.off("receive-message");
    };
  }, []);

  return (
    <RoomContext.Provider
      value={{
        participants,
        setParticipants,
        screenStream,
        setScreenStream,
        avatarPosition,
        setAvatarPosition,
        peerPositions,
        setPeerPositions,
        peerMoving,
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
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);