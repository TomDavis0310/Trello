import { useMemo, useState } from "react";
import { DndContext, DragOverlay, useDroppable, useDraggable } from "@dnd-kit/core";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import Card from "../../../components/ui/Card";
import ConfirmModal from "../../../components/common/ConfirmModal";
import { z } from "zod";

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

export default function BoardContent({ boardId }) {
  const cards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);
  const lists = useMemo(
    () => allLists
      .filter((l) => l.boardId === boardId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allLists, boardId],
  );
  const createCard = useBoardStore((s) => s.createCard);
  const createList = useBoardStore((s) => s.createList);
  const deleteList = useBoardStore((s) => s.deleteList);

  const [addingFor, setAddingFor] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [activeCard, setActiveCard] = useState(null);
  const [listName, setListName] = useState("");

  const cardSchema = z.object({
    title: z.string().min(1, "Title required").max(200),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const openAdd = (listId) => {
    setAddingFor(listId);
    setNewTitle("");
  };

  const closeAdd = () => {
    setAddingFor(null);
    setNewTitle("");
  };

  const submitAdd = () => {
    const parsed = cardSchema.safeParse({ title: newTitle.trim() });
    if (!parsed.success) {
      alert(parsed.error.errors.map((e) => e.message).join("\n"));
      return;
    }
    createCard(addingFor, parsed.data.title);
    closeAdd();
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  const cardsByList = useMemo(() => {
    const map = new Map();
    lists.forEach((l) => map.set(l.id, []));
    cards.forEach((c) => {
      if (!map.has(c.listId)) return;
      map.get(c.listId).push(c);
    });
    return map;
  }, [lists, cards]);

  const handleDragStart = (event) => {
    setActiveCard(event.active.data.current?.card ?? null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!active || !over) return;

    // List reorder
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

    // Card move
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
      const overCard = allCards.find((c) => c.id === overIdNum);
      if (!overCard) return;
      const targetListId = overCard.listId;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      const overIdx = targetListCards.findIndex((c) => c.id === overIdNum);
      const targetIndex = overIdx >= 0 ? overIdx : targetListCards.length;
      moveCard(activeCardId, targetListId, targetIndex);
    } else if (overType === "list") {
      const targetListId = overIdNum;
      const targetListCards = otherCards.filter((c) => c.listId === targetListId);
      moveCard(activeCardId, targetListId, targetListCards.length);
    }
  };

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
        {lists.map((list) => (
          <ListColumn key={list.id} list={list} onDelete={deleteList}>
            {(cardsByList.get(list.id) || []).map((card) => (
              <Card key={card.id} card={card} />
            ))}
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

        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>

        <DragOverlay>
          {activeCard ? (
            <div className="card drag-overlay">{activeCard.title}</div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
