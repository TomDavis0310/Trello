import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Card from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import ConfirmModal from "../../../components/common/ConfirmModal";

export default function ListColumn({
  list,
  cardIds = [],
  cardMap = {},
  onDelete,
  addingFor,
  openAdd,
  closeAdd,
  submitAdd,
  newTitle,
  setNewTitle,
  cardError,
  filterLabel,
  setFilterLabel,
}) {
  // 1. Khai báo useSortable cho List với ID dạng String chuẩn chỉnh
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(list.id),
    data: { type: "list", list },
    handle: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // 2. Ép toàn bộ cardIds về dạng String để SortableContext nhận diện chính xác
  const safeStringCardIds = cardIds.map((id) => String(id));

  return (
    <div
      ref={setNodeRef}
      className={`board-column-wrapper${isDragging ? " board-column--dragging" : ""}`}
      style={style}
    >
      <div className="board-column">
        {/* Header Column: Nơi duy nhất chứa handle kéo thả của List */}
        <div
          className="column-header group"
          style={{ justifyContent: "normal" }}
        >
          <button
            className="list-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0"
            {...listeners}
            {...attributes}
          />
          <h3 className="flex-1 min-w-0">{list.name}</h3>
          <button
            className="list-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            &times;
          </button>
        </div>

        {/* Thân Column chứa danh sách các Card */}
        <div className="column-cards">
          <SortableContext
            items={safeStringCardIds} // Sử dụng mảng ID đã chuẩn hóa kiểu dữ liệu
            strategy={verticalListSortingStrategy}
          >
            {safeStringCardIds.map((cardId) => {
              const card = cardMap[cardId];
              if (!card) return null;
              return (
                <Card
                  key={cardId}
                  card={card}
                  onLabelClick={(labelId) =>
                    setFilterLabel(labelId === filterLabel ? null : labelId)
                  }
                  activeLabel={filterLabel}
                />
              );
            })}
          </SortableContext>
        </div>

        {/* Khu vực nút thêm Card nhanh */}
        <div className="add-card-area">
          {addingFor === list.id ? (
            <Input
              size="sm"
              autoFocus
              className="add-card-input"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={closeAdd}
              error={cardError}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAdd();
                if (e.key === "Escape") closeAdd();
              }}
              placeholder="Enter card title and press Enter"
            />
          ) : (
            <button className="add-card-btn" onClick={() => openAdd(list.id)}>
              + Add a card
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(list.id);
          setShowDeleteConfirm(false);
        }}
        title={`Delete "${list.name}"`}
        message={
          <>
            <p>Are you sure you want to delete this list and all its cards?</p>
            <p className="muted">This action cannot be undone.</p>
          </>
        }
      />
    </div>
  );
}
