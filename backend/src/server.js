import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "Backend is running",
      time: result.rows[0],
      api: "http://localhost:5001/api",
    });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
