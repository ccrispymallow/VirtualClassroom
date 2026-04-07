import { jest } from "@jest/globals";

const mockQuery = jest.fn();

await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

const {
  createClassroom,
  getAllClassrooms,
  getClassroomById,
  joinClassroom,
  getParticipants,
  endClassroom,
  deleteClassroom,
  getClassroomsByUserId,
  getJoinedClassroomsByUserId,
  leaveClassroom,
} = await import("../../../src/services/classroom.service.js");

afterEach(() => jest.clearAllMocks());

describe("createClassroom", () => {
  test("should insert classroom with default capacity 5 and return row", async () => {
    const mockRow = {
      id: 10,
      room_name: "CS101",
      room_code: "ABC",
      capacity: 5,
      creator_id: 1,
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    const result = await createClassroom({
      room_name: "CS101",
      room_code: "ABC",
      room_password: null,
      capacity: null,
      creator_id: 1,
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [
      "CS101",
      "ABC",
      null,
      5,
      1,
    ]);
    expect(result).toEqual(mockRow);
  });
});

describe("getAllClassrooms", () => {
  test("should return all classrooms", async () => {
    const mockRows = [{ id: 1 }, { id: 2 }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    const result = await getAllClassrooms();

    expect(result).toEqual(mockRows);
  });
});

describe("getClassroomById", () => {
  test("should return classroom when found", async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 10, room_name: "CS101" }] });

    const result = await getClassroomById(10);

    expect(result).toEqual({ id: 10, room_name: "CS101" });
  });

  test("should return undefined when not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await getClassroomById(999);

    expect(result).toBeUndefined();
  });
});

describe("joinClassroom", () => {
  test("should return null when classroom not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await joinClassroom({
      room_code: "XXXXX",
      room_password: null,
      user_id: 2,
    });

    expect(result).toBeNull();
  });

  test("should throw error on wrong password", async () => {
    const mockClassroom = {
      id: 10,
      room_code: "ABC",
      room_password: "correct",
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockClassroom] });

    await expect(
      joinClassroom({ room_code: "ABC", room_password: "wrong", user_id: 2 }),
    ).rejects.toThrow("Wrong password");
  });

  test("should add participant and return classroom when joining fresh", async () => {
    const mockClassroom = { id: 10, room_code: "ABC", room_password: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await joinClassroom({
      room_code: "ABC",
      room_password: null,
      user_id: 2,
    });

    expect(result).toEqual(mockClassroom);
  });

  test("should skip inserting participant if already joined", async () => {
    const mockClassroom = { id: 10, room_code: "ABC", room_password: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] })
      .mockResolvedValueOnce({ rows: [{ room_id: 10, user_id: 2 }] });

    const result = await joinClassroom({
      room_code: "ABC",
      room_password: null,
      user_id: 2,
    });

    expect(result).toEqual(mockClassroom);
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });
});

describe("endClassroom", () => {
  test("should end session and return classroom when creator calls end", async () => {
    const mockClassroom = { id: 10, room_code: "ABC", creator_id: 1 };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await endClassroom("ABC", 1);

    expect(result).toEqual(mockClassroom);
  });

  test("should throw when classroom not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(endClassroom("XXXXX", 1)).rejects.toThrow(
      "Classroom not found",
    );
  });

  test("should throw when non-creator tries to end", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, creator_id: 1 }] });

    await expect(endClassroom("ABC", 99)).rejects.toThrow(
      "Only the room creator can end the room",
    );
  });
});

describe("deleteClassroom", () => {
  test("should remove participants, end session, and delete classroom", async () => {
    const mockDeleted = { id: 10, room_name: "CS101" };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 10, creator_id: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockDeleted] });

    const result = await deleteClassroom(10, 1);

    expect(result).toEqual(mockDeleted);
  });

  test("should throw when classroom not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(deleteClassroom(999, 1)).rejects.toThrow(
      "Classroom not found",
    );
  });

  test("should throw when non-creator tries to delete", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, creator_id: 1 }] });
    await expect(deleteClassroom(10, 99)).rejects.toThrow(
      "Only the room creator can delete the classroom",
    );
  });
});

describe("leaveClassroom", () => {
  test("should return participant record on successful leave", async () => {
    const mockRecord = { room_id: 10, user_id: 5 };
    mockQuery.mockResolvedValue({ rows: [mockRecord] });

    const result = await leaveClassroom(10, 5);

    expect(result).toEqual(mockRecord);
  });

  test("should return null when participant not found", async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await leaveClassroom(10, 999);

    expect(result).toBeNull();
  });
});
