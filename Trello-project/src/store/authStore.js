import { create } from "zustand";
import { api } from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import useBoardStore from "./boardStore";

const TOKEN_KEY = "trello-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

const useAuthStore = create((set) => ({
  user: null,
  token: getToken(),
  isAuthenticated: false,
  isAuthInitialized: false,
  isLoading: false,
  error: null,

  init: async () => {
    const token = getToken();

    if (!token) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isAuthInitialized: true,
      });
      return;
    }

    try {
      const user = await api.getCurrentUser();
      if (user) {
        set({ user, token, isAuthenticated: true });
        connectSocket(token);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, isAuthenticated: false });
    } finally {
      set({ isAuthInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, password);
      const token = getToken();
      set({
        user,
        token,
        isAuthenticated: true,
        isAuthInitialized: true,
        isLoading: false,
      });
      connectSocket(token);
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.register(email, password);
      const token = getToken();
      set({
        user,
        token,
        isAuthenticated: true,
        isAuthInitialized: true,
        isLoading: false,
      });
      connectSocket(token);
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    const clearBoardData = useBoardStore.getState().clearBoardData;
    if (typeof clearBoardData === "function") clearBoardData();
    disconnectSocket();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthInitialized: true,
    });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
