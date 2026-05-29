import useBoardStore from '../../../store/boardStore'

export default function BoardList() {
  const boards = useBoardStore((s) => s.boards)

  return (
    <div className="board-list">
      {boards.length === 0 && <p>No boards yet.</p>}
      {boards.map((board) => (
        <div key={board.id} className="board-card">
          {board.name}
        </div>
      ))}
    </div>
  )
}
