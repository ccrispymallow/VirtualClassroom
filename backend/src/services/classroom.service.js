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

// JOIN classroom (check code + password)
export const joinClassroom = async ({ room_code, room_password }) => {
  const result = await pool.query(
    `SELECT * FROM classrooms WHERE room_code = $1`,
    [room_code],
  );
  const classroom = result.rows[0];
  if (!classroom) return null;
  if (classroom.room_password && classroom.room_password !== room_password) {
    throw new Error("Invalid password");
  }
  return classroom;
};
