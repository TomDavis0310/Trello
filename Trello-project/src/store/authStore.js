import { create } from "zustand";
import { api } from "../services/api";
import useBoardStore from "./boardStore";

// === Auth Store (Zustand) ===
// Quản lý session người dùng: user hiện tại, trạng thái xác thực, loading, lỗi.
// Các action login/register/logout ủy quyền cho `api.js` (giả lập API, lưu localStorage).
// Khi logout, đồng thời xóa dữ liệu board của session trước để tránh rò rỉ.
const useAuthStore = create((set) => ({
  // --- Trạng thái khởi tạo ---
  // Đọc user từ session (nếu có) ngay khi store được tạo
  user: api.getCurrentUser(),
  isAuthenticated: !!api.getCurrentUser(),
  isLoading: false,
  error: null,

  // --- login ---
  // Gửi email/password đến `api.login`, nếu thành công thì lưu user vào store.
  // Nếu thất bại, lưu thông báo lỗi để component hiển thị.
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.login(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // --- register ---
  // Gửi email/password đến `api.register`, API tự động login sau khi tạo tài khoản.
  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.register(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // --- logout ---
  // Gọi API logout (xóa `trello-current-user` khỏi localStorage),
  // sau đó dùng `clearBoardData` từ boardStore để làm sạch dữ liệu board,
  // và reset store về trạng thái chưa xác thực.
  logout: () => {
    api.logout();
    const clearBoardData = useBoardStore.getState().clearBoardData;
    if (typeof clearBoardData === "function") clearBoardData();
    set({ user: null, isAuthenticated: false });
  },

  // Xóa thông báo lỗi hiện tại (dùng khi chuyển trang hoặc đóng thông báo)
  clearError: () => set({ error: null }),
}));

export default useAuthStore;
