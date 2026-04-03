import * as messageService from "../services/message.service.js";

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await messageService.getMessagesByRoom(roomId);
    return res.json({ messages });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};
