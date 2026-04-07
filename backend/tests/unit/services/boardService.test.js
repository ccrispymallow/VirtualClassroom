import { jest } from "@jest/globals";

const mockQuery = jest.fn();

await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

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

describe("createNote", () => {
  test("should insert note with default yellow color and return row", async () => {
    const mockRow = {
      id: 1,
      room_id: "10",
      text: "Study hard",
      color: "yellow",
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createNote({
      room_id: "10",
      user_id: "1",
      text: "Study hard",
      color: undefined,
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "10",
      "1",
      "Study hard",
      "yellow",
    ]);
    expect(result).toEqual(mockRow);
  });

  test("should use provided color when specified", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 2, color: "blue" }] });

    await createNote({
      room_id: "10",
      user_id: "1",
      text: "Note",
      color: "blue",
    });

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
    const mockRows = [{ id: 1, text: "Note A", username: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getNotesByRoom("10");

    expect(result).toEqual(mockRows);
  });
});

describe("deleteNote", () => {
  test("should delete and return the deleted note", async () => {
    const mockRow = { id: 1, text: "Note A" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await deleteNote(1);

    expect(result).toEqual(mockRow);
  });

  test("should return undefined when note not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await deleteNote(999);

    expect(result).toBeUndefined();
  });
});

describe("createAnnouncement", () => {
  test("should insert and return announcement row", async () => {
    const mockRow = { id: 1, room_id: "10", text: "Class at 9am" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createAnnouncement({
      room_id: "10",
      user_id: "1",
      text: "Class at 9am",
    });

    expect(result).toEqual(mockRow);
  });
});

describe("getAnnouncementsByRoom", () => {
  test("should return announcements with username", async () => {
    const mockRows = [{ id: 1, text: "Hi", username: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getAnnouncementsByRoom("10");

    expect(result).toEqual(mockRows);
  });
});

describe("deleteAnnouncement", () => {
  test("should delete and return announcement", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });

    const result = await deleteAnnouncement(1);

    expect(result).toEqual({ id: 1 });
  });

  test("should return undefined when announcement not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await deleteAnnouncement(999);

    expect(result).toBeUndefined();
  });
});

describe("createFile", () => {
  test("should insert file record and return row", async () => {
    const fileData = {
      room_id: "10",
      uploaded_by: "1",
      file_name: "slides.pdf",
      file_url: "/uploads/slides.pdf",
      file_type: "application/pdf",
    };
    const mockRow = { id: 1, ...fileData };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createFile(fileData);

    expect(result).toEqual(mockRow);
  });
});

describe("getFilesByRoom", () => {
  test("should return files with uploader username", async () => {
    const mockRows = [{ id: 1, file_name: "slides.pdf", uploader: "panchaya" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getFilesByRoom("10");

    expect(result).toEqual(mockRows);
  });
});

describe("deleteFile", () => {
  test("should delete and return file record", async () => {
    const mockRow = { id: 1, file_url: "/uploads/slides.pdf" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await deleteFile(1);

    expect(result).toEqual(mockRow);
  });

  test("should return undefined when file not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await deleteFile(999);

    expect(result).toBeUndefined();
  });
});
