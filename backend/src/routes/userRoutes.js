import express from "express";
import {
  registerUser,
  loginUser,
  getUserById,
  getAllUsers,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/getAllUsers", getAllUsers);
router.post("/loginUser", loginUser);
router.get("/:id", getUserById);

export default router;
