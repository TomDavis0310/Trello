import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import useBoardStore from "../../store/boardStore";
import ConfirmModal from "../common/ConfirmModal";

// === Card (UI) ===
// Component đại diện cho một card trong list.
// Tính năng:
//   - Kéo thả (useDraggable từ @dnd-kit)
//   - Click vào title để inline edit
//   - Nút × xóa card (có confirm modal)
//   - Click vào p (title) để chuyển sang chế độ inline edit
export default function Card({ card }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const updateCard = useBoardStore((s) => s.updateCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Lưu title sau khi inline edit
  const handleSave = () => {
    if (title.trim() && title.trim() !== card.title) {
      updateCard(card.id, { title: title.trim() });
    } else {
      setTitle(card.title);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setTitle(card.title);
      setEditing(false);
    }
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleConfirmDelete = () => {
    deleteCard(card.id);
    setShowDeleteModal(false);
  };

  // Chế độ inline edit
  if (editing) {
    return (
      <div className="card card--editing">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`card${isDragging ? " dragging" : ""}`}
        style={style}
        {...listeners}
        {...attributes}
      >
        {/* Click vào title để inline edit tiêu đề */}
        <p
          onClick={() => {
            setTitle(card.title);
            setEditing(true);
          }}
        >
          {card.title}
        </p>
        {/* Nút × xóa card + mở modal */}
        {/* Remove this button's drag listener to prevent accidental drag on delete click */}
        <button
          className="card-delete-btn"
          title="Delete card"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
        >
          &times;
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
