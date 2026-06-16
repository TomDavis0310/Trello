import { Link, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import useAuthStore from "../../store/authStore";
import useUiStore from "../../store/uiStore";

// === Header ===
// Thanh header trên cùng:
//   - Nút hamburger (☰) để bật/tắt sidebar (toggleSidebar)
//   - Logo "Trello" – link về dashboard
//   - Nếu đã login: hiển thị tên user + nút Logout
//   - Nếu chưa login: hiển thị nút Log in + Register (link)
export default function Header() {
  const { user, logout } = useAuthStore();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-left">
        {/* Nút bật/tắt sidebar */}
        <button className="btn btn--ghost" onClick={toggleSidebar}>
          &#9776;
        </button>
        <Link to="/" className="header-logo">
          Trello
        </Link>
      </div>
      <div className="header-right">
        {/* Switch chuyển dark/light mode */}
        <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} aria-label="Toggle dark mode" />
        {user ? (
          <>
            {/* User đã đăng nhập */}
            <span>{user.name}</span>
            <Button
              variant="ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </Button>
          </>
        ) : (
          <>
            {/* User chưa đăng nhập */}
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
  );
}
