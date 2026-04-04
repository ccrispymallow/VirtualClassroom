// import { io } from "socket.io-client";

// export const socket = io(
//   import.meta.env.VITE_BACKEND_URL || "http://localhost:5001",
// );

const BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5001"
).replace("/api", "");

export const socket = io(BASE_URL);
