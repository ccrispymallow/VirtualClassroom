import { jest } from "@jest/globals";

// ─── 1. Define mock ────────────────────────────────────────────
const mockQuery = jest.fn();

// ─── 2. Register mock BEFORE importing anything ────────────────
await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const { saveMessage, getMessagesByRoom, deleteMessagesByRoom } =
  await import("../../../src/services/message.service.js");

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// saveMessage
// ──────────────────────────────────────────────────────────────
describe("saveMessage", () => {
  test("should insert message and return the saved row", async () => {
    // Arrange
    const msgData = { room_id: "10", user_id: "1", message: "Hello class!" };
    const mockRow = { id: 1, ...msgData };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await saveMessage(msgData);

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "10",
      "1",
      "Hello class!",
    ]);
    expect(result).toEqual(mockRow);
  });
});

// ──────────────────────────────────────────────────────────────
// getMessagesByRoom
// ──────────────────────────────────────────────────────────────
describe("getMessagesByRoom", () => {
  test("should return messages with username joined", async () => {
    // Arrange
    const mockRows = [
      { id: 1, message: "Hi!", username: "panchaya" },
      { id: 2, message: "Hey!", username: "piraya" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getMessagesByRoom("10");

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["10"]);
    expect(result).toEqual(mockRows);
  });

  test("should return empty array when no messages exist", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await getMessagesByRoom("99");

    // Assert
    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────
// deleteMessagesByRoom
// ──────────────────────────────────────────────────────────────
describe("deleteMessagesByRoom", () => {
  test("should call DELETE query for the room", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    await deleteMessagesByRoom("10");

    // Assert
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["10"]);
  });
});
