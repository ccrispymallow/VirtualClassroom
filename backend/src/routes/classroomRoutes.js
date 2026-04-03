import express from "express";
import {
  createClassroom,
  getAllClassrooms,
  getClassroomById,
  getParticipants,
  deleteClassroom,
  getClassroomsByUserId,
  getJoinedClassroomsByUserId,
  joinClassroom,
  endClassroom,
} from "../controllers/classroom.controller.js";

const router = express.Router();

router.post("/", createClassroom);
router.get("/", getAllClassrooms);
router.post("/join", joinClassroom);
router.patch("/end", endClassroom);
router.get("/:id", getClassroomById);
router.get("/:id/participants", getParticipants);
router.get("/user/:user_id/joined", getJoinedClassroomsByUserId);
router.get("/user/:user_id", getClassroomsByUserId);
router.delete("/:id", deleteClassroom);

export default router;
