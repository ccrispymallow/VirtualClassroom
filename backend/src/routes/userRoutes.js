import express from "express";
import {
  registerUser,
  loginUser,
  updateUser,
  getUserById,
  getAllUsers,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.get("/getAllUsers", getAllUsers);
router.post("/loginUser", loginUser);
router.put("/users/:id", updateUser);
router.get("/:id", getUserById);

export default router;
