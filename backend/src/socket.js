const rooms = {};
const roomPolls = {}; // key: roomCode, value: {pollId, totalExpected, responses:{yes,no}, answered:Set, timeout}

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
        yaw: 0,
        mic: false,
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
    socket.on("position-update", ({ roomCode, userId, position, yaw }) => {
      if (rooms[roomCode]) {
        const p = rooms[roomCode].find((p) => p.id === userId);
        if (p) {
          p.position = position;
          if (yaw !== undefined) p.yaw = yaw;
        }
      }
      socket.to(roomCode).emit("peer-moved", { userId, position, yaw });
    });

    socket.on("mic-status", ({ roomCode, userId, mic }) => {
      if (rooms[roomCode]) {
        const p = rooms[roomCode].find((p) => p.id === userId);
        if (p) {
          p.mic = mic;
          io.to(roomCode).emit("participants-update", rooms[roomCode]);
        }
      }
    });

    socket.on(
      "start-understanding-poll",
      ({ roomCode, initiatedBy, pollId: incomingPollId }) => {
        if (!rooms[roomCode]) return;
        const pollId = incomingPollId || `${roomCode}-${Date.now()}`;
        const studentCount = rooms[roomCode].filter(
          (p) => p.role !== "instructor",
        ).length;
        if (studentCount === 0) {
          socket.emit("understanding-error", {
            message: "No students in room to poll.",
          });
          return;
        }

        // clear previous poll if exists
        if (roomPolls[roomCode]?.timeout) {
          clearTimeout(roomPolls[roomCode].timeout);
        }

        const poll = {
          pollId,
          totalExpected: studentCount,
          responses: { yes: 0, no: 0 },
          answered: new Set(),
          timeout: setTimeout(() => {
            const current = roomPolls[roomCode];
            if (!current || current.pollId !== pollId) return;
            const remaining = current.totalExpected - current.answered.size;
            const result = {
              pollId,
              yes: current.responses.yes,
              no: current.responses.no,
              remaining,
              summary:
                remaining === 0
                  ? current.responses.no === 0
                    ? "Everyone understands"
                    : `${current.responses.no} people don't understand`
                  : `Waiting for ${remaining} responses`,
            };
            io.to(roomCode).emit("understanding-result", result);
            delete roomPolls[roomCode];
          }, 20000),
        };

        roomPolls[roomCode] = poll;
        io.to(roomCode).emit("understanding-question", {
          pollId,
          totalStudents: studentCount,
        });
        io.to(roomCode).emit("understanding-update", {
          pollId,
          yes: 0,
          no: 0,
          remaining: studentCount,
        });
      },
    );

    socket.on(
      "understanding-answer",
      ({ roomCode, userId, pollId, answer }) => {
        if (!rooms[roomCode] || !roomPolls[roomCode]) return;
        const current = roomPolls[roomCode];
        if (current.pollId !== pollId) return;
        if (current.answered.has(userId)) return;
        if (!["yes", "no"].includes(answer)) return;

        current.answered.add(userId);
        current.responses[answer] += 1;

        const remaining = current.totalExpected - current.answered.size;

        io.to(roomCode).emit("understanding-update", {
          pollId,
          yes: current.responses.yes,
          no: current.responses.no,
          remaining,
        });

        if (remaining === 0) {
          const summary =
            current.responses.no === 0
              ? "Everyone understands"
              : `${current.responses.no} people don't understand`;

          io.to(roomCode).emit("understanding-result", {
            pollId,
            yes: current.responses.yes,
            no: current.responses.no,
            remaining: 0,
            summary,
          });

          clearTimeout(current.timeout);
          delete roomPolls[roomCode];
        }
      },
    );

    socket.on("end-understanding-poll", ({ roomCode, pollId }) => {
      const current = roomPolls[roomCode];
      if (!current || current.pollId !== pollId) return;

      clearTimeout(current.timeout);
      const remaining = current.totalExpected - current.answered.size;
      const summary =
        current.responses.no === 0
          ? "Everyone understands"
          : `${current.responses.no} people don't understand`;

      io.to(roomCode).emit("understanding-result", {
        pollId,
        yes: current.responses.yes,
        no: current.responses.no,
        remaining,
        summary,
      });

      delete roomPolls[roomCode];
    });

    socket.on("leave-room", ({ roomCode, userId }) => {
      if (rooms[roomCode]) {
        rooms[roomCode] = rooms[roomCode].filter((p) => p.id !== userId);
        io.to(roomCode).emit("participants-update", rooms[roomCode]);
      }
      socket.leave(roomCode);
    });

    socket.on("sit-update", (data) => {
      if (rooms[data.roomCode]) {
        const p = rooms[data.roomCode].find((p) => p.id === data.userId);
        if (p) {
          p.isSitting = data.isSitting;
          if (data.position) p.position = data.position;
        }
      }
      socket.to(data.roomCode).emit("sit-update", data);
    });

    socket.on("end-room", async ({ roomCode, userId }) => {
      try {
        // Call the end classroom service
        const { endClassroom } =
          await import("./services/classroom.service.js");
        await endClassroom(roomCode, userId);

        const { pool } = await import("./config/database.js");
        const roomRes = await pool.query(
          "SELECT id FROM classrooms WHERE room_code = $1",
          [roomCode],
        );
        const roomId = roomRes.rows[0]?.id;
        if (roomId) {
          await pool.query("DELETE FROM messages WHERE room_id = $1", [roomId]);
        }

        // Notify all participants class ended
        socket.to(roomCode).emit("room-ended", {
          message: "This room has been ended by the instructor",
          roomCode,
        });

        // Send a different message to the instructor
        socket.emit("room-ended-by-you", {
          message:
            "You have successfully ended the meeting for all participants",
          roomCode,
        });

        // Remove all participants from the room
        if (rooms[roomCode]) {
          rooms[roomCode] = [];
          io.to(roomCode).emit("participants-update", []);
        }
      } catch (error) {
        socket.emit("room-end-error", {
          message: error.message,
        });
      }
    });

    socket.on("moving-update", ({ roomCode, userId, isMoving }) => {
      socket.to(roomCode).emit("peer-moving", { userId, isMoving });
    });

    // Chat messages
    socket.on(
      "send-message",
      async ({ roomCode, userId, username, message }) => {
        const { pool } = await import("./config/database.js");
        try {
          const roomRes = await pool.query(
            "SELECT id FROM classrooms WHERE room_code = $1",
            [roomCode],
          );
          const room_id = roomRes.rows[0]?.id;
          if (room_id) {
            await pool.query(
              "INSERT INTO messages (room_id, user_id, message) VALUES ($1, $2, $3)",
              [room_id, userId, message],
            );
          }
        } catch (e) {
          console.error("save message error:", e);
        }

        socket.broadcast.to(roomCode).emit("receive-message", {
          userId,
          username,
          message,
          sent_at: new Date().toISOString(),
        });
      },
    );

    // Emote sync
    socket.on("emote", ({ roomCode, userId, emote }) => {
      socket.to(roomCode).emit("peer-emote", { userId, emote });
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
