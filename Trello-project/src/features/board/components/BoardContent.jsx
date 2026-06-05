import { useMemo, useState } from "react";
import { DndContext, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import Card from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import ConfirmModal from "../../../components/common/ConfirmModal";
import { z } from "zod";

// ListColumn — component đại diện cho một cột (list) trên board
// Tích hợp đồng thời:
//   - useDroppable: đánh dấu vùng thả (drop zone) để:
//       a) card từ list khác kéo vào
//       b) list header kéo để reorder
//   - useDraggable: kéo phần header list (tên cột) để sắp xếp lại thứ tự
//   - Nút × xóa list (kèm ConfirmModal)
//
// Props:
//   - list: object list { id, boardId, name, order }
//   - children: các Card component bên trong column
//   - onDelete: callback khi xóa list
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

// BoardContent — nội dung chính của một board
// Gồm:
//   - Các ListColumn (chứa Card bên trong) với drag & drop
//   - Filter bar khi đang lọc theo label
//   - Form thêm list mới
//   - DragOverlay hiển thị preview card khi kéo
//
// Luồng drag & drop với @dnd-kit:
//   1. DndContext bao bọc toàn bộ, quản lý state drag
//   2. PointerSensor: chỉ kích hoạt drag khi chuột di chuyển >= 5px
//   3. Khi bắt đầu kéo: onDragStart → lưu card vào activeCard (cho overlay)
//   4. Khi thả: onDragEnd → xác định:
//       a) Nếu active là list header → reorderList
//       b) Nếu active là card → moveCard (xác định target list + index)
//   5. DragOverlay: hiển thị card preview floating theo chuột
//
// Filter by label:
//   - filterLabel state: lưu ID label đang lọc (null = không lọc)
//   - cardsByList filter bỏ qua card không có label đó
//   - Filter bar hiển thị khi filterLabel !== null, nút Clear để tắt
export default function BoardContent({ boardId }) {
  const cards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);

  // Lọc list thuộc board hiện tại + sắp xếp theo order
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
  const [activeCard, setActiveCard] = useState(null); // card đang được kéo (cho DragOverlay)
  const [listName, setListName] = useState("");
  const [filterLabel, setFilterLabel] = useState(null); // ID label đang lọc

  // Schema Zod để validate title card khi thêm mới
  const cardSchema = z.object({
    title: z.string().min(1, "Title required").max(200),
  });

  // PointerSensor: yêu cầu di chuột ít nhất 5px mới bắt đầu drag
  // Tránh vô tình kéo khi click chuột
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

  // submitAdd: validate + thêm card mới
  // Dùng safeParse để tránh throw exception
  const submitAdd = () => {
    const parsed = cardSchema.safeParse({ title: newTitle.trim() });
    if (!parsed.success) {
      alert(parsed.error.errors.map((e) => e.message).join("\n"));
      return;
    }
    createCard(addingFor, parsed.data.title);
    closeAdd();
  };

  // handleAddList: submit form thêm list mới (cột cuối cùng)
  const handleAddList = (e) => {
    e.preventDefault();
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  // cardsByList: nhóm cards theo listId, có áp dụng bộ lọc filterLabel
  // Dùng useMemo để tránh tính toán lại mỗi lần render
  const cardsByList = useMemo(() => {
    const map = new Map();
    lists.forEach((l) => map.set(l.id, []));
    cards.forEach((c) => {
      if (!map.has(c.listId)) return;
      // Nếu đang lọc label → bỏ qua card không có label đó
      if (filterLabel && !(c.labels || []).some((l) => l.id === filterLabel)) return;
      map.get(c.listId).push(c);
    });
    return map;
  }, [lists, cards, filterLabel]);

  // ============================================================
  // DRAG & DROP HANDLERS
  // ============================================================
  // Các handler này được @dnd-kit gọi tự động trong DndContext.
  //
  // onDragStart: khi bắt đầu kéo (chỉ sau khi PointerSensor vượt 5px)
  //   → lưu active card vào state để DragOverlay hiển thị preview
  //
  // onDragEnd: khi thả chuột (dù có đặt vào drop zone hay không)
  //   → active: element đang được kéo
  //   → over: element bên dưới vị trí thả
  //   Phân loại dựa vào data gửi kèm:
  //     - active.data.current.list !== undefined → reorder list
  //     - active.data.current.card !== undefined → move card
  //   Đối với move card:
  //     - over.id = "card-{id}" → chèn vào vị trí card đó
  //     - over.id = "list-{id}" → chèn vào cuối list
  //
  // onDragCancel: khi hủy kéo (ESC, click chuột phải, ...)
  //   → reset activeCard

  // handleDragStart: lưu card đang kéo để DragOverlay hiển thị
  const handleDragStart = (event) => {
    setActiveCard(event.active.data.current?.card ?? null);
  };

  // handleDragEnd: xử lý khi thả — reorder list hoặc move card
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!active || !over) return;

    // === Reorder list ===
    // Nếu active là list header (có data.list) → sắp xếp lại
    if (active.data.current?.list) {
      const overId = String(over.id);
      const overParts = overId.split("-");
      // over.id có dạng "list-{id}" (drop zone của list)
      if (overParts[0] === "list") {
        const targetListId = Number(overParts[1]);
        if (!Number.isNaN(targetListId)) {
          const reorderList = useBoardStore.getState().reorderList;
          reorderList(active.data.current.list.id, targetListId);
        }
      }
      return;
    }

    // === Move card ===
    const activeCardId = active.data.current?.card?.id;
    if (!activeCardId) return;

    const moveCard = useBoardStore.getState().moveCard;
    const allCards = useBoardStore.getState().cards;
    const activeCardData = allCards.find((c) => c.id === activeCardId);
    if (!activeCardData) return;

    // Parse over.id: "card-{id}" hoặc "list-{id}"
    const overId = String(over.id);
    const parts = overId.split("-");
    const overType = parts[0];    // "card" hoặc "list"
    const overIdNum = Number(parts[1]);
    if (Number.isNaN(overIdNum)) return;

    const otherCards = allCards.filter((c) => c.id !== activeCardId);

    if (overType === "card") {
      // Thả lên một card khác → tìm vị trí card đó trong list
      // và chèn active card ngay trước vị trí đó
      const overCard = allCards.find((c) => c.id === overIdNum);
      if (!overCard) return;
      const targetListId = overCard.listId;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      const overIdx = targetListCards.findIndex((c) => c.id === overIdNum);
      const targetIndex = overIdx >= 0 ? overIdx : targetListCards.length;
      moveCard(activeCardId, targetListId, targetIndex);
    } else if (overType === "list") {
      // Thả vào vùng trống của list → chèn vào cuối list
      const targetListId = overIdNum;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      moveCard(activeCardId, targetListId, targetListCards.length);
    }
  };

  // handleDragCancel: reset khi kéo bị hủy giữa chừng
  const handleDragCancel = () => {
    setActiveCard(null);
  };

  return (
    // DndContext: component bao bọc của @dnd-kit, quản lý toàn bộ state drag
    // - sensors: cấu hình cảm biến (PointerSensor với 5px threshold)
    // - onDragStart/onDragEnd/onDragCancel: lifecycle handlers
    // Tất cả useDroppable/useDraggable bên trong đều thuộc context này
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-columns">
        {/* Filter bar: hiển thị khi đang lọc theo label */}
        {filterLabel && (
          <div className="filter-bar">
            <span>Filtering by label</span>
            <button className="btn btn--sm btn--ghost" onClick={() => setFilterLabel(null)}>Clear</button>
          </div>
        )}

        {/* Render từng ListColumn */}
        {lists.map((list) => (
          <ListColumn key={list.id} list={list} onDelete={deleteList}>
            {/* Card trong list */}
            {(cardsByList.get(list.id) || []).map((card) => (
              <Card
                key={card.id}
                card={card}
                // onLabelClick: toggle filter — click lại label đang lọc → bỏ lọc
                onLabelClick={(labelId) => setFilterLabel(labelId === filterLabel ? null : labelId)}
                activeLabel={filterLabel}
              />
            ))}
            {/* Add card: input hoặc button, toggle theo addingFor state */}
            <div className="add-card-area">
              {addingFor === list.id ? (
                <Input
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
                <button className="add-card-btn" onClick={() => openAdd(list.id)}>
                  + Add a card
                </button>
              )}
            </div>
          </ListColumn>
        ))}

        {/* Form thêm list mới — luôn ở cuối cùng */}
        <form className="add-list-form" onSubmit={handleAddList}>
          <Input
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>

        {/* DragOverlay: preview floating khi kéo card
            Vị trí tự động theo chuột, không ảnh hưởng layout gốc */}
        <DragOverlay>
          {activeCard ? (
            <div className="card drag-overlay">{activeCard.title}</div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
