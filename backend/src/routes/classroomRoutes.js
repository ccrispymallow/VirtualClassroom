// src/routes/classroomRoutes.js
import express from "express";
import {
  createClassroom,
  getAllClassrooms,
  getClassroomById,
  joinClassroom,
} from "../controllers/classroom.controller.js";

const router = express.Router();

router.post("/createClassroom", createClassroom);
router.get("/getAllClassrooms", getAllClassrooms);
router.get("/:id", getClassroomById);
router.post("/join", joinClassroom);

export default router;
