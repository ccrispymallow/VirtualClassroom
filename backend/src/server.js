import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";
import classroomRoutes from "./routes/classroomRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import { PeerServer } from "peer";
import { initSocket } from "./socket.js";
import { createServer } from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const io = new Server(httpServer, { cors: { origin: "*" } });
initSocket(io);

// PeerJS server
const peerServer = PeerServer({ port: 9000, path: "/peerjs" });
console.log("PeerJS server running on port 9000");

// Routes
app.use("/api/users", userRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/board", boardRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/messages", messageRoutes);

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

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`PeerJS server running on port 9000`);
});
