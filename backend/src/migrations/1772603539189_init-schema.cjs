exports.up = (pgm) => {
  // Avatars
  pgm.createTable("avatars", {
    id: "id",
    name: { type: "varchar(100)", notNull: true },
    model_path: { type: "varchar(255)", notNull: true },
    thumbnail_path: { type: "varchar(255)" },
  });

  // Users
  pgm.createTable("users", {
    id: "id",
    username: { type: "varchar(100)", notNull: true },
    email: { type: "varchar(150)", notNull: true, unique: true },
    password: { type: "varchar(255)", notNull: true },
    role: {
      type: "varchar(20)",
      notNull: true,
      check: "role IN ('student', 'instructor')",
    },
    avatar_id: {
      type: "integer",
      references: '"avatars"',
      onDelete: "SET NULL",
    },
  });

  // Classrooms
  pgm.createTable("classrooms", {
    id: "id",
    room_name: { type: "varchar(100)", notNull: true },
    room_code: { type: "varchar(20)", notNull: true, unique: true },
    room_password: { type: "varchar(100)" },
    capacity: { type: "integer", default: 5 },
    creator_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Room Participants
  pgm.createTable("room_participants", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    user_id: { type: "integer", references: '"users"', onDelete: "CASCADE" },
    joined_at: { type: "timestamp", default: pgm.func("current_timestamp") },
    left_at: { type: "timestamp" },
  });

  // Messages
  pgm.createTable("messages", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    user_id: { type: "integer", references: '"users"', onDelete: "CASCADE" },
    message: { type: "text", notNull: true },
    sent_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  // Sessions
  pgm.createTable("sessions", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    start_time: { type: "timestamp" },
    end_time: { type: "timestamp" },
  });
};

exports.down = (pgm) => {
  // Drop in REVERSE order to avoid Foreign Key violations
  pgm.dropTable("sessions");
  pgm.dropTable("messages");
  pgm.dropTable("room_participants");
  pgm.dropTable("classrooms");
  pgm.dropTable("users");
  pgm.dropTable("avatars");
};
