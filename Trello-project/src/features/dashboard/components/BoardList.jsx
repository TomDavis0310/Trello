import { Link } from 'react-router-dom'
import useBoardStore from '../../../store/boardStore'

export default function BoardList() {
  const boards = useBoardStore((s) => s.boards)
  const deleteBoard = useBoardStore((s) => s.deleteBoard)

  return (
    <div className="board-list">
      {boards.length === 0 && <p className="empty-state">No boards yet. Create one!</p>}
      {boards.map((board) => (
        <div key={board.id} className="board-card-wrapper">
          <Link to={`/board/${board.id}`} className="board-card">
            {board.name}
          </Link>
          <button
            className="board-delete-btn"
            title="Delete board"
            onClick={(e) => {
              e.preventDefault()
              if (confirm(`Delete "${board.name}"?`)) deleteBoard(board.id)
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
