import { pool } from "../config/database.js";

export const createSession = async ({ room_id, start_time }) => {
  const result = await pool.query(
    `INSERT INTO sessions (room_id, start_time)
     VALUES ($1, $2)
     RETURNING *`,
    [room_id, start_time || new Date()],
  );
  return result.rows[0];
};

export const getLiveSession = async (room_id) => {
  const result = await pool.query(
    `SELECT * FROM sessions
     WHERE room_id = $1 AND end_time IS NULL
     ORDER BY start_time DESC
     LIMIT 1`,
    [room_id],
  );
  return result.rows[0] || null;
};

export const getSessionsByRoom = async (room_id) => {
  const result = await pool.query(
    `SELECT * FROM sessions
     WHERE room_id = $1
     ORDER BY start_time DESC`,
    [room_id],
  );
  return result.rows;
};

export const endSession = async (session_id) => {
  const result = await pool.query(
    `UPDATE sessions
     SET end_time = NOW()
     WHERE id = $1
     RETURNING *`,
    [session_id],
  );
  return result.rows[0];
};

export const endAllLiveSessionsForRoom = async (room_id) => {
  const result = await pool.query(
    `UPDATE sessions
     SET end_time = NOW()
     WHERE room_id = $1 AND end_time IS NULL
     RETURNING *`,
    [room_id],
  );
  return result.rows;
};

export const isRoomActive = async (room_id) => {
  const result = await pool.query(
    `SELECT id FROM sessions
     WHERE room_id = $1 AND end_time IS NULL
     LIMIT 1`,
    [room_id],
  );
  return result.rows.length > 0;
};
