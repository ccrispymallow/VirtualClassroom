/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const RoomContext = createContext(null);

export const RoomProvider = ({ children }) => {
  const [participants, setParticipants] = useState([]);
  return (
    <RoomContext.Provider value={{ participants, setParticipants }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);
