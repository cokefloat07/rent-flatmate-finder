import { io } from "socket.io-client";
import { SOCKET_URL } from "../config/api";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export default socket;