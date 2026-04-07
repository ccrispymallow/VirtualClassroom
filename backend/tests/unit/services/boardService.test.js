import { jest } from "@jest/globals";

// ─── 1. Define mock ────────────────────────────────────────────
const mockQuery = jest.fn();

// ─── 2. Register mock BEFORE importing anything ────────────────
await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const {
  createNote,
  getNotesByRoom,
  deleteNote,
  createAnnouncement,
  getAnnouncementsByRoom,
  deleteAnnouncement,
  createFile,
  getFilesByRoom,
  deleteFile,
} = await import("../../../src/services/board.service.js");

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────────────────────
describe("createNote", () => {
  test("should insert note with default yellow color and return row", async () => {
    // Arrange
    const mockRow = {
      id: 1,
      room_id: "10",
      text: "Study hard",
      color: "yellow",
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await createNote({
      room_id: "10",
      user_id: "1",
      text: "Study hard",
      color: undefined,
    });

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "10",
      "1",
      "Study hard",
      "yellow",
    ]);
    expect(result).toEqual(mockRow);
  });

  test("should use provided color when specified", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [{ id: 2, color: "blue" }] });

    // Act
    await createNote({
      room_id: "10",
      user_id: "1",
      text: "Note",
      color: "blue",
    });

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "10",
      "1",
      "Note",
      "blue",
    ]);
  });
});

describe("getNotesByRoom", () => {
  test("should return notes with username", async () => {
    // Arrange
    const mockRows = [{ id: 1, text: "Note A", username: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getNotesByRoom("10");

    // Assert
    expect(result).toEqual(mockRows);
  });
});

describe("deleteNote", () => {
  test("should delete and return the deleted note", async () => {
    // Arrange
    const mockRow = { id: 1, text: "Note A" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await deleteNote(1);

    // Assert
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when note not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await deleteNote(999);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// Announcements
// ──────────────────────────────────────────────────────────────
describe("createAnnouncement", () => {
  test("should insert and return announcement row", async () => {
    // Arrange
    const mockRow = { id: 1, room_id: "10", text: "Class at 9am" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await createAnnouncement({
      room_id: "10",
      user_id: "1",
      text: "Class at 9am",
    });

    // Assert
    expect(result).toEqual(mockRow);
  });
});

describe("getAnnouncementsByRoom", () => {
  test("should return announcements with username", async () => {
    // Arrange
    const mockRows = [{ id: 1, text: "Hi", username: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getAnnouncementsByRoom("10");

    // Assert
    expect(result).toEqual(mockRows);
  });
});

describe("deleteAnnouncement", () => {
  test("should delete and return announcement", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    // Act
    const result = await deleteAnnouncement(1);

    // Assert
    expect(result).toEqual({ id: 1 });
  });

  test("should return undefined when announcement not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await deleteAnnouncement(999);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// Files
// ──────────────────────────────────────────────────────────────
describe("createFile", () => {
  test("should insert file record and return row", async () => {
    // Arrange
    const fileData = {
      room_id: "10",
      uploaded_by: "1",
      file_name: "slides.pdf",
      file_url: "/uploads/slides.pdf",
      file_type: "application/pdf",
    };
    const mockRow = { id: 1, ...fileData };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await createFile(fileData);

    // Assert
    expect(result).toEqual(mockRow);
  });
});

describe("getFilesByRoom", () => {
  test("should return files with uploader username", async () => {
    // Arrange
    const mockRows = [{ id: 1, file_name: "slides.pdf", uploader: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getFilesByRoom("10");

    // Assert
    expect(result).toEqual(mockRows);
  });
});

describe("deleteFile", () => {
  test("should delete and return file record", async () => {
    // Arrange
    const mockRow = { id: 1, file_url: "/uploads/slides.pdf" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await deleteFile(1);

    // Assert
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when file not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await deleteFile(999);

    // Assert
    expect(result).toBeUndefined();
  });
});
