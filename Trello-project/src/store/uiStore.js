import { create } from "zustand";
import { devtools } from "zustand/middleware";

// === UI Store ===
// Quản lý trạng thái giao diện chung:
//   - isSidebarOpen: ẩn/hiện sidebar điều hướng
//   - theme: 'light' | 'dark' – chế độ giao diện, persist vào localStorage
//   - activeModal / modalData: modal động (mở rộng dùng trong tương lai)

function getInitialTheme() {
  const stored = localStorage.getItem("trello-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const useUiStore = create(
  devtools((set) => ({
    isSidebarOpen: true,
    theme: getInitialTheme(),
    activeModal: null,
    modalData: null,

    // Bật/tắt sidebar
    toggleSidebar: () =>
      set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    // Chuyển đổi dark/light mode, persist vào localStorage
    toggleTheme: () =>
      set((state) => {
        const next = state.theme === "light" ? "dark" : "light";
        localStorage.setItem("trello-theme", next);
        return { theme: next };
      }),

    // Mở modal với tên và dữ liệu kèm theo
    openModal: (modal, data = null) =>
      set({ activeModal: modal, modalData: data }),

    // Đóng modal hiện tại
    closeModal: () => set({ activeModal: null, modalData: null }),
  })),
);

export default useUiStore;
