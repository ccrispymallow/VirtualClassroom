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

export const joinClassroom = async ({ room_code, room_password, user_id }) => {
  const result = await pool.query(
    `SELECT * FROM classrooms WHERE room_code = $1`,
    [room_code],
  );

  const classroom = result.rows[0];
  if (!classroom) return null;

  // Check if room has been ended
  if (classroom.ended_at) {
    throw new Error("This room has ended and is no longer available");
  }

  if (classroom.room_password && classroom.room_password !== room_password) {
    throw new Error("Wrong password");
  }

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
  // First check if user is the creator of the room
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

  if (classroom.ended_at) {
    throw new Error("Room has already been ended");
  }

  // End the room
  await pool.query(
    `UPDATE classrooms SET ended_at = CURRENT_TIMESTAMP WHERE room_code = $1`,
    [room_code],
  );

  return { ...classroom, ended_at: new Date() };
};
