import { jest } from "@jest/globals";

// ─── 1. Define mock ────────────────────────────────────────────
const mockQuery = jest.fn();

// ─── 2. Register mock BEFORE importing anything ────────────────
await jest.unstable_mockModule("../../../src/config/database.js", () => ({
  pool: { query: mockQuery },
}));

// ─── 3. Dynamic import AFTER mocking ───────────────────────────
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

// ──────────────────────────────────────────────────────────────
// createClassroom
// ──────────────────────────────────────────────────────────────
describe("createClassroom", () => {
  test("should insert classroom with default capacity 5 and return row", async () => {
    // Arrange
    const mockRow = {
      id: 10,
      room_name: "CS101",
      room_code: "ABC",
      capacity: 5,
      creator_id: 1,
    };
    mockQuery.mockResolvedValue({ rows: [mockRow] });

    // Act
    const result = await createClassroom({
      room_name: "CS101",
      room_code: "ABC",
      room_password: null,
      capacity: null,
      creator_id: 1,
    });

    // Assert
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

// ──────────────────────────────────────────────────────────────
// getAllClassrooms
// ──────────────────────────────────────────────────────────────
describe("getAllClassrooms", () => {
  test("should return all classrooms", async () => {
    // Arrange
    const mockRows = [{ id: 1 }, { id: 2 }];
    mockQuery.mockResolvedValue({ rows: mockRows });

    // Act
    const result = await getAllClassrooms();

    // Assert
    expect(result).toEqual(mockRows);
  });
});

// ──────────────────────────────────────────────────────────────
// getClassroomById
// ──────────────────────────────────────────────────────────────
describe("getClassroomById", () => {
  test("should return classroom when found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [{ id: 10, room_name: "CS101" }] });

    // Act
    const result = await getClassroomById(10);

    // Assert
    expect(result).toEqual({ id: 10, room_name: "CS101" });
  });

  test("should return undefined when not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await getClassroomById(999);

    // Assert
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// joinClassroom
// ──────────────────────────────────────────────────────────────
describe("joinClassroom", () => {
  test("should return null when classroom not found", async () => {
    // Arrange
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no classroom

    // Act
    const result = await joinClassroom({
      room_code: "XXXXX",
      room_password: null,
      user_id: 2,
    });

    // Assert
    expect(result).toBeNull();
  });

  test("should throw error on wrong password", async () => {
    // Arrange
    const mockClassroom = {
      id: 10,
      room_code: "ABC",
      room_password: "correct",
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockClassroom] });

    // Act & Assert
    await expect(
      joinClassroom({ room_code: "ABC", room_password: "wrong", user_id: 2 }),
    ).rejects.toThrow("Wrong password");
  });

  test("should add participant and return classroom when joining fresh", async () => {
    // Arrange
    const mockClassroom = { id: 10, room_code: "ABC", room_password: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] }) // find classroom
      .mockResolvedValueOnce({ rows: [] }) // no active session
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // insert session
      .mockResolvedValueOnce({ rows: [] }) // participant not found
      .mockResolvedValueOnce({ rows: [] }); // insert participant

    // Act
    const result = await joinClassroom({
      room_code: "ABC",
      room_password: null,
      user_id: 2,
    });

    // Assert
    expect(result).toEqual(mockClassroom);
  });

  test("should skip inserting participant if already joined", async () => {
    // Arrange
    const mockClassroom = { id: 10, room_code: "ABC", room_password: null };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] }) // find classroom
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // active session exists
      .mockResolvedValueOnce({ rows: [{ room_id: 10, user_id: 2 }] }); // participant exists

    // Act
    const result = await joinClassroom({
      room_code: "ABC",
      room_password: null,
      user_id: 2,
    });

    // Assert
    expect(result).toEqual(mockClassroom);
    expect(mockQuery).toHaveBeenCalledTimes(3); // no extra INSERT
  });
});

// ──────────────────────────────────────────────────────────────
// endClassroom
// ──────────────────────────────────────────────────────────────
describe("endClassroom", () => {
  test("should end session and return classroom when creator calls end", async () => {
    // Arrange
    const mockClassroom = { id: 10, room_code: "ABC", creator_id: 1 };
    mockQuery
      .mockResolvedValueOnce({ rows: [mockClassroom] }) // find classroom
      .mockResolvedValueOnce({ rows: [] }); // end session

    // Act
    const result = await endClassroom("ABC", 1);

    // Assert
    expect(result).toEqual(mockClassroom);
  });

  test("should throw when classroom not found", async () => {
    // Arrange
    mockQuery.mockResolvedValueOnce({ rows: [] });

    // Act & Assert
    await expect(endClassroom("XXXXX", 1)).rejects.toThrow(
      "Classroom not found",
    );
  });

  test("should throw when non-creator tries to end", async () => {
    // Arrange
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, creator_id: 1 }] });

    // Act & Assert
    await expect(endClassroom("ABC", 99)).rejects.toThrow(
      "Only the room creator can end the room",
    );
  });
});

// ──────────────────────────────────────────────────────────────
// deleteClassroom
// ──────────────────────────────────────────────────────────────
describe("deleteClassroom", () => {
  test("should remove participants, end session, and delete classroom", async () => {
    // Arrange
    const mockDeleted = { id: 10, room_name: "CS101" };
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 10, creator_id: 1 }] }) // find
      .mockResolvedValueOnce({ rows: [] }) // delete participants
      .mockResolvedValueOnce({ rows: [] }) // end sessions
      .mockResolvedValueOnce({ rows: [mockDeleted] }); // delete classroom

    // Act
    const result = await deleteClassroom(10, 1);

    // Assert
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

// ──────────────────────────────────────────────────────────────
// leaveClassroom
// ──────────────────────────────────────────────────────────────
describe("leaveClassroom", () => {
  test("should return participant record on successful leave", async () => {
    // Arrange
    const mockRecord = { room_id: 10, user_id: 5 };
    mockQuery.mockResolvedValue({ rows: [mockRecord] });

    // Act
    const result = await leaveClassroom(10, 5);

    // Assert
    expect(result).toEqual(mockRecord);
  });

  test("should return null when participant not found", async () => {
    // Arrange
    mockQuery.mockResolvedValue({ rows: [] });

    // Act
    const result = await leaveClassroom(10, 999);

    // Assert
    expect(result).toBeNull();
  });
});
