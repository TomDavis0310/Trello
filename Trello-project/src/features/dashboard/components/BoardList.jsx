import { Link } from "react-router-dom";
import { useState } from "react";
import useBoardStore from "../../../store/boardStore";
import ConfirmModal from "../../../components/common/ConfirmModal";

// === BoardList ===
// Component hiển thị danh sách board dưới dạng thẻ (card).
// Mỗi board có:
//   - Link điều hướng đến BoardPage `/board/:id`
//   - Nút × để xóa (có confirm modal)
export default function BoardList() {
  const boards = useBoardStore((s) => s.boards);
  const isLoading = useBoardStore((s) => s.isLoading);
  const deleteBoard = useBoardStore((s) => s.deleteBoard);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBoard, setPendingBoard] = useState(null);

  // Khi click delete: lưu board đang chờ xóa vào state rồi mở modal xác nhận
  const handleDeleteClick = (e, board) => {
    e.preventDefault();
    setPendingBoard(board);
    setConfirmOpen(true);
  };

  // Xác nhận xóa: gọi deleteBoard từ store và đóng modal
  const handleConfirm = () => {
    if (pendingBoard) deleteBoard(pendingBoard.id);
    setConfirmOpen(false);
    setPendingBoard(null);
  };

  return (
    <div className="board-list">
      {isLoading && <p className="loading-state">Loading boards...</p>}
      {!isLoading && boards.length === 0 && (
        <p className="empty-state">No boards yet. Create one!</p>
      )}
      {boards.map((board) => (
        <div key={board.id} className="board-card-wrapper">
          <Link
            to={`/board/${board.id}`}
            className="board-card"
            data-testid="board-link"
            data-board-name={board.name}
          >
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
