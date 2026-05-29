import { create } from 'zustand'

const useUiStore = create((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  modalData: null,

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openModal: (modal, data = null) =>
    set({ activeModal: modal, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}))

export default useUiStore
