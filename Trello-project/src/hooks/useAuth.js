import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export function useAuth() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } = useAuthStore()

  const handleLogin = useCallback(async (email, password) => {
    await login(email, password)
  }, [login])

  const handleRegister = useCallback(async (email, password) => {
    await register(email, password)
  }, [register])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])


  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
  }
}
