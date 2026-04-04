import { pool } from "../config/database.js";

// CREATE classroom
export const createClassroom = async ({
  room_name,
  room_code,
  room_password,
  capacity,
  creator_id,
}) => {
  const result = await pool.query(
    `INSERT INTO classrooms 
     (room_name, room_code, room_password, capacity, creator_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [room_name, room_code, room_password, capacity || 5, creator_id],
  );
  return result.rows[0];
};

// GET all classrooms
export const getAllClassrooms = async () => {
  const result = await pool.query(
    `SELECT * FROM classrooms ORDER BY created_at DESC`,
  );
  return result.rows;
};

// GET classroom by ID
export const getClassroomById = async (id) => {
  const result = await pool.query(`SELECT * FROM classrooms WHERE id = $1`, [
    id,
  ]);
  return result.rows[0];
};

// Ensure there is an active session for a room, used by room joins
const getOrCreateSession = async (room_id) => {
  const sessionResult = await pool.query(
    `SELECT * FROM sessions WHERE room_id = $1 AND end_time IS NULL`,
    [room_id],
  );

  if (sessionResult.rows[0]) {
    return sessionResult.rows[0];
  }

  const insert = await pool.query(
    `INSERT INTO sessions (room_id, start_time) VALUES ($1, CURRENT_TIMESTAMP) RETURNING *`,
    [room_id],
  );

  return insert.rows[0];
};

export const joinClassroom = async ({ room_code, room_password, user_id }) => {
  const result = await pool.query(
    `SELECT * FROM classrooms WHERE room_code = $1`,
    [room_code],
  );

  const classroom = result.rows[0];
  if (!classroom) return null;

  if (classroom.room_password && classroom.room_password !== room_password) {
    throw new Error("Wrong password");
  }

  // Create (or reuse) an active session for this classroom
  await getOrCreateSession(classroom.id);

  const check = await pool.query(
    `SELECT * FROM room_participants 
     WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [classroom.id, user_id],
  );

  if (check.rows.length > 0) {
    return classroom;
  }

  await pool.query(
    `INSERT INTO room_participants (room_id, user_id)
     VALUES ($1, $2)`,
    [classroom.id, user_id],
  );

  return classroom;
};

export const getParticipants = async (room_id) => {
  const result = await pool.query(
    `SELECT rp.user_id, u.username, u.email, rp.joined_at
     FROM room_participants rp
     JOIN users u ON rp.user_id = u.id
     WHERE rp.room_id = $1
       AND rp.left_at IS NULL`,
    [room_id],
  );

  return result.rows;
};

export const endClassroom = async (room_code, user_id) => {
  const roomResult = await pool.query(
    `SELECT * FROM classrooms WHERE room_code = $1`,
    [room_code],
  );

  const classroom = roomResult.rows[0];
  if (!classroom) {
    throw new Error("Classroom not found");
  }

  if (classroom.creator_id !== user_id) {
    throw new Error("Only the room creator can end the room");
  }

  // Mark associated active session as ended
  await pool.query(
    `UPDATE sessions SET end_time = CURRENT_TIMESTAMP WHERE room_id = $1 AND end_time IS NULL`,
    [classroom.id],
  );

  return classroom;
};

// DELETE classroom
export const deleteClassroom = async (id, user_id) => {
  const roomResult = await pool.query(
    `SELECT * FROM classrooms WHERE id = $1`,
    [id],
  );
  const classroom = roomResult.rows[0];

  if (!classroom) throw new Error("Classroom not found");
  if (classroom.creator_id !== user_id)
    throw new Error("Only the room creator can delete the classroom");

  // Remove participants
  await pool.query(`DELETE FROM room_participants WHERE room_id = $1`, [id]);

  // End any active sessions
  await pool.query(
    `UPDATE sessions SET end_time = CURRENT_TIMESTAMP 
     WHERE room_id = $1 AND end_time IS NULL`,
    [id],
  );

  // Delete the classroom
  const deleted = await pool.query(
    `DELETE FROM classrooms WHERE id = $1 RETURNING *`,
    [id],
  );

  return deleted.rows[0];
};

// GET classrooms created by prof/instructor
export const getClassroomsByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT c.*, 
      CASE WHEN EXISTS (
        SELECT 1 FROM sessions s 
        WHERE s.room_id = c.id AND s.end_time IS NULL
      ) THEN 'live' ELSE 'offline' END as live_status
     FROM classrooms c
     WHERE c.creator_id = $1
     ORDER BY c.created_at DESC`,
    [user_id],
  );
  return result.rows;
};

// GET classrooms a student has previously joined
export const getJoinedClassroomsByUserId = async (user_id) => {
  const result = await pool.query(
    `SELECT DISTINCT c.*,
      CASE WHEN EXISTS (
        SELECT 1 FROM sessions s 
        WHERE s.room_id = c.id AND s.end_time IS NULL
      ) THEN 'live' ELSE 'offline' END as live_status
     FROM classrooms c
     JOIN room_participants rp ON rp.room_id = c.id
     WHERE rp.user_id = $1
     ORDER BY c.created_at DESC`,
    [user_id],
  );
  return result.rows;
};

export const leaveClassroom = async (room_id, user_id) => {
  const result = await pool.query(
    `DELETE FROM room_participants 
     WHERE room_id = $1 AND user_id = $2
     RETURNING *`,
    [room_id, user_id],
  );
  return result.rows[0] ?? null;
};
