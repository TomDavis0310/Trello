import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import Layout from "./components/layout/Layout";
import useBoardStore from "./store/boardStore";
import "./App.css";

// === AppInit ===
// Component không render gì cả (trả về null). Chỉ dùng để gọi `fetchBoards` một lần
// khi component mount, nhằm nạp dữ liệu board/list/card đã persist từ localStorage
// trước khi người dùng tương tác với ứng dụng.
function AppInit() {
  const fetchBoards = useBoardStore((s) => s.fetchBoards);
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);
  return null;
}

// === Root App ===
// App là component gốc, chịu trách nhiệm thiết lập:
// 1. `BrowserRouter` – cung cấp routing cho toàn ứng dụng (SPA).
// 2. `AppInit`   – nạp lại dữ liệu Trello đã lưu (boards, lists, cards).
// 3. `Layout`    – bố cục chính: Header, Sidebar (nếu auth), Main content.
// 4. `AppRoutes` – định tuyến đến các feature pages (Dashboard, Board, Auth).
export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}
