import { create } from 'zustand'

// === UI Store ===
// Quản lý trạng thái giao diện chung:
//   - isSidebarOpen: ẩn/hiện sidebar điều hướng
//   - activeModal / modalData: modal động (mở rộng dùng trong tương lai)
const useUiStore = create((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  modalData: null,

  // Bật/tắt sidebar
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  // Mở modal với tên và dữ liệu kèm theo
  openModal: (modal, data = null) =>
    set({ activeModal: modal, modalData: data }),

  // Đóng modal hiện tại
  closeModal: () => set({ activeModal: null, modalData: null }),
}))

export default useUiStore
