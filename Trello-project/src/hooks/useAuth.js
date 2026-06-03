import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// === Custom Hook: useAuth ===
// Gói gọn logic xác thực cho components, kết hợp authStore + router navigation.
// Cung cấp các hàm login, register, logout đã được bọc sẵn navigation.
export function useAuth() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, error, login, register, logout, clearError } = useAuthStore()

  // handleLogin: gọi store login, navigation tự xử lý qua useEffect trong LoginPage
  const handleLogin = useCallback(async (email, password) => {
    await login(email, password)
  }, [login])

  // handleRegister: tương tự handleLogin
  const handleRegister = useCallback(async (email, password) => {
    await register(email, password)
  }, [register])

  // handleLogout: logout khỏi store, sau đó điều hướng về trang login
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
