import express from "express";
import {
  getMessages,
  deleteMessages,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/:roomId", getMessages);
router.delete("/:roomId", deleteMessages);

export default router;
