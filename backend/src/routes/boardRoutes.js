import express from "express";
import multer from "multer";
import {
  createNote,
  getNotesByRoom,
  deleteNote,
  createAnnouncement,
  getAnnouncementsByRoom,
  deleteAnnouncement,
  uploadFile,
  getFilesByRoom,
  deleteFile,
} from "../controllers/board.controller.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Notes
router.post("/notes/:userId", createNote);
router.get("/notes/room/:roomId", getNotesByRoom);
router.delete("/notes/:id", deleteNote);

// Announcements
router.post("/announcements/:userId", createAnnouncement);
router.get("/announcements/room/:roomId", getAnnouncementsByRoom);
router.delete("/announcements/:id", deleteAnnouncement);

// Files
router.post("/files", upload.single("file"), uploadFile);
router.get("/files/room/:roomId", getFilesByRoom);
router.delete("/files/:id", deleteFile);

export default router;
