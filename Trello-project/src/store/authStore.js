import { create } from "zustand";
import { api } from "../services/api";
import useBoardStore from "./boardStore";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  init: async () => {
    try {
      const user = await api.getCurrentUser();
      if (user) {
        set({ user, isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem("trello-token");
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.register(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
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
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
