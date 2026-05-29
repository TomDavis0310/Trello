import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      // TODO: call API
      const user = { id: 1, email, name: 'User' }
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  logout: () => set({ user: null, isAuthenticated: false }),

  clearError: () => set({ error: null }),
}))

export default useAuthStore
