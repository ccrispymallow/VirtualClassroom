import { pool } from "../config/database.js";

export const createUser = async ({ username, email, password, role }) => {
  const result = await pool.query(
    `INSERT INTO users (username, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, role`,
    [username, email, password, role],
  );

  return result.rows[0];
};

export const getAllUsers = async () => {
  const result = await pool.query(
    "SELECT id, username, email, role FROM users ORDER BY id",
  );

  return result.rows;
};

export const getUserById = async (id) => {
  const result = await pool.query(
    "SELECT id, username, email, role FROM users WHERE id = $1",
    [id],
  );

  return result.rows[0];
};

export const login = async (email) => {
  const result = await pool.query(
    "SELECT id, username, email, password, role FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0];
};

export const updateUser = async (id, { username, avatar }) => {
  const result = await pool.query(
    `UPDATE users
     SET username = COALESCE($1, username),
         avatar = COALESCE($2, avatar)
     WHERE id = $3
     RETURNING id, username, email, role, avatar`,
    [username, avatar, id],
  );

  return result.rows[0];
};
