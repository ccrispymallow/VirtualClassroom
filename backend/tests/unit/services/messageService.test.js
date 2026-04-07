import { jest } from "@jest/globals";

const mockQuery = jest.fn();

await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

const { saveMessage, getMessagesByRoom, deleteMessagesByRoom } =
  await import("../../../src/services/message.service.js");

afterEach(() => jest.clearAllMocks());

describe("saveMessage", () => {
  test("should insert message and return the saved row", async () => {
    const msgData = { room_id: "10", user_id: "1", message: "Hello class!" };
    const mockRow = { id: 1, ...msgData };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await saveMessage(msgData);

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "10",
      "1",
      "Hello class!",
    ]);
    expect(result).toEqual(mockRow);
  });
});

describe("getMessagesByRoom", () => {
  test("should return messages with username joined", async () => {
    const mockRows = [
      { id: 1, message: "Hi!", username: "panchaya" },
      { id: 2, message: "Hey!", username: "piraya" },
    ];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getMessagesByRoom("10");

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["10"]);
    expect(result).toEqual(mockRows);
  });

  test("should return empty array when no messages exist", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getMessagesByRoom("99");

    expect(result).toEqual([]);
  });
});

describe("deleteMessagesByRoom", () => {
  test("should call DELETE query for the room", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await deleteMessagesByRoom("10");

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["10"]);
  });
});
