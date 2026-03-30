const rooms = {}; // { roomCode: [{ id, username, role, peerId }] }

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomCode, user, peerId }) => {
      socket.join(roomCode);
      if (!rooms[roomCode]) rooms[roomCode] = [];
      rooms[roomCode] = rooms[roomCode].filter((p) => p.id !== user.id);
      rooms[roomCode].push({ ...user, socketId: socket.id, peerId }); // ✅ store peerId

      // Tell the NEW user about everyone already in the room
      const others = rooms[roomCode].filter((p) => p.id !== user.id);
      socket.emit("existing-peers", others); // ✅ so new user calls them

      // Tell EVERYONE ELSE about the new user
      socket.to(roomCode).emit("user-joined", {
        ...user,
        socketId: socket.id,
        peerId,
      });

      io.to(roomCode).emit("participants-update", rooms[roomCode]);
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
