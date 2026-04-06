import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pool } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";
import classroomRoutes from "./routes/classroomRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { Server } from "socket.io";
import { PeerServer, ExpressPeerServer } from "peer";
import { initSocket } from "./socket.js";
import { createServer } from "http";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Uploads directory
export const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log("Uploads directory:", uploadsDir);

const app = express();
const httpServer = createServer(app);

const FRONTEND_ORIGIN =
  process.env.CORS_ORIGIN ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});

initSocket(io);

// PeerJS - local vs production
if (process.env.CORS_ORIGIN || process.env.FRONTEND_URL) {
  const peerServer = ExpressPeerServer(httpServer, { path: "/" });
  app.use("/peerjs", peerServer);
  console.log("PeerJS running via ExpressPeerServer (production)");
} else {
  PeerServer({ port: 9000, path: "/peerjs" });
  console.log("PeerJS server running on port 9000 (local)");
}

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
      api: `${process.env.VITE_BASE_URL || "http://localhost:5001"}/api`,
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
