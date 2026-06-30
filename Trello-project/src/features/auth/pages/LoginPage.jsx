import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import useAuthStore from '../../../store/authStore'

// === Trang Đăng nhập ===
// Form login đơn giản, dùng `authStore.login` để xác thực.
// Tự động chuyển hướng đến Dashboard (`/`) nếu đã xác thực.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore()

  // Xóa lỗi khi component mount (chuyển từ register về login)
  useEffect(() => {
    clearError()
  }, [clearError])

  // Nếu đã đăng nhập, redirect về dashboard
  useEffect(() => {
    if (!isAuthenticated) return

    const redirectTo = location.state?.from?.pathname || '/'
    navigate(redirectTo, { replace: true })
  }, [isAuthenticated, location.state, navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    login(email, password)
  }

  return (
    <div className="auth-page" data-testid="login-page">
      <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form">
        <h1>Log in</h1>
        {error && <p className="error">{error}</p>}
        <Input size="lg"
          data-testid="login-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input size="lg"
          data-testid="login-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button data-testid="login-submit" type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log in'}
        </Button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  )
}
