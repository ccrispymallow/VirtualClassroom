// src/controllers/classroom.controller.js
import * as classroomService from "../services/classroom.service.js";

// CREATE
export const createClassroom = async (req, res, next) => {
  try {
    const { room_name, room_code, room_password, capacity, creator_id } =
      req.body;

    if (!room_name || !room_code || !creator_id) {
      return res.status(400).json({
        error: "room_name, room_code and creator_id are required",
      });
    }

    const classroom = await classroomService.createClassroom({
      room_name,
      room_code,
      room_password,
      capacity,
      creator_id,
    });

    res.status(201).json({
      message: "Classroom created successfully",
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL
export const getAllClassrooms = async (req, res, next) => {
  try {
    const classrooms = await classroomService.getAllClassrooms();
    res.json(classrooms);
  } catch (error) {
    next(error);
  }
};

// GET BY ID
export const getClassroomById = async (req, res, next) => {
  try {
    const classroom = await classroomService.getClassroomById(req.params.id);

    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found" });
    }

    res.json(classroom);
  } catch (error) {
    next(error);
  }
};

// JOIN
export const joinClassroom = async (req, res, next) => {
  try {
    const { room_code, room_password, user_id } = req.body;

    if (!room_code || !user_id) {
      return res.status(400).json({
        error: "room_code and user_id are required",
      });
    }

    const classroom = await classroomService.joinClassroom({
      room_code,
      room_password,
      user_id,
    });

    if (!classroom) {
      return res.status(404).json({
        error: "Classroom not found",
      });
    }

    res.json({
      message: "Joined classroom successfully",
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

export const getParticipants = async (req, res, next) => {
  try {
    const { room_id } = req.params;

    if (!room_id) {
      return res.status(400).json({
        error: "room_id is required",
      });
    }

    const participants = await classroomService.getParticipants(room_id);

    res.json({
      room_id,
      total: participants.length,
      participants,
    });
  } catch (error) {
    next(error);
  }
};
