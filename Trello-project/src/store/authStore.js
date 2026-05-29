import { create } from 'zustand'
import { api } from '../services/api'

const useAuthStore = create((set) => ({
  user: api.getCurrentUser(),
  isAuthenticated: !!api.getCurrentUser(),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const user = await api.login(email, password)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const user = await api.register(email, password)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  logout: () => {
    api.logout()
    set({ user: null, isAuthenticated: false })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
