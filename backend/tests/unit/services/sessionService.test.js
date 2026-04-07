import { jest } from "@jest/globals";

const mockQuery = jest.fn();

await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

const {
  createSession,
  getLiveSession,
  getSessionsByRoom,
  endSession,
  endAllLiveSessionsForRoom,
  isRoomActive,
} = await import("../../../src/services/session.service.js");

afterEach(() => jest.clearAllMocks());

describe("createSession", () => {
  test("should insert and return new session", async () => {
    const mockRow = { id: 5, room_id: "10", status: "live" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createSession({ room_id: "10" });

    expect(result).toEqual(mockRow);
  });
});

describe("getLiveSession", () => {
  test("should return live session when found", async () => {
    const mockRow = { id: 5, room_id: "10", status: "live" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await getLiveSession("10");

    expect(result).toEqual(mockRow);
  });

  test("should return null when no live session exists", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getLiveSession("10");

    expect(result).toBeNull();
  });
});

describe("getSessionsByRoom", () => {
  test("should return all sessions for a room", async () => {
    const mockRows = [{ id: 5 }, { id: 6 }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getSessionsByRoom("10");

    expect(result).toEqual(mockRows);
  });
});

describe("endSession", () => {
  test("should update session to ended and return the row", async () => {
    const mockRow = { id: 5, status: "ended" };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await endSession(5);

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [5]);
    expect(result).toEqual(mockRow);
  });

  test("should return undefined when session not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await endSession(999);

    expect(result).toBeUndefined();
  });
});

describe("endAllLiveSessionsForRoom", () => {
  test("should end all live sessions and return updated rows", async () => {
    const mockRows = [{ id: 5, status: "ended" }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await endAllLiveSessionsForRoom("10");

    expect(result).toEqual(mockRows);
  });

  test("should return empty array when no live sessions", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await endAllLiveSessionsForRoom("10");

    expect(result).toEqual([]);
  });
});

describe("isRoomActive", () => {
  test("should return true when a live session exists", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 5 }] });

    const result = await isRoomActive("10");

    expect(result).toBe(true);
  });

  test("should return false when no live session", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await isRoomActive("10");

    expect(result).toBe(false);
  });
});
