import { useEffect, useRef } from "react";
import useAuthStore from "../store/authStore";
import { getSocket } from "../services/socket";

export default function useSocket(events, deps = []) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    socketRef.current = socket;

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [token, ...deps]);

  useEffect(() => {
    return () => {
      if (!socketRef.current) return;
      const socket = socketRef.current;
      Object.keys(events).forEach((event) => {
        socket.off(event);
      });
    };
  }, []);
}
