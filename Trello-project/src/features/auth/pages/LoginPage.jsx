import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import useAuthStore from '../../../store/authStore'

// === Trang Đăng nhập ===
// Form login đơn giản, dùng `authStore.login` để xác thực.
// Tự động chuyển hướng đến Dashboard (`/`) nếu đã xác thực.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore()

  // Xóa lỗi khi component mount (chuyển từ register về login)
  useEffect(() => {
    clearError()
  }, [clearError])

  // Nếu đã đăng nhập, redirect về dashboard
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    login(email, password)
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Log in</h1>
        {error && <p className="error">{error}</p>}
        <Input size="lg"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input size="lg"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Log in'}
        </Button>
        <p>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  )
}
