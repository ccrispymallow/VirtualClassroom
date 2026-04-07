exports.up = (pgm) => {
  // Hot paths for room/session lifecycle and chat history
  pgm.createIndex("sessions", ["room_id", "end_time", "start_time"], {
    name: "idx_sessions_room_end_start",
  });
  pgm.createIndex("messages", ["room_id", "sent_at"], {
    name: "idx_messages_room_sent_at",
  });
  pgm.createIndex("room_participants", ["room_id", "user_id", "left_at"], {
    name: "idx_room_participants_room_user_left",
  });

  // Dashboard queries
  pgm.createIndex("classrooms", ["creator_id", "created_at"], {
    name: "idx_classrooms_creator_created",
  });
  pgm.createIndex("room_participants", ["user_id"], {
    name: "idx_room_participants_user",
  });

  // Board queries
  pgm.createIndex("board_notes", ["room_id", "created_at"], {
    name: "idx_board_notes_room_created",
  });
  pgm.createIndex("board_announcements", ["room_id", "created_at"], {
    name: "idx_board_announcements_room_created",
  });
  pgm.createIndex("board_files", ["room_id", "uploaded_at"], {
    name: "idx_board_files_room_uploaded",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex("board_files", ["room_id", "uploaded_at"], {
    name: "idx_board_files_room_uploaded",
  });
  pgm.dropIndex("board_announcements", ["room_id", "created_at"], {
    name: "idx_board_announcements_room_created",
  });
  pgm.dropIndex("board_notes", ["room_id", "created_at"], {
    name: "idx_board_notes_room_created",
  });
  pgm.dropIndex("room_participants", ["user_id"], {
    name: "idx_room_participants_user",
  });
  pgm.dropIndex("classrooms", ["creator_id", "created_at"], {
    name: "idx_classrooms_creator_created",
  });
  pgm.dropIndex("room_participants", ["room_id", "user_id", "left_at"], {
    name: "idx_room_participants_room_user_left",
  });
  pgm.dropIndex("messages", ["room_id", "sent_at"], {
    name: "idx_messages_room_sent_at",
  });
  pgm.dropIndex("sessions", ["room_id", "end_time", "start_time"], {
    name: "idx_sessions_room_end_start",
  });
};
