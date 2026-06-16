  import { useState } from "react";
  import { useSortable } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";
  import useBoardStore from "../../store/boardStore";
  import ConfirmModal from "../common/ConfirmModal";
  import { Input } from "./Input";

  // Card — component hiển thị một thẻ công việc trong column
  // Nhận các props:
  //   - card: object chứa dữ liệu card (id, title, labels, dueDate, comments...)
  //   - onLabelClick: callback khi click vào chấm màu label (dùng để lọc)
  //   - activeLabel: ID của label đang được lọc (để highlight chấm tương ứng)
  //
  // Tích hợp:
  //   - useDraggable từ @dnd-kit: cho phép kéo thả card
  //   - Click vào thân card → mở CardDetailModal (xem/sửa chi tiết)
  //   - Click vào title → inline edit nhanh tiêu đề
  //   - Hiển thị label dạng chấm màu, due date badge, comment count
  export default function Card({ card, onLabelClick, activeLabel }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(card.title);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const titleError = title.length > 50 ? 'Tiêu đề không được quá 50 ký tự' : null

    // Lấy các actions từ boardStore
    const updateCard = useBoardStore((s) => s.updateCard);
    const deleteCard = useBoardStore((s) => s.deleteCard);
    const openCardModal = useBoardStore((s) => s.openCardModal);

    const labels = card.labels || []; // labels có thể undefined với card cũ

    // getDueDateStatus: tính trạng thái due date dựa trên ngày hiện tại
    //   - "overdue": đã quá hạn (diff < 0)
    //   - "today": đến hạn hôm nay (diff === 0)
    //   - "tomorrow": đến hạn ngày mai (diff === 1)
    //   - "upcoming": còn nhiều ngày (diff > 1)
    //   - null: không có due date
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

    // useDraggable: hook từ @dnd-kit giúp card có thể kéo thả
    //   - id: định danh duy nhất (dạng "card-{id}") dùng để xác định vùng drop
    //   - data: gửi kèm object card để bên DndContext xử lý drop
    //   - attributes/listeners: props phải spread vào element để kích hoạt drag
    //   - setNodeRef: ref gắn vào DOM element để @dnd-kit theo dõi
    //   - transform: tọa độ (x, y) khi đang kéo, dùng để di chuyển visual
    //   - isDragging: boolean, true khi card đang được kéo
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: String(card.id),
      data: { type: 'card', card },
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

    // handleKeyDown: xử lý phím tắt khi inline edit
    //   - Enter → lưu
    //   - Escape → hủy, khôi phục title cũ
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

    // === Chế độ inline edit ===
    // Khi editing = true, thay thế toàn bộ card bằng một input
    // để người dùng sửa title nhanh mà không cần mở modal
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
        {/* Card element chính */}
        <div
          ref={setNodeRef}
          className={`card break-words group flex flex-row items-start${isDragging ? " dragging" : ""}`}
          style={style}
          // onClick: mở CardDetailModal — dùng stopPropagation ở các phần tử con
          // để tránh mở modal khi click vào title/delete/label
          onClick={() => openCardModal(card.id)}
        >
          <button
            className="card-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0 mt-0.5"
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
            {/* Labels: hiển thị dạng chấm màu ngang bên trên title */}
            {labels.length > 0 && (
              <div className="card-labels">
                {labels.map((l) => (
                  <span
                    key={l.id}
                    className={`card-label-dot ${activeLabel === l.id ? "active" : ""}`}
                    style={{ background: l.color }}
                    // stopPropagation: tránh mở modal, chỉ gọi onLabelClick để lọc
                    onClick={(e) => { e.stopPropagation(); onLabelClick?.(l.id); }}
                    title={l.text}
                  />
                ))}
              </div>
            )}

            {/* Title: click để inline edit (stopPropagation tránh mở modal) */}
            <p className="break-words"
              onClick={(e) => {
                e.stopPropagation();
                setTitle(card.title);
                setEditing(true);
              }}
            >
              {card.title}
            </p>

            {/* Footer: hiển thị due date badge + comment count */}
            <div className="card-footer">
              {dueStatus && (
                <span className={`due-date-badge due-date-badge--sm due-date--${dueStatus}`}>
                  {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {(card.comments?.length > 0) && (
                <span className="card-comment-count">
                  {/* Icon chat bubble (SVG inline) */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {card.comments.length}
                </span>
              )}
            </div>
          </div>

          {/* Nút × xóa: stopPropagation để không kích hoạt drag hoặc mở modal */}
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

        {/* ConfirmModal: xác nhận xóa card, hiện khi showDeleteModal = true */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
        />
      </>
    );
  }
