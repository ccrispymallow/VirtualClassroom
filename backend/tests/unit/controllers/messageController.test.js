import { jest } from "@jest/globals";

// ─── 1. Define mocks ───────────────────────────────────────────
const mockGetMessagesByRoom = jest.fn();
const mockDeleteMessagesByRoom = jest.fn();

// ─── 2. Register mocks BEFORE importing anything ───────────────
await jest.unstable_mockModule(
  "../../../src/services/message.service.js",
  () => ({
    getMessagesByRoom: mockGetMessagesByRoom,
    deleteMessagesByRoom: mockDeleteMessagesByRoom,
  }),
);

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
const { getMessages, deleteMessages } =
  await import("../../../src/controllers/message.controller.js");

// ─── Helpers ───────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

afterEach(() => jest.clearAllMocks());

// ──────────────────────────────────────────────────────────────
// getMessages
// ──────────────────────────────────────────────────────────────
describe("getMessages", () => {
  test("should return messages for a room", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    const mockMessages = [
      { id: 1, message: "Hello!", username: "panchaya" },
      { id: 2, message: "Hi!", username: "piraya" },
    ];
    mockGetMessagesByRoom.mockResolvedValue(mockMessages);

    // Act
    await getMessages(req, res);

    // Assert
    expect(mockGetMessagesByRoom).toHaveBeenCalledWith("10");
    expect(res.json).toHaveBeenCalledWith({ messages: mockMessages });
  });

  test("should return empty array when room has no messages", async () => {
    // Arrange
    const req = { params: { roomId: "99" } };
    const res = mockRes();
    mockGetMessagesByRoom.mockResolvedValue([]);

    // Act
    await getMessages(req, res);

    // Assert
    expect(res.json).toHaveBeenCalledWith({ messages: [] });
  });

  test("should return 500 on service error", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetMessagesByRoom.mockRejectedValue(new Error("DB failed"));

    // Act
    await getMessages(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch messages",
    });
  });
});

// ──────────────────────────────────────────────────────────────
// deleteMessages
// ──────────────────────────────────────────────────────────────
describe("deleteMessages", () => {
  test("should delete messages and return success", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockDeleteMessagesByRoom.mockResolvedValue(undefined);

    // Act
    await deleteMessages(req, res);

    // Assert
    expect(mockDeleteMessagesByRoom).toHaveBeenCalledWith("10");
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test("should return 500 on service error", async () => {
    // Arrange
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockDeleteMessagesByRoom.mockRejectedValue(new Error("Delete failed"));

    // Act
    await deleteMessages(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to delete messages",
    });
  });
});
