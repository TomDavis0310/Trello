import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import useBoardStore from "../../store/boardStore";
import ConfirmModal from "../common/ConfirmModal";

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
        <p
          onClick={() => {
            setTitle(card.title);
            setEditing(true);
          }}
        >
          {card.title}
        </p>
        <button
          className="card-delete-btn"
          title="Delete card"
          onClick={handleDeleteClick}
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
