import express from "express";
import {
  startSession,
  endSession,
  getLiveSession,
  getSessionsByRoom,
  checkRoomActive,
} from "../controllers/session.controller.js";

const router = express.Router();

router.post("/start", startSession);
router.post("/end/:sessionId", endSession);
router.get("/live/:roomId", getLiveSession);
router.get("/room/:roomId", getSessionsByRoom);
router.get("/check/:roomId", checkRoomActive);

export default router;
