import Header from "./Header";
import Sidebar from "./Sidebar";
import CardDetailModal from "../common/CardDetailModal";
import useAuthStore from "../../store/authStore";

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
        {isAuthenticated && <CardDetailModal />}
      </div>
    </div>
  );
}
