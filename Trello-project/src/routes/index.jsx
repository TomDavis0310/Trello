import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import BoardPage from "../features/board/pages/BoardPage";
import LoginPage from "../features/auth/pages/LoginPage";
import RegisterPage from "../features/auth/pages/RegisterPage";

// Route guard đơn giản: chuyển hướng về `/login` khi không có session.
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// AppRoutes: bảng định tuyến chính. Các route được bảo vệ (Protected)
// bọc các trang cần xác thực (dashboard, board view).
export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/:id"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
