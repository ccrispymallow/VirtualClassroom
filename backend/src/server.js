import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";
import classroomRoutes from "./routes/classroomRoutes.js";
import { Server } from "socket.io";
import { PeerServer } from "peer";
import { initSocket } from "./socket.js";
import { createServer } from "http";

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.use(cors());
app.use(express.json());

const io = new Server(httpServer, { cors: { origin: "*" } });
initSocket(io);

// PeerJS server
const peerServer = PeerServer({ port: 9000, path: "/peerjs" });
console.log("PeerJS server running on port 9000");

// Routes
app.use("/api/users", userRoutes);
app.use("/api/classrooms", classroomRoutes);

app.get("/api", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Backend is running",
      time: result.rows[0],
      api: "http://localhost:5001/api",
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Error handling middleware
app.use(errorHandler);

// app.listen(PORT, () => {
//   console.log(`Backend running on port ${PORT}`);
// });

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`PeerJS server running on port 9000`);
});
