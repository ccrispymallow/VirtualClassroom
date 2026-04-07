import { jest } from "@jest/globals";

const mockEndAllLiveSessions = jest.fn();
const mockCreateSession = jest.fn();
const mockEndSession = jest.fn();
const mockGetLiveSession = jest.fn();
const mockGetSessionsByRoom = jest.fn();
const mockIsRoomActive = jest.fn();
const mockGetRoomsCreatedByInstructor = jest.fn();
const mockGetRoomsJoinedByStudent = jest.fn();

await jest.unstable_mockModule(
  "../../../src/services/session.service.js",
  () => ({
    endAllLiveSessionsForRoom: mockEndAllLiveSessions,
    createSession: mockCreateSession,
    endSession: mockEndSession,
    getLiveSession: mockGetLiveSession,
    getSessionsByRoom: mockGetSessionsByRoom,
    isRoomActive: mockIsRoomActive,
    getRoomsCreatedByInstructor: mockGetRoomsCreatedByInstructor,
    getRoomsJoinedByStudent: mockGetRoomsJoinedByStudent,
  }),
);

const {
  startSession,
  endSession,
  getLiveSession,
  getSessionsByRoom,
  checkRoomActive,
  getMyRooms,
} = await import("../../../src/controllers/session.controller.js");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

afterEach(() => jest.clearAllMocks());

describe("startSession", () => {
  test("should end previous sessions and create a new session", async () => {
    const req = { body: { room_id: "10" } };
    const res = mockRes();
    const mockSession = { id: 5, room_id: "10", status: "live" };
    mockEndAllLiveSessions.mockResolvedValue([]);
    mockCreateSession.mockResolvedValue(mockSession);

    await startSession(req, res);

    expect(mockEndAllLiveSessions).toHaveBeenCalledWith("10");
    expect(mockCreateSession).toHaveBeenCalledWith({ room_id: "10" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ session: mockSession });
  });

  test("should return 400 when room_id is missing", async () => {
    const req = { body: {} };
    const res = mockRes();

    await startSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "room_id is required" });
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  test("should return 500 on service error", async () => {
    const req = { body: { room_id: "10" } };
    const res = mockRes();
    mockEndAllLiveSessions.mockRejectedValue(new Error("DB error"));

    await startSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to start session" });
  });
});

describe("endSession", () => {
  test("should end session and return it", async () => {
    const req = { params: { sessionId: "5" } };
    const res = mockRes();
    const mockSession = { id: 5, status: "ended" };
    mockEndSession.mockResolvedValue(mockSession);

    await endSession(req, res);

    expect(mockEndSession).toHaveBeenCalledWith("5");
    expect(res.json).toHaveBeenCalledWith({ session: mockSession });
  });

  test("should return 404 when session not found", async () => {
    const req = { params: { sessionId: "999" } };
    const res = mockRes();
    mockEndSession.mockResolvedValue(null);

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Session not found" });
  });

  test("should return 500 on service error", async () => {
    const req = { params: { sessionId: "5" } };
    const res = mockRes();
    mockEndSession.mockRejectedValue(new Error("DB error"));

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to end session" });
  });
});

describe("getLiveSession", () => {
  test("should return session and active:true when live", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    const mockSession = { id: 5, status: "live" };
    mockGetLiveSession.mockResolvedValue(mockSession);

    await getLiveSession(req, res);

    expect(res.json).toHaveBeenCalledWith({
      session: mockSession,
      active: true,
    });
  });

  test("should return session:null and active:false when no live session", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetLiveSession.mockResolvedValue(null);

    await getLiveSession(req, res);

    expect(res.json).toHaveBeenCalledWith({ session: null, active: false });
  });

  test("should return 500 on service error", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockGetLiveSession.mockRejectedValue(new Error("DB error"));

    await getLiveSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch session" });
  });
});

describe("getSessionsByRoom", () => {
  test("should return all sessions for a room", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    const mockSessions = [{ id: 5 }, { id: 6 }];
    mockGetSessionsByRoom.mockResolvedValue(mockSessions);

    await getSessionsByRoom(req, res);

    expect(res.json).toHaveBeenCalledWith({ sessions: mockSessions });
  });
});

describe("checkRoomActive", () => {
  test("should return active:true when room is live", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockIsRoomActive.mockResolvedValue(true);

    await checkRoomActive(req, res);

    expect(res.json).toHaveBeenCalledWith({ active: true });
  });

  test("should return active:false when room is not live", async () => {
    const req = { params: { roomId: "10" } };
    const res = mockRes();
    mockIsRoomActive.mockResolvedValue(false);

    await checkRoomActive(req, res);

    expect(res.json).toHaveBeenCalledWith({ active: false });
  });
});

describe("getMyRooms", () => {
  test("should return instructor rooms when role is prof", async () => {
    const req = { params: { userId: "1" }, query: { role: "prof" } };
    const res = mockRes();
    const mockRooms = [{ id: 10, room_name: "CS101" }];
    mockGetRoomsCreatedByInstructor.mockResolvedValue(mockRooms);

    await getMyRooms(req, res);

    expect(mockGetRoomsCreatedByInstructor).toHaveBeenCalledWith("1");
    expect(res.json).toHaveBeenCalledWith({ rooms: mockRooms });
  });

  test("should return joined rooms when role is student", async () => {
    const req = { params: { userId: "2" }, query: { role: "student" } };
    const res = mockRes();
    const mockRooms = [{ id: 10, room_name: "CS101" }];
    mockGetRoomsJoinedByStudent.mockResolvedValue(mockRooms);

    await getMyRooms(req, res);

    expect(mockGetRoomsJoinedByStudent).toHaveBeenCalledWith("2");
    expect(res.json).toHaveBeenCalledWith({ rooms: mockRooms });
  });

  test("should return 500 on service error", async () => {
    const req = { params: { userId: "1" }, query: { role: "prof" } };
    const res = mockRes();
    mockGetRoomsCreatedByInstructor.mockRejectedValue(new Error("DB error"));

    await getMyRooms(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch rooms" });
  });
});
