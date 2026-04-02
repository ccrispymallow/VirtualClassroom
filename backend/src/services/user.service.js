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
    `SELECT users.id, users.username, users.email, users.role, avatars.name AS avatar
     FROM users
     LEFT JOIN avatars ON users.avatar_id = avatars.id
     WHERE users.id = $1`,
    [id],
  );

  return result.rows[0];
};

export const login = async (email) => {
  const result = await pool.query(
    `SELECT users.id, users.username, users.email, users.password, users.role, avatars.name AS avatar
     FROM users
     LEFT JOIN avatars ON users.avatar_id = avatars.id
     WHERE users.email = $1`,
    [email],
  );

  return result.rows[0];
};

const ensureAvatarEntry = async (name) => {
  if (!name) return null;

  const existing = await pool.query(
    "SELECT id FROM avatars WHERE name = $1",
    [name],
  );

  if (existing.rows[0]) return existing.rows[0].id;

  const modelPath = `/assets/${name}.glb`;
  const insert = await pool.query(
    "INSERT INTO avatars (name, model_path) VALUES ($1, $2) RETURNING id",
    [name, modelPath],
  );

  return insert.rows[0].id;
};

export const updateUser = async (id, { username, avatar }) => {
  const avatarId = avatar ? await ensureAvatarEntry(avatar) : null;

  const result = await pool.query(
    `UPDATE users
     SET username = COALESCE($1, username),
         avatar_id = COALESCE($2, avatar_id)
     WHERE id = $3
     RETURNING id, username, email, role, avatar_id`,
    [username, avatarId, id],
  );

  const user = result.rows[0];
  if (!user) return null;

  if (user.avatar_id) {
    const avatarRow = await pool.query(
      "SELECT name FROM avatars WHERE id = $1",
      [user.avatar_id],
    );
    user.avatar = avatarRow.rows[0]?.name || null;
  }

  delete user.avatar_id;
  return user;
};
