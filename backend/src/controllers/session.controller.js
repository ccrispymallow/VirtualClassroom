import * as sessionService from "../services/session.service.js";

// POST
export const startSession = async (req, res) => {
  try {
    const { room_id } = req.body;
    if (!room_id) return res.status(400).json({ error: "room_id is required" });

    await sessionService.endAllLiveSessionsForRoom(room_id);

    const session = await sessionService.createSession({ room_id });
    return res.status(201).json({ session });
  } catch (err) {
    console.error("startSession error:", err);
    return res.status(500).json({ error: "Failed to start session" });
  }
};

// POST
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionService.endSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json({ session });
  } catch (err) {
    console.error("endSession error:", err);
    return res.status(500).json({ error: "Failed to end session" });
  }
};

// GET live session
export const getLiveSession = async (req, res) => {
  try {
    const { roomId } = req.params;
    const session = await sessionService.getLiveSession(roomId);
    return res.json({ session: session || null, active: !!session });
  } catch (err) {
    console.error("getLiveSession error:", err);
    return res.status(500).json({ error: "Failed to fetch session" });
  }
};

// GET room session
export const getSessionsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const sessions = await sessionService.getSessionsByRoom(roomId);
    return res.json({ sessions });
  } catch (err) {
    console.error("getSessionsByRoom error:", err);
    return res.status(500).json({ error: "Failed to fetch sessions" });
  }
};

// GET room status
export const checkRoomActive = async (req, res) => {
  try {
    const { roomId } = req.params;
    const active = await sessionService.isRoomActive(roomId);
    return res.json({ active });
  } catch (err) {
    console.error("checkRoomActive error:", err);
    return res.status(500).json({ error: "Failed to check room status" });
  }
};

export const getMyRooms = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.query;

    if (role === "prof" || role === "instructor") {
      const rooms = await sessionService.getRoomsCreatedByInstructor(userId);
      return res.json({ rooms });
    } else {
      const rooms = await sessionService.getRoomsJoinedByStudent(userId);
      return res.json({ rooms });
    }
  } catch (err) {
    console.error("getMyRooms error:", err);
    return res.status(500).json({ error: "Failed to fetch rooms" });
  }
};
