import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  const url = SOCKET_URL ? `${SOCKET_URL}/trello` : "/trello";
  socket = io(url, {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => console.log("Socket connected:", socket.id));
  socket.on("disconnect", (reason) => console.log("Socket disconnected:", reason));
  socket.on("connect_error", (err) => console.error("Socket error:", err.message));

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
