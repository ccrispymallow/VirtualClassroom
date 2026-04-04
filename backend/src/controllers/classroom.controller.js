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

export const endClassroom = async (req, res, next) => {
  try {
    const { room_code } = req.body;
    const user_id = req.body.user_id;

    if (!room_code || !user_id) {
      return res.status(400).json({
        error: "room_code and user_id are required",
      });
    }

    const classroom = await classroomService.endClassroom(room_code, user_id);

    res.json({
      message: "Classroom ended successfully",
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
export const deleteClassroom = async (req, res, next) => {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({ error: "id and user_id are required" });
    }

    const deleted = await classroomService.deleteClassroom(id, user_id);
    res.json({ message: "Classroom deleted successfully", classroom: deleted });
  } catch (error) {
    next(error);
  }
};

// GET classrooms by user id
export const getClassroomsByUserId = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { role } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const rooms =
      role === "instructor" || role === "prof"
        ? await classroomService.getClassroomsByUserId(user_id)
        : await classroomService.getJoinedClassroomsByUserId(user_id);

    res.json({ rooms });
  } catch (error) {
    next(error);
  }
};

export const getJoinedClassroomsByUserId = async (req, res, next) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const rooms = await classroomService.getJoinedClassroomsByUserId(user_id);
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
};

export const leaveClassroom = async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const { room_id } = req.params;

    if (!room_id || !user_id) {
      return res
        .status(400)
        .json({ error: "room_id and user_id are required" });
    }

    const record = await classroomService.leaveClassroom(room_id, user_id);
    res.json({ message: "Left classroom successfully", record });
  } catch (error) {
    next(error);
  }
};
