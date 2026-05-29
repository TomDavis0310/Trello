import { Link, useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import useAuthStore from '../../store/authStore'
import useUiStore from '../../store/uiStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="header-left">
        <button className="btn btn--ghost" onClick={toggleSidebar}>
          &#9776;
        </button>
        <Link to="/" className="header-logo">
          Trello
        </Link>
      </div>
      <div className="header-right">
        {user ? (
          <>
            <span>{user.name}</span>
            <Button variant="ghost" onClick={() => { logout(); navigate('/login') }}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/register">
              <Button>Register</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
