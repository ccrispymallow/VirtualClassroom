const rooms = {};

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomCode, user, peerId }) => {
      socket.join(roomCode);
      if (!rooms[roomCode]) rooms[roomCode] = [];
      rooms[roomCode] = rooms[roomCode].filter((p) => p.id !== user.id);
      rooms[roomCode].push({
        ...user,
        socketId: socket.id,
        peerId,
        position: [0, 0, 0],
      });

      const others = rooms[roomCode].filter((p) => p.id !== user.id);
      socket.emit("existing-peers", others);

      socket.to(roomCode).emit("user-joined", {
        ...user,
        socketId: socket.id,
        peerId,
      });

      io.to(roomCode).emit("participants-update", rooms[roomCode]);
    });

    // ── Receive position from one user, broadcast to everyone else ──
    socket.on("position-update", ({ roomCode, userId, position }) => {
      if (rooms[roomCode]) {
        const p = rooms[roomCode].find((p) => p.id === userId);
        if (p) p.position = position;
      }
      socket.to(roomCode).emit("peer-moved", { userId, position });
    });

    socket.on("leave-room", ({ roomCode, userId }) => {
      if (rooms[roomCode]) {
        rooms[roomCode] = rooms[roomCode].filter((p) => p.id !== userId);
        io.to(roomCode).emit("participants-update", rooms[roomCode]);
      }
      socket.leave(roomCode);
    });

    socket.on("disconnect", () => {
      for (const roomCode in rooms) {
        const before = rooms[roomCode].length;
        rooms[roomCode] = rooms[roomCode].filter(
          (p) => p.socketId !== socket.id,
        );
        if (rooms[roomCode].length !== before) {
          io.to(roomCode).emit("participants-update", rooms[roomCode]);
        }
      }
    });
  });
};
