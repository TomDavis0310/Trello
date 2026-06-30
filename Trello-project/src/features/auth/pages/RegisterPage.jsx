import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import useAuthStore from '../../../store/authStore'

// === Trang Đăng ký ===
// Form đăng ký tài khoản mới. Gọi `authStore.register`, tự động login sau khi tạo.
// Giống LoginPage về luồng: tự động redirect sang Dashboard nếu xác thực.
export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const emailError = email.length > 50 ? 'Email không được quá 50 ký tự' : null
  const navigate = useNavigate()
  const { register, isLoading, error, isAuthenticated, clearError } = useAuthStore()

  // Xóa lỗi khi mount
  useEffect(() => {
    clearError()
  }, [clearError])

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = (e) => {
    e.preventDefault()
    register(email, password)
  }

  return (
    <div className="auth-page" data-testid="register-page">
      <form
        className="auth-form"
        onSubmit={handleSubmit}
        data-testid="register-form"
      >
        <h1>Register</h1>
        {error && <p className="error">{error}</p>}
        <Input size="lg"
          data-testid="register-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          required
        />
        <Input size="lg"
          data-testid="register-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button data-testid="register-submit" type="submit" disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
