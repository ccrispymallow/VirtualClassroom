import { pool } from "../config/database.js";

export const saveMessage = async ({ room_id, user_id, message }) => {
  const result = await pool.query(
    `INSERT INTO messages (room_id, user_id, message) VALUES ($1, $2, $3) RETURNING *`,
    [room_id, user_id, message],
  );
  return result.rows[0];
};

export const getMessagesByRoom = async (room_id) => {
  const result = await pool.query(
    `SELECT m.*, u.username FROM messages m
     JOIN users u ON m.user_id = u.id
     WHERE m.room_id = $1
     ORDER BY m.sent_at ASC`,
    [room_id],
  );
  return result.rows;
};
