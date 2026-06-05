import Header from "./Header";
import Sidebar from "./Sidebar";
import useAuthStore from "../../store/authStore";

// === Layout ===
// Bố cục chính của ứng dụng, áp dụng cho mọi trang:
//   - Header: thanh điều hướng trên cùng (luôn hiển thị)
//   - Sidebar: danh sách board (chỉ khi đã xác thực)
//   - Main content: nội dung trang (children từ router)
export default function Layout({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        {isAuthenticated && <Sidebar />}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
