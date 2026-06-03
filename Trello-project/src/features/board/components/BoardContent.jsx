import { useMemo, useState } from "react";
import { DndContext, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import Card from "../../../components/ui/Card";
import ConfirmModal from "../../../components/common/ConfirmModal";
import { z } from "zod";

// === ListColumn ===
// Component đại diện cho một cột (list) trên board.
// Bao gồm:
//   - useDroppable: vùng thả (drop zone) cho card & list reorder
//   - useDraggable: kéo phần header list để sắp xếp lại thứ tự
//   - Nút × để xóa list (có confirm)
function ListColumn({ list, children, onDelete }) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `list-${list.id}`,
    data: { list },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `list-header-${list.id}`,
    data: { list },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setDroppableRef}
      className={`board-column-wrapper${isOver ? " board-column--drag-over" : ""}${isDragging ? " board-column--dragging" : ""}`}
    >
      <div className="board-column">
        {/* Header có thể kéo */}
        <div
          ref={setDraggableRef}
          className="column-header"
          style={dragStyle}
          {...listeners}
          {...attributes}
        >
          <h3>{list.name}</h3>
          <button
            className="list-delete-btn"
            title="Delete list"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
          >
            &times;
          </button>
        </div>
        {/* Các card trong list */}
        <div className="column-cards">
          {children}
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

// === BoardContent ===
// Nội dung chính của board: hiển thị các cột (list) và các thẻ (card) bên trong.
// Tích hợp đầy đủ drag & drop (dnd-kit):
//   - Kéo card giữa các list
//   - Kéo list để sắp xếp lại thứ tự
//   - DragOverlay hiển thị preview khi kéo
// Cũng cung cấp form thêm list mới và input thêm card trong từng list.
export default function BoardContent({ boardId }) {
  const cards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);
  // Lọc và sắp xếp list theo boardId + order
  const lists = useMemo(
    () => allLists
      .filter((l) => l.boardId === boardId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allLists, boardId],
  );
  const createCard = useBoardStore((s) => s.createCard);
  const createList = useBoardStore((s) => s.createList);
  const deleteList = useBoardStore((s) => s.deleteList);

  const [addingFor, setAddingFor] = useState(null); // listId đang mở input thêm card
  const [newTitle, setNewTitle] = useState("");
  const [activeCard, setActiveCard] = useState(null); // card đang được kéo
  const [listName, setListName] = useState("");

  // Schema validate tiêu đề card (Zod)
  const cardSchema = z.object({
    title: z.string().min(1, "Title required").max(200),
  });

  // PointerSensor: yêu cầu di chuột ít nhất 5px mới bắt đầu drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Mở input thêm card cho list cụ thể
  const openAdd = (listId) => {
    setAddingFor(listId);
    setNewTitle("");
  };

  // Đóng input thêm card
  const closeAdd = () => {
    setAddingFor(null);
    setNewTitle("");
  };

  // Xác nhận thêm card: validate Zod, nếu OK thì gọi createCard
  const submitAdd = () => {
    const parsed = cardSchema.safeParse({ title: newTitle.trim() });
    if (!parsed.success) {
      alert(parsed.error.errors.map((e) => e.message).join("\n"));
      return;
    }
    createCard(addingFor, parsed.data.title);
    closeAdd();
  };

  // Submit form thêm list mới
  const handleAddList = (e) => {
    e.preventDefault();
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  // Nhóm cards theo listId để render dễ dàng
  const cardsByList = useMemo(() => {
    const map = new Map();
    lists.forEach((l) => map.set(l.id, []));
    cards.forEach((c) => {
      if (!map.has(c.listId)) return;
      map.get(c.listId).push(c);
    });
    return map;
  }, [lists, cards]);

  // === DRAG & DROP HANDLERS ===

  // Khi bắt đầu kéo: lưu card đang kéo vào state (cho DragOverlay)
  const handleDragStart = (event) => {
    setActiveCard(event.active.data.current?.card ?? null);
  };

  // Khi thả: xác định loại (list reorder hay card move)
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!active || !over) return;

    // --- Reorder list ---
    if (active.data.current?.list) {
      const overId = String(over.id);
      const overParts = overId.split("-");
      if (overParts[0] === "list") {
        const targetListId = Number(overParts[1]);
        if (!Number.isNaN(targetListId)) {
          const reorderList = useBoardStore.getState().reorderList;
          reorderList(active.data.current.list.id, targetListId);
        }
      }
      return;
    }

    // --- Move card ---
    const activeCardId = active.data.current?.card?.id;
    if (!activeCardId) return;

    const moveCard = useBoardStore.getState().moveCard;
    const allCards = useBoardStore.getState().cards;
    const activeCardData = allCards.find((c) => c.id === activeCardId);
    if (!activeCardData) return;

    const overId = String(over.id);
    const parts = overId.split("-");
    const overType = parts[0];
    const overIdNum = Number(parts[1]);
    if (Number.isNaN(overIdNum)) return;

    const otherCards = allCards.filter((c) => c.id !== activeCardId);

    if (overType === "card") {
      // Thả lên một card khác → chèn vào vị trí của card đó
      const overCard = allCards.find((c) => c.id === overIdNum);
      if (!overCard) return;
      const targetListId = overCard.listId;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      const overIdx = targetListCards.findIndex((c) => c.id === overIdNum);
      const targetIndex = overIdx >= 0 ? overIdx : targetListCards.length;
      moveCard(activeCardId, targetListId, targetIndex);
    } else if (overType === "list") {
      // Thả vào list → chèn vào cuối list
      const targetListId = overIdNum;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      moveCard(activeCardId, targetListId, targetListCards.length);
    }
  };

  // Khi hủy kéo (thả ngoài vùng drop): reset active card
  const handleDragCancel = () => {
    setActiveCard(null);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-columns">
        {/* Render từng list column */}
        {lists.map((list) => (
          <ListColumn key={list.id} list={list} onDelete={deleteList}>
            {(cardsByList.get(list.id) || []).map((card) => (
              <Card key={card.id} card={card} />
            ))}
            {/* Input / button thêm card mới trong list */}
            <div className="add-card-area">
              {addingFor === list.id ? (
                <input
                  autoFocus
                  className="add-card-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={closeAdd}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitAdd();
                    if (e.key === "Escape") closeAdd();
                  }}
                  placeholder="Enter card title and press Enter"
                />
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => openAdd(list.id)}
                >
                  + Add a card
                </button>
              )}
            </div>
          </ListColumn>
        ))}

        {/* Form thêm list mới (ở cuối cùng) */}
        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>

        {/* DragOverlay: preview card khi kéo */}
        <DragOverlay>
          {activeCard ? (
            <div className="card drag-overlay">{activeCard.title}</div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
