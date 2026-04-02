exports.up = (pgm) => {
  // Board Notes
  pgm.createTable("board_notes", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    text: { type: "text", notNull: true },
    color: { type: "varchar(20)", default: "yellow" },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Board Announcements
  pgm.createTable("board_announcements", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      references: '"users"',
      onDelete: "CASCADE",
    },
    text: { type: "text", notNull: true },
    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Board Files
  pgm.createTable("board_files", {
    id: "id",
    room_id: {
      type: "integer",
      references: '"classrooms"',
      onDelete: "CASCADE",
    },
    uploaded_by: {
      type: "integer",
      references: '"users"',
      onDelete: "SET NULL",
    },
    file_name: { type: "varchar(255)", notNull: true },
    file_url: { type: "varchar(500)", notNull: true },
    file_type: { type: "varchar(100)" },
    uploaded_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  // Add status to sessions
  pgm.addColumns("sessions", {
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "scheduled",
      check: "status IN ('scheduled', 'live', 'ended')",
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("sessions", ["status"]);
  pgm.dropTable("board_files");
  pgm.dropTable("board_announcements");
  pgm.dropTable("board_notes");
};
