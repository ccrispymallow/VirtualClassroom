import * as boardService from "../services/board.service.js";
import path from "path";
import fs from "fs";
import { uploadsDir } from "../server.js";

// Notes
export const createNote = async (req, res, next) => {
  try {
    const { room_id, text, color } = req.body;
    const user_id = req.params.userId;
    if (!room_id || !text) {
      return res.status(400).json({ error: "room_id and text are required" });
    }
    const note = await boardService.createNote({
      room_id,
      user_id,
      text,
      color,
    });
    res.status(201).json({ message: "Note created", note });
  } catch (error) {
    next(error);
  }
};

export const getNotesByRoom = async (req, res, next) => {
  try {
    const notes = await boardService.getNotesByRoom(req.params.roomId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req, res, next) => {
  try {
    const deleted = await boardService.deleteNote(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (error) {
    next(error);
  }
};

// Announcements
export const createAnnouncement = async (req, res, next) => {
  try {
    const { room_id, text } = req.body;
    const user_id = req.params.userId;
    if (!room_id || !text) {
      return res.status(400).json({ error: "room_id and text are required" });
    }
    const announcement = await boardService.createAnnouncement({
      room_id,
      user_id,
      text,
    });
    res.status(201).json({ message: "Announcement posted", announcement });
  } catch (error) {
    next(error);
  }
};

export const getAnnouncementsByRoom = async (req, res, next) => {
  try {
    const announcements = await boardService.getAnnouncementsByRoom(
      req.params.roomId,
    );
    res.json(announcements);
  } catch (error) {
    next(error);
  }
};

export const deleteAnnouncement = async (req, res, next) => {
  try {
    const deleted = await boardService.deleteAnnouncement(req.params.id);
    if (!deleted)
      return res.status(404).json({ error: "Announcement not found" });
    res.json({ message: "Announcement deleted" });
  } catch (error) {
    next(error);
  }
};

// Files
export const uploadFile = async (req, res, next) => {
  try {
    const { room_id, uploaded_by } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    if (!room_id || !uploaded_by) {
      return res
        .status(400)
        .json({ error: "room_id and uploaded_by are required" });
    }
    const file = await boardService.createFile({
      room_id,
      uploaded_by,
      file_name: req.file.originalname,
      file_url: `/uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
    });
    res.status(201).json({ message: "File uploaded", file });
  } catch (error) {
    next(error);
  }
};

export const getFilesByRoom = async (req, res, next) => {
  try {
    const files = await boardService.getFilesByRoom(req.params.roomId);
    res.json(files);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const deleted = await boardService.deleteFile(req.params.id);
    if (!deleted) return res.status(404).json({ error: "File not found" });

    const filename = path.basename(deleted.file_url);
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: "File deleted" });
  } catch (error) {
    next(error);
  }
};
