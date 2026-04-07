import { jest } from "@jest/globals";

// ─── 1. Define mock ────────────────────────────────────────────
const mockQuery = jest.fn();

// ─── 2. Register mock BEFORE importing anything ────────────────
await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const {
  createSession,
  getLiveSession,
  getSessionsByRoom,
  endSession,
  endAllLiveSessionsForRoom,
  isRoomActive,
} = await import("../../../src/services/session.service.js");

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// createSession
// ──────────────────────────────────────────────────────────────
describe("createSession", () => {
  test("should insert and return new session", async () => {
    // Arrange
    const mockRow = { id: 5, room_id: "10", status: "live" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await createSession({ room_id: "10" });

    // Assert
    expect(result).toEqual(mockRow);
  });
});

// ──────────────────────────────────────────────────────────────
// getLiveSession
// ──────────────────────────────────────────────────────────────
describe("getLiveSession", () => {
  test("should return live session when found", async () => {
    // Arrange
    const mockRow = { id: 5, room_id: "10", status: "live" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await getLiveSession("10");

    // Assert
    expect(result).toEqual(mockRow);
  });

  test("should return null when no live session exists", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await getLiveSession("10");

    // Assert
    expect(result).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────
// getSessionsByRoom
// ──────────────────────────────────────────────────────────────
describe("getSessionsByRoom", () => {
  test("should return all sessions for a room", async () => {
    // Arrange
    const mockRows = [{ id: 5 }, { id: 6 }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getSessionsByRoom("10");

    // Assert
    expect(result).toEqual(mockRows);
  });
});

// ──────────────────────────────────────────────────────────────
// endSession
// ──────────────────────────────────────────────────────────────
describe("endSession", () => {
  test("should update session to ended and return the row", async () => {
    // Arrange
    const mockRow = { id: 5, status: "ended" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await endSession(5);

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [5]);
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when session not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await endSession(999);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// endAllLiveSessionsForRoom
// ──────────────────────────────────────────────────────────────
describe("endAllLiveSessionsForRoom", () => {
  test("should end all live sessions and return updated rows", async () => {
    // Arrange
    const mockRows = [{ id: 5, status: "ended" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await endAllLiveSessionsForRoom("10");

    // Assert
    expect(result).toEqual(mockRows);
  });

  test("should return empty array when no live sessions", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await endAllLiveSessionsForRoom("10");

    // Assert
    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────
// isRoomActive
// ──────────────────────────────────────────────────────────────
describe("isRoomActive", () => {
  test("should return true when a live session exists", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [{ id: 5 }] });

    // Act
    const result = await isRoomActive("10");

    // Assert
    expect(result).toBe(true);
  });

  test("should return false when no live session", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await isRoomActive("10");

    // Assert
    expect(result).toBe(false);
  });
});
