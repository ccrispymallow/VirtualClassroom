import { jest } from "@jest/globals";

// ─── 1. Define mocks ───────────────────────────────────────────
const mockCreateNote = jest.fn();
const mockGetNotesByRoom = jest.fn();
const mockDeleteNote = jest.fn();
const mockCreateAnnouncement = jest.fn();
const mockGetAnnouncementsByRoom = jest.fn();
const mockDeleteAnnouncement = jest.fn();
const mockCreateFile = jest.fn();
const mockGetFilesByRoom = jest.fn();
const mockDeleteFile = jest.fn();

// ─── 2. Register mocks BEFORE importing anything ───────────────
await jest.unstable_mockModule(
  "../../../src/services/board.service.js",
  () => ({
    createNote: mockCreateNote,
    getNotesByRoom: mockGetNotesByRoom,
    deleteNote: mockDeleteNote,
    createAnnouncement: mockCreateAnnouncement,
    getAnnouncementsByRoom: mockGetAnnouncementsByRoom,
    deleteAnnouncement: mockDeleteAnnouncement,
    createFile: mockCreateFile,
    getFilesByRoom: mockGetFilesByRoom,
    deleteFile: mockDeleteFile,
  }),
);

await jest.unstable_mockModule("../../../src/server.js", () => ({
  uploadsDir: "/fake/uploads",
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const {
  createNote,
  getNotesByRoom,
  deleteNote,
  createAnnouncement,
  getAnnouncementsByRoom,
  deleteAnnouncement,
  uploadFile,
  getFilesByRoom,
  deleteFile,
} = await import("../../../src/controllers/board.controller.js");

// ─── Helpers ───────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────────────────────
describe("createNote", () => {
  test("should return 201 with note on valid input", async () => {
    // Arrange
    const req = {
      body: { room_id: "10", text: "Important note", color: "blue" },
      params: { userId: "1" },
    };
    const res = mockRes();
    const mockNote = {
      id: 1,
      room_id: "10",
      text: "Important note",
      color: "blue",
    };
    mockCreateNote.mockResolvedValue(mockNote);

    // Act
    await createNote(req, res, mockNext);

    // Assert
    expect(mockCreateNote).toHaveBeenCalledWith({
      room_id: "10",
      user_id: "1",
      text: "Important note",
      color: "blue",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Note created",
      note: mockNote,
    });
  });

  test("should return 400 when room_id or text is missing", async () => {
    // Arrange
    const req = { body: { room_id: "10" }, params: { userId: "1" } }; // missing text
    const res = mockRes();

    // Act
    await createNote(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "room_id and text are required",
    });
    expect(mockCreateNote).not.toHaveBeenCalled();
  });

  test("should call next(error) on service failure", async () => {
    // Arrange
    const req = {
      body: { room_id: "10", text: "Note" },
      params: { userId: "1" },
    };
    const res = mockRes();
    mockCreateNote.mockRejectedValue(new Error("DB error"));

    // Act
    await createNote(req, res, mockNext);

    // Assert
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getNotesByRoom", () => {
  test("should return notes for a room", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    const mockNotes = [
      { id: 1, text: "Note A" },
      { id: 2, text: "Note B" },
    ];
    mockGetNotesByRoom.mockResolvedValue(mockNotes);

    // Act
    await getNotesByRoom(req, res, mockNext);

    // Assert
    expect(mockGetNotesByRoom).toHaveBeenCalledWith("10");
    expect(res.json).toHaveBeenCalledWith(mockNotes);
  });
});

describe("deleteNote", () => {
  test("should delete note and return success message", async () => {
    // Arrange
    const req = { params: { id: "1" } };
    const res = mockRes();
    mockDeleteNote.mockResolvedValue({ id: 1 });

    // Act
    await deleteNote(req, res, mockNext);

    // Assert
    expect(res.json).toHaveBeenCalledWith({ message: "Note deleted" });
  });

  test("should return 404 when note not found", async () => {
    // Arrange
    const req = { params: { id: "999" } };
    const res = mockRes();
    mockDeleteNote.mockResolvedValue(null);

    // Act
    await deleteNote(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Note not found" });
  });
});

// ──────────────────────────────────────────────────────────────
// Announcements
// ──────────────────────────────────────────────────────────────
describe("createAnnouncement", () => {
  test("should return 201 with announcement on valid input", async () => {
    // Arrange
    const req = {
      body: { room_id: "10", text: "Class starts now!" },
      params: { userId: "1" },
    };
    const res = mockRes();
    const mockAnnouncement = { id: 1, text: "Class starts now!" };
    mockCreateAnnouncement.mockResolvedValue(mockAnnouncement);

    // Act
    await createAnnouncement(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Announcement posted",
      announcement: mockAnnouncement,
    });
  });

  test("should return 400 when room_id or text is missing", async () => {
    // Arrange
    const req = { body: { text: "Hello" }, params: { userId: "1" } }; // missing room_id
    const res = mockRes();

    // Act
    await createAnnouncement(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "room_id and text are required",
    });
  });
});

describe("getAnnouncementsByRoom", () => {
  test("should return announcements for a room", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetAnnouncementsByRoom.mockResolvedValue([{ id: 1, text: "Hi" }]);

    // Act
    await getAnnouncementsByRoom(req, res, mockNext);

    // Assert
    expect(res.json).toHaveBeenCalledWith([{ id: 1, text: "Hi" }]);
  });
});

describe("deleteAnnouncement", () => {
  test("should delete announcement successfully", async () => {
    // Arrange
    const req = { params: { id: "1" } };
    const res = mockRes();
    mockDeleteAnnouncement.mockResolvedValue({ id: 1 });

    // Act
    await deleteAnnouncement(req, res, mockNext);

    // Assert
    expect(res.json).toHaveBeenCalledWith({ message: "Announcement deleted" });
  });

  test("should return 404 when announcement not found", async () => {
    // Arrange
    const req = { params: { id: "999" } };
    const res = mockRes();
    mockDeleteAnnouncement.mockResolvedValue(null);

    // Act
    await deleteAnnouncement(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Announcement not found" });
  });
});

// ──────────────────────────────────────────────────────────────
// Files
// ──────────────────────────────────────────────────────────────
describe("uploadFile", () => {
  test("should return 201 with file on successful upload", async () => {
    // Arrange
    const req = {
      body: { room_id: "10", uploaded_by: "1" },
      file: {
        originalname: "slides.pdf",
        filename: "slides_123.pdf",
        mimetype: "application/pdf",
      },
    };
    const res = mockRes();
    const mockFile = { id: 1, file_name: "slides.pdf" };
    mockCreateFile.mockResolvedValue(mockFile);

    // Act
    await uploadFile(req, res, mockNext);

    // Assert
    expect(mockCreateFile).toHaveBeenCalledWith({
      room_id: "10",
      uploaded_by: "1",
      file_name: "slides.pdf",
      file_url: "/uploads/slides_123.pdf",
      file_type: "application/pdf",
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "File uploaded",
      file: mockFile,
    });
  });

  test("should return 400 when no file is provided", async () => {
    // Arrange
    const req = { body: { room_id: "10", uploaded_by: "1" }, file: null };
    const res = mockRes();

    // Act
    await uploadFile(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "No file uploaded" });
  });

  test("should return 400 when room_id or uploaded_by is missing", async () => {
    // Arrange
    const req = {
      body: { room_id: "10" }, // missing uploaded_by
      file: {
        originalname: "slides.pdf",
        filename: "x.pdf",
        mimetype: "application/pdf",
      },
    };
    const res = mockRes();

    // Act
    await uploadFile(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "room_id and uploaded_by are required",
    });
  });
});

describe("getFilesByRoom", () => {
  test("should return files for a room", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetFilesByRoom.mockResolvedValue([{ id: 1, file_name: "slides.pdf" }]);

    // Act
    await getFilesByRoom(req, res, mockNext);

    // Assert
    expect(res.json).toHaveBeenCalledWith([{ id: 1, file_name: "slides.pdf" }]);
  });
});

describe("deleteFile", () => {
  test("should return 404 when file record not found", async () => {
    // Arrange
    const req = { params: { id: "999" } };
    const res = mockRes();
    mockDeleteFile.mockResolvedValue(null);

    // Act
    await deleteFile(req, res, mockNext);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found" });
  });
});
