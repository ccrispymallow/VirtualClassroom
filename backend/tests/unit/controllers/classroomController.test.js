import { jest } from "@jest/globals";

const mockCreateClassroom = jest.fn();
const mockGetAllClassrooms = jest.fn();
const mockGetClassroomById = jest.fn();
const mockJoinClassroom = jest.fn();
const mockGetParticipants = jest.fn();
const mockEndClassroom = jest.fn();
const mockDeleteClassroom = jest.fn();
const mockGetClassroomsByUserId = jest.fn();
const mockGetJoinedClassrooms = jest.fn();
const mockLeaveClassroom = jest.fn();

await jest.unstable_mockModule(
  "../../../src/services/classroom.service.js",
  () => ({
    createClassroom: mockCreateClassroom,
    getAllClassrooms: mockGetAllClassrooms,
    getClassroomById: mockGetClassroomById,
    joinClassroom: mockJoinClassroom,
    getParticipants: mockGetParticipants,
    endClassroom: mockEndClassroom,
    deleteClassroom: mockDeleteClassroom,
    getClassroomsByUserId: mockGetClassroomsByUserId,
    getJoinedClassroomsByUserId: mockGetJoinedClassrooms,
    leaveClassroom: mockLeaveClassroom,
  }),
);

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
} = await import("../../../src/controllers/classroom.controller.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

afterEach(() => jest.clearAllMocks());

describe("createClassroom", () => {
  test("1. should return 201 with classroom on valid input", async () => {
    const req = {
      body: {
        room_name: "CS101",
        room_code: "ABC123",
        room_password: "secret",
        capacity: 30,
        creator_id: 1,
      },
    };
    const res = mockRes();
    mockCreateClassroom.mockResolvedValue({ id: 10, room_name: "CS101" });
    await createClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Classroom created successfully",
      classroom: { id: 10, room_name: "CS101" },
    });
  });
  test("2. should return 400 when required fields are missing", async () => {
    const req = { body: { room_name: "CS101" } };
    const res = mockRes();
    await createClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreateClassroom).not.toHaveBeenCalled();
  });
  test("3. should call next(error) when service throws", async () => {
    const req = {
      body: { room_name: "CS101", room_code: "ABC", creator_id: 1 },
    };
    const res = mockRes();
    mockCreateClassroom.mockRejectedValue(new Error("DB error"));
    await createClassroom(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getAllClassrooms", () => {
  test("1. should return all classrooms", async () => {
    const req = {};
    const res = mockRes();
    mockGetAllClassrooms.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    await getAllClassrooms(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });
  test("2. should call next(error) when service throws", async () => {
    const req = {};
    const res = mockRes();
    mockGetAllClassrooms.mockRejectedValue(new Error("DB error"));
    await getAllClassrooms(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getClassroomById", () => {
  test("1. should return classroom when found", async () => {
    const req = { params: { id: "10" } };
    const res = mockRes();
    mockGetClassroomById.mockResolvedValue({ id: 10, room_name: "CS101" });
    await getClassroomById(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ id: 10, room_name: "CS101" });
  });
  test("2. should return 404 when classroom not found", async () => {
    const req = { params: { id: "999" } };
    const res = mockRes();
    mockGetClassroomById.mockResolvedValue(null);
    await getClassroomById(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  test("3. should call next(error) when service throws", async () => {
    const req = { params: { id: "10" } };
    const res = mockRes();
    mockGetClassroomById.mockRejectedValue(new Error("DB error"));
    await getClassroomById(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("joinClassroom", () => {
  test("1. should return classroom on successful join", async () => {
    const req = {
      body: { room_code: "ABC123", room_password: "secret", user_id: 5 },
    };
    const res = mockRes();
    mockJoinClassroom.mockResolvedValue({ id: 10, room_name: "CS101" });
    await joinClassroom(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({
      message: "Joined classroom successfully",
      classroom: { id: 10, room_name: "CS101" },
    });
  });
  test("2. should return 400 when room_code or user_id is missing", async () => {
    const req = { body: { room_code: "ABC123" } };
    const res = mockRes();
    await joinClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test("3. should return 404 when classroom not found", async () => {
    const req = { body: { room_code: "XXXXX", user_id: 5 } };
    const res = mockRes();
    mockJoinClassroom.mockResolvedValue(null);
    await joinClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });
  test("4. should call next(error) when service throws", async () => {
    const req = { body: { room_code: "ABC123", user_id: 5 } };
    const res = mockRes();
    mockJoinClassroom.mockRejectedValue(new Error("Wrong password"));
    await joinClassroom(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getParticipants", () => {
  test("1. should return participants with total count", async () => {
    const req = { params: { room_id: "10" } };
    const res = mockRes();
    mockGetParticipants.mockResolvedValue([{ user_id: 1 }, { user_id: 2 }]);
    await getParticipants(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({
      room_id: "10",
      total: 2,
      participants: [{ user_id: 1 }, { user_id: 2 }],
    });
  });
  test("2. should call next(error) when service throws", async () => {
    const req = { params: { room_id: "10" } };
    const res = mockRes();
    mockGetParticipants.mockRejectedValue(new Error("DB error"));
    await getParticipants(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("endClassroom", () => {
  test("1. should end classroom successfully", async () => {
    const req = { body: { room_code: "ABC123", user_id: 1 } };
    const res = mockRes();
    mockEndClassroom.mockResolvedValue({ id: 10, room_name: "CS101" });
    await endClassroom(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({
      message: "Classroom ended successfully",
      classroom: { id: 10, room_name: "CS101" },
    });
  });
  test("2. should return 400 when room_code or user_id is missing", async () => {
    const req = { body: { room_code: "ABC123" } };
    const res = mockRes();
    await endClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test("3. should call next(error) when service throws", async () => {
    const req = { body: { room_code: "ABC123", user_id: 99 } };
    const res = mockRes();
    mockEndClassroom.mockRejectedValue(
      new Error("Only the room creator can end the room"),
    );
    await endClassroom(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("deleteClassroom", () => {
  test("1. should delete classroom successfully", async () => {
    const req = { body: { id: "10", user_id: 1 } };
    const res = mockRes();
    mockDeleteClassroom.mockResolvedValue({ id: 10, room_name: "CS101" });
    await deleteClassroom(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({
      message: "Classroom deleted successfully",
      classroom: { id: 10, room_name: "CS101" },
    });
  });
  test("2. should return 400 when id or user_id is missing", async () => {
    const req = { body: { id: "10" } };
    const res = mockRes();
    await deleteClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test("3. should call next(error) when service throws", async () => {
    const req = { body: { id: "10", user_id: 99 } };
    const res = mockRes();
    mockDeleteClassroom.mockRejectedValue(
      new Error("Only the room creator can delete the classroom"),
    );
    await deleteClassroom(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});

describe("getClassroomsByUserId", () => {
  test("1. should call getClassroomsByUserId for instructor role", async () => {
    const req = { params: { user_id: "1" }, query: { role: "instructor" } };
    const res = mockRes();
    mockGetClassroomsByUserId.mockResolvedValue([{ id: 10 }]);
    await getClassroomsByUserId(req, res, mockNext);
    expect(mockGetClassroomsByUserId).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith({ rooms: [{ id: 10 }] });
  });
  test("2. should call getClassroomsByUserId for prof role", async () => {
    const req = { params: { user_id: "1" }, query: { role: "prof" } };
    const res = mockRes();
    mockGetClassroomsByUserId.mockResolvedValue([{ id: 10 }]);
    await getClassroomsByUserId(req, res, mockNext);
    expect(mockGetClassroomsByUserId).toHaveBeenCalledWith("1");
  });
  test("3. should call getJoinedClassroomsByUserId for student role", async () => {
    const req = { params: { user_id: "2" }, query: { role: "student" } };
    const res = mockRes();
    mockGetJoinedClassrooms.mockResolvedValue([{ id: 10 }]);
    await getClassroomsByUserId(req, res, mockNext);
    expect(mockGetJoinedClassrooms).toHaveBeenCalledWith("2");
  });
  test("4. should return 400 when user_id is missing", async () => {
    const req = { params: {}, query: { role: "student" } };
    const res = mockRes();
    await getClassroomsByUserId(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("getJoinedClassroomsByUserId", () => {
  test("1. should return joined classrooms for user", async () => {
    const req = { params: { user_id: "2" } };
    const res = mockRes();
    mockGetJoinedClassrooms.mockResolvedValue([{ id: 10 }]);
    await getJoinedClassroomsByUserId(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ rooms: [{ id: 10 }] });
  });
  test("2. should return 400 when user_id is missing", async () => {
    const req = { params: {} };
    const res = mockRes();
    await getJoinedClassroomsByUserId(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("leaveClassroom", () => {
  test("1. should leave classroom successfully", async () => {
    const req = { params: { room_id: "10" }, body: { user_id: 5 } };
    const res = mockRes();
    mockLeaveClassroom.mockResolvedValue({ room_id: 10, user_id: 5 });
    await leaveClassroom(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({
      message: "Left classroom successfully",
      record: { room_id: 10, user_id: 5 },
    });
  });
  test("2. should return 400 when room_id or user_id is missing", async () => {
    const req = { params: { room_id: "10" }, body: {} };
    const res = mockRes();
    await leaveClassroom(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  test("3. should call next(error) when service throws", async () => {
    const req = { params: { room_id: "10" }, body: { user_id: 5 } };
    const res = mockRes();
    mockLeaveClassroom.mockRejectedValue(new Error("DB error"));
    await leaveClassroom(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
