import { create } from "zustand";
import { api } from "../services/api";
import useBoardStore from "./boardStore";

// Auth store (Zustand) - chứa user hiện tại và cung cấp các action bất đồng bộ.
// Store này ủy quyền việc lưu/truy vấn session cho `api.js` (mock localStorage).
const useAuthStore = create((set) => ({
  // initial session read from the mock API
  user: api.getCurrentUser(),
  isAuthenticated: !!api.getCurrentUser(),
  isLoading: false,
  error: null,

  // login: gọi `api.login`, cập nhật state khi thành công/không thành công
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // register: gọi `api.register` và cập nhật session
  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.register(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // logout: xóa session ở cả API và store
  logout: () => {
    api.logout();
    // clear board data to avoid leaking previous session's boards
    const clearBoardData = useBoardStore.getState().clearBoardData;
    if (typeof clearBoardData === "function") clearBoardData();
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
