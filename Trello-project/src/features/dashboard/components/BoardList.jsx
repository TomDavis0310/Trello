import { Link } from "react-router-dom";
import { useState } from "react";
import useBoardStore from "../../../store/boardStore";
import ConfirmModal from "../../../components/common/ConfirmModal";

export default function BoardList() {
  const boards = useBoardStore((s) => s.boards);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBoard, setPendingBoard] = useState(null);

  const handleDeleteClick = (e, board) => {
    e.preventDefault();
    setPendingBoard(board);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (pendingBoard) deleteBoard(pendingBoard.id);
    setConfirmOpen(false);
    setPendingBoard(null);
  };

  return (
    <div className="board-list">
      {boards.length === 0 && (
        <p className="empty-state">No boards yet. Create one!</p>
      )}
      {boards.map((board) => (
        <div key={board.id} className="board-card-wrapper">
          <Link to={`/board/${board.id}`} className="board-card">
            {board.name}
          </Link>
          <button
            className="board-delete-btn"
            title="Delete board"
            onClick={(e) => handleDeleteClick(e, board)}
          >
            &times;
          </button>
        </div>
      ))}

      <ConfirmModal
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={pendingBoard ? `Delete "${pendingBoard.name}"` : "Delete Board"}
        message={
          <>
            <p>Are you sure you want to delete this board?</p>
            <p className="muted">This action cannot be undone.</p>
          </>
        }
      />
    </div>
  );
}
