  import { useMemo, useState } from "react";
  import { useSortable } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";
  import useBoardStore from "../../../store/boardStore";
  import ConfirmModal from "../../../components/common/ConfirmModal";
  import { Input } from "../../../components/ui/Input";

  export default function Card({ card, onLabelClick, activeLabel }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(card.title);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const titleError = title.length > 50 ? 'Tiêu đề không được quá 50 ký tự' : null

    const updateCard = useBoardStore((s) => s.updateCard);
    const deleteCard = useBoardStore((s) => s.deleteCard);
    const openCardModal = useBoardStore((s) => s.openCardModal);

    const labels = card.labels || [];

    const getDueDateStatus = (dateStr) => {
      if (!dateStr) return null;
      const now = new Date();
      const due = new Date(dateStr);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diff = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
      if (diff < 0) return "overdue";
      if (diff === 0) return "today";
      if (diff === 1) return "tomorrow";
      return "upcoming";
    };

    const dueStatus = getDueDateStatus(card.dueDate);

    const sortableData = useMemo(
      () => ({
        type: "card",
        cardId: String(card.id),
        listId: String(card.listId),
      }),
      [card.id, card.listId],
    );

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: `card-${card.id}`,
      data: sortableData,
      handle: true,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleSave = () => {
      if (titleError) return;
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
          <Input
            size="sm"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            error={titleError}
          />
        </div>
      );
    }

    return (
      <>
        <div
          ref={setNodeRef}
          data-testid="card"
          data-card-id={String(card.id)}
          data-card-title={card.title}
          data-list-id={String(card.listId)}
          className={`card break-words group flex flex-row items-start${isDragging ? " dragging" : ""}`}
          style={style}
          onClick={() => openCardModal(card.id)}
        >
          <button
            className="card-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0 mt-0.5"
            data-testid="card-drag-handle"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            {labels.length > 0 && (
              <div className="card-labels">
                {labels.map((l) => (
                  <span
                    key={l.id}
                    className={`card-label-dot ${activeLabel === l.id ? "active" : ""}`}
                    style={{ background: l.color }}
                    onClick={(e) => { e.stopPropagation(); onLabelClick?.(l.id); }}
                    title={l.text}
                  />
                ))}
              </div>
            )}

            <p
              className="break-words"
              data-testid="card-title"
              onClick={(e) => {
                e.stopPropagation();
                setTitle(card.title);
                setEditing(true);
              }}
            >
              {card.title}
            </p>

            <div className="card-footer">
              {dueStatus && (
                <span className={`due-date-badge due-date-badge--sm due-date--${dueStatus}`}>
                  {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {(card.comments?.length > 0) && (
                <span className="card-comment-count">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {card.comments.length}
                </span>
              )}
            </div>
          </div>

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
