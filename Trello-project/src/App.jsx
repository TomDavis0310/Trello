import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import Layout from "./components/layout/Layout";
import useBoardStore from "./store/boardStore";
import "./App.css";

// AppInit chạy một lần khi khởi động để nạp state board từ storage.
function AppInit() {
  const fetchBoards = useBoardStore((s) => s.fetchBoards); // lấy action `fetchBoards` từ store để gọi khi mount
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]); // AppInit không render gì, chỉ đảm bảo dữ liệu đã được nạp trước khi app sẵn sàng.
  return null;
}

// Root app: router + layout + routes. `AppInit` đảm bảo dữ liệu
// đã persist được tải trước khi người dùng tương tác.
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
