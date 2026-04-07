import { jest } from "@jest/globals";

const mockGetMessagesByRoom = jest.fn();
const mockDeleteMessagesByRoom = jest.fn();

await jest.unstable_mockModule(
  "../../../src/services/message.service.js",
  () => ({
    getMessagesByRoom: mockGetMessagesByRoom,
    deleteMessagesByRoom: mockDeleteMessagesByRoom,
  }),
);

const { getMessages, deleteMessages } =
  await import("../../../src/controllers/message.controller.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

afterEach(() => jest.clearAllMocks());

describe("getMessages", () => {
  test("should return messages for a room", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    const mockMessages = [
      { id: 1, message: "Hello!", username: "panchaya" },
      { id: 2, message: "Hi!", username: "piraya" },
    ];
    mockGetMessagesByRoom.mockResolvedValue(mockMessages);

    await getMessages(req, res);

    expect(mockGetMessagesByRoom).toHaveBeenCalledWith("10");
    expect(res.json).toHaveBeenCalledWith({ messages: mockMessages });
  });

  test("should return empty array when room has no messages", async () => {
    const req = { params: { roomId: "99" } };
    const res = mockRes();
    mockGetMessagesByRoom.mockResolvedValue([]);

    await getMessages(req, res);

    expect(res.json).toHaveBeenCalledWith({ messages: [] });
  });

  test("should return 500 on service error", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetMessagesByRoom.mockRejectedValue(new Error("DB failed"));

    await getMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to fetch messages",
    });
  });
});

describe("deleteMessages", () => {
  test("should delete messages and return success", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockDeleteMessagesByRoom.mockResolvedValue(undefined);

    await deleteMessages(req, res);

    expect(mockDeleteMessagesByRoom).toHaveBeenCalledWith("10");
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test("should return 500 on service error", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockDeleteMessagesByRoom.mockRejectedValue(new Error("Delete failed"));

    await deleteMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to delete messages",
    });
  });
});
