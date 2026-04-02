import { pool } from "../config/database.js";

// ── Notes ──
export const createNote = async ({ room_id, user_id, text, color }) => {
  const result = await pool.query(
    `INSERT INTO board_notes (room_id, user_id, text, color)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [room_id, user_id, text, color || "yellow"],
  );
  return result.rows[0];
};

export const getNotesByRoom = async (room_id) => {
  const result = await pool.query(
    `SELECT board_notes.*, users.username
     FROM board_notes
     JOIN users ON board_notes.user_id = users.id
     WHERE board_notes.room_id = $1
     ORDER BY board_notes.created_at ASC`,
    [room_id],
  );
  return result.rows;
};

export const deleteNote = async (id) => {
  const result = await pool.query(
    `DELETE FROM board_notes WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

// ── Announcements ──
export const createAnnouncement = async ({ room_id, user_id, text }) => {
  const result = await pool.query(
    `INSERT INTO board_announcements (room_id, user_id, text)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [room_id, user_id, text],
  );
  return result.rows[0];
};

export const getAnnouncementsByRoom = async (room_id) => {
  const result = await pool.query(
    `SELECT board_announcements.*, users.username
     FROM board_announcements
     JOIN users ON board_announcements.user_id = users.id
     WHERE board_announcements.room_id = $1
     ORDER BY board_announcements.created_at DESC`,
    [room_id],
  );
  return result.rows;
};

export const deleteAnnouncement = async (id) => {
  const result = await pool.query(
    `DELETE FROM board_announcements WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};

// ── Files ──
export const createFile = async ({
  room_id,
  uploaded_by,
  file_name,
  file_url,
  file_type,
}) => {
  const result = await pool.query(
    `INSERT INTO board_files (room_id, uploaded_by, file_name, file_url, file_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [room_id, uploaded_by, file_name, file_url, file_type],
  );
  return result.rows[0];
};

export const getFilesByRoom = async (room_id) => {
  const result = await pool.query(
    `SELECT board_files.*, users.username AS uploader
     FROM board_files
     LEFT JOIN users ON board_files.uploaded_by = users.id
     WHERE board_files.room_id = $1
     ORDER BY board_files.uploaded_at ASC`,
    [room_id],
  );
  return result.rows;
};

export const deleteFile = async (id) => {
  const result = await pool.query(
    `DELETE FROM board_files WHERE id = $1 RETURNING *`,
    [id],
  );
  return result.rows[0];
};
