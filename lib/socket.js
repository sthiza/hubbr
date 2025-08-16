// lib/socket.js
import { io } from "socket.io-client";

// 👑 Connect to your local backend IP
const socket = io("http://192.168.1.96:4000", {
  transports: ["websocket"], // Ensure stable connection
});

export default socket;
