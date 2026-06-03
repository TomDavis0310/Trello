import { Link } from 'react-router-dom'
import useUiStore from '../../store/uiStore'
import useBoardStore from '../../store/boardStore'

// === Sidebar ===
// Thanh bên trái, chỉ hiển thị khi isSidebarOpen = true (uiStore).
// Gồm:
//   - Link "Dashboard" về trang chủ
//   - Danh sách tất cả board (điều hướng nhanh)
export default function Sidebar() {
  const isOpen = useUiStore((s) => s.isSidebarOpen)
  const boards = useBoardStore((s) => s.boards)

  if (!isOpen) return null

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-home">&#9654; Dashboard</Link>
      <h3>Boards</h3>
      <nav>
        {boards.map((board) => (
          <Link key={board.id} to={`/board/${board.id}`}>
            {board.name}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
