// src/routes/classroomRoutes.js
import express from "express";
import {
  createClassroom,
  getAllClassrooms,
  getClassroomById,
  getParticipants,
  joinClassroom,
  endClassroom,
} from "../controllers/classroom.controller.js";

const router = express.Router();

router.post("/createClassroom", createClassroom);
router.get("/getAllClassrooms", getAllClassrooms);
router.get("/:id/participants", getParticipants);
router.get("/:id", getClassroomById);
router.post("/join", joinClassroom);
router.post("/end", endClassroom);

export default router;
