import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import BoardPage from "../features/board/pages/BoardPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

// === ProtectedRoute (Guard) ===
// Component bảo vệ (route guard) kiểm tra trạng thái xác thực từ `authStore`.
// Nếu chưa đăng nhập, tự động chuyển hướng người dùng về trang `/login`.
// Nếu đã đăng nhập, render children (trang được bảo vệ).
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// === AppRoutes ===
// Định tuyến chính của ứng dụng, bao gồm:
//   `/`         → DashboardPage (cần xác thực)
//   `/board/:id` → BoardPage (cần xác thực)
//   `/login`    → LoginPage (công khai)
//   `/register` → RegisterPage (công khai)
//   `*`         → Redirect về `/` (fallback)
export default function AppRoutes() {
  return (
    <Routes>
      {/* Dashboard: protected */} 
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      {/* Board detail: protected */}
      <Route
        path="/board/:id"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      {/* Auth: public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      {/* Fallback – mọi đường dẫn không khớp */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
