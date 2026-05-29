import { Link } from 'react-router-dom'
import useUiStore from '../../store/uiStore'
import useBoardStore from '../../store/boardStore'

export default function Sidebar() {
  const isOpen = useUiStore((s) => s.isSidebarOpen)
  const boards = useBoardStore((s) => s.boards)

  if (!isOpen) return null

  return (
    <aside className="sidebar">
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
