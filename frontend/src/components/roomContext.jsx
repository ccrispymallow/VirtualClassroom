/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { socket } from "../helper/socket";

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const [participants, setParticipants] = useState([]);
  const [screenStream, setScreenStream] = useState(null);
  const [avatarPosition, setAvatarPosition] = useState([0, 0, 0]);
  const [peerPositions, setPeerPositions] = useState({});

  const keysRef = useRef({});
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const posRef = useRef([0, 0, 0]); // shared position ref — no re-renders

  // Key listeners live in FollowCamera (on `document`) so they work
  // both with and without pointer lock. Nothing needed here.

  // Listen for peer movement and participant updates
  useEffect(() => {
    const handlePeerMoved = ({ userId, position }) => {
      setPeerPositions((prev) => ({ ...prev, [userId]: position }));
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

    socket.on("peer-moved", handlePeerMoved);
    socket.on("participants-update", handleParticipantsUpdate);
    return () => {
      socket.off("peer-moved", handlePeerMoved);
      socket.off("participants-update", handleParticipantsUpdate);
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
        socket,
        keysRef,
        yawRef,
        pitchRef,
        posRef,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);
