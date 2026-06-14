import { useMemo, useState, useRef, useCallback, useEffect } from "react";

const EMPTY_ITEMS = [];
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useSensors, useSensor, PointerSensor } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import useBoardStore from "../../../store/boardStore";
import Card from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import ConfirmModal from "../../../components/common/ConfirmModal";
import { z } from "zod";

function ListColumn({ list, children, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list-${list.id}`,
    data: { type: 'list', list },
    handle: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      className={`board-column-wrapper${isDragging ? " board-column--dragging" : ""}`}
      style={style}
    >
      <div className="board-column">
        <div className="column-header group" style={{ justifyContent: 'normal' }}>
          <button
            className="list-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0"
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
          <h3 className="flex-1 min-w-0">{list.name}</h3>
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

function buildCardMap(cards) {
  const map = {};
  cards.forEach((c) => { map['card-' + c.id] = c; });
  return map;
}

function buildCardItems(lists, cardsByList) {
  const map = {};
  lists.forEach((l) => {
    map['list-' + l.id] = (cardsByList.get(l.id) || []).map((c) => 'card-' + c.id);
  });
  return map;
}

function buildListOrder(lists) {
  return lists.map((l) => 'list-' + l.id);
}

function findContainer(id, items) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('card-')) {
    for (const [cid, cids] of Object.entries(items)) {
      if (cids.includes(id)) return cid;
    }
    return null;
  }
  if (id.startsWith('list-')) return id;
  return null;
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
  const cardError = newTitle.length > 50 ? 'Tiêu đề card không được quá 50 ký tự' : null
  const listError = listName.length > 50 ? 'Tên list không được quá 50 ký tự' : null
  const [filterLabel, setFilterLabel] = useState(null);

  // ── Drag state ──
  // dragState (useState) drives cardItems/listOrder in render → triggers re-render on change
  // dragStateRef (useRef) allows synchronous reads in event handlers (avoids stale closures)
  const [dragState, setDragState] = useState(null);
  const dragStateRef = useRef(null);

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
    if (cardError) return;
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
    if (listError) return;
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  const cardsByList = useMemo(() => {
    const map = new Map();
    lists.forEach((l) => map.set(l.id, []));
    cards.forEach((c) => {
      if (!map.has(c.listId)) return;
      if (filterLabel && !(c.labels || []).some((l) => l.id === filterLabel)) return;
      map.get(c.listId).push(c);
    });
    return map;
  }, [lists, cards, filterLabel]);

  const cardItems = useMemo(() => {
    if (dragState) return dragState.cardItems;
    return buildCardItems(lists, cardsByList);
  }, [lists, cardsByList, dragState]);

  const listOrder = useMemo(() => {
    if (dragState) return dragState.listOrder;
    return buildListOrder(lists);
  }, [lists, dragState]);

  const cardMap = useMemo(() => buildCardMap(cards), [cards]);

  const depsRef = useRef({ lists, cardsByList });
  useEffect(() => {
    depsRef.current = { lists, cardsByList };
  });

  // ── Handlers (tất cả đều STABLE với []) ──
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const { lists, cardsByList } = depsRef.current;
    const state = {
      cardItems: buildCardItems(lists, cardsByList),
      listOrder: buildListOrder(lists),
      listChanged: false,
    };
    setDragState(state);
    dragStateRef.current = state;

    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.card);
    }
  }, []);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!over || !active) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const current = dragStateRef.current;
    if (!current) return;

    const cardItems = current.cardItems;

    if (active.data.current?.type === 'card') {
      const activeContainer = findContainer(activeId, cardItems);
      if (!activeContainer) return;

      let overContainer;
      let overIndex;

      if (overId.startsWith('card-')) {
        overContainer = findContainer(overId, cardItems);
        if (!overContainer) return;
        const overCardIds = cardItems[overContainer] || [];
        overIndex = overCardIds.indexOf(overId);
        if (overIndex < 0) overIndex = overCardIds.length;
      } else if (overId.startsWith('list-')) {
        overContainer = overId;
        overIndex = (cardItems[overId] || []).length;
      } else {
        return;
      }

      // Chỉ xử lý cross-container trong dragOver (same-container để DndKit handle layout)
      if (activeContainer === overContainer) return;

      const currentOverArr = cardItems[overContainer] || [];
      let nextCardItems;

      if (currentOverArr.includes(activeId)) {
        const oldIndex = currentOverArr.indexOf(activeId);
        let newIndex = overIndex;
        if (oldIndex < newIndex) newIndex = Math.min(newIndex, currentOverArr.length);
        console.log('dragOver cross same-target reorder', { activeId, overId, oldIndex, newIndex });
        if (oldIndex === newIndex) return;

        nextCardItems = {
          ...cardItems,
          [overContainer]: arrayMove([...currentOverArr], oldIndex, newIndex),
        };
      } else {
        const activeCardIds = cardItems[activeContainer].filter((id) => id !== activeId);
        const overCardIds = [...currentOverArr];
        const newIndex = Math.min(overIndex, overCardIds.length);
        console.log('dragOver cross-container fresh', { activeId, overId, activeContainer, overContainer, newIndex });
        overCardIds.splice(newIndex, 0, activeId);

        nextCardItems = {
          ...cardItems,
          [activeContainer]: activeCardIds,
          [overContainer]: overCardIds,
        };
      }

      if (nextCardItems) {
        const next = { ...current, cardItems: nextCardItems };
        setDragState(next);
        dragStateRef.current = next;
      }
    }

    if (active.data.current?.type === 'list') {
      if (!overId.startsWith('list-')) return;
      const lo = current.listOrder;
      const oldIndex = lo.indexOf(activeId);
      const newIndex = lo.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const next = {
        ...current,
        listOrder: arrayMove([...lo], oldIndex, newIndex),
        listChanged: true,
      };
      setDragState(next);
      dragStateRef.current = next;
    }
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (active && over) {
      const store = useBoardStore.getState();

      if (active.data.current?.type === 'card') {
        const activeCard = active.data.current.card;
        const activeCardId = activeCard.id;
        const sourceListId = activeCard.listId;
        const overId = String(over.id);

        // Dùng base state (không drag) để tính target position
        const { lists, cardsByList } = depsRef.current;
        const baseCardItems = buildCardItems(lists, cardsByList);

        let targetListId = sourceListId;
        let targetIndex;

        if (overId.startsWith('card-')) {
          const overContainer = findContainer(overId, baseCardItems);
          if (overContainer) {
            targetListId = Number(overContainer.replace('list-', ''));
            const ids = baseCardItems[overContainer] || [];
            targetIndex = ids.indexOf(overId);
            if (targetIndex < 0) targetIndex = ids.length;
          } else {
            targetIndex = 0;
          }
        } else if (overId.startsWith('list-')) {
          targetListId = Number(overId.replace('list-', ''));
          targetIndex = (baseCardItems[overId] || []).length;
        } else {
          targetIndex = 0;
        }

        console.log('handleDragEnd', { activeCardId, sourceListId, targetListId, targetIndex, overId });
        store.moveCard(activeCardId, targetListId, targetIndex);
      } else if (active.data.current?.type === 'list') {
        const overId = String(over.id);
        if (overId.startsWith('list-')) {
          const targetListId = Number(overId.replace('list-', ''));
          store.reorderList(active.data.current.list.id, targetListId);
        }
      }
    }

    setActiveCard(null);
    setDragState(null);
    dragStateRef.current = null;
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveCard(null);
    setDragState(null);
    dragStateRef.current = null;
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      onDragOver={handleDragOver}
    >
      <div className="board-columns">
        {filterLabel && (
          <div className="filter-bar">
            <span>Filtering by label</span>
            <button className="btn btn--sm btn--ghost" onClick={() => setFilterLabel(null)}>Clear</button>
          </div>
        )}

        <SortableContext items={listOrder} strategy={horizontalListSortingStrategy}>
          {listOrder.map((listId) => {
            const list = lists.find((l) => 'list-' + l.id === listId);
            if (!list) return null;
            const cardIds = cardItems[listId] ?? EMPTY_ITEMS;
            return (
              <ListColumn key={listId} list={list} onDelete={deleteList}>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                  {cardIds.map((cardId) => {
                    const card = cardMap[cardId];
                    if (!card) return null;
                    return (
                      <Card
                        key={cardId}
                        card={card}
                        onLabelClick={(labelId) => setFilterLabel(labelId === filterLabel ? null : labelId)}
                        activeLabel={filterLabel}
                      />
                    );
                  })}
                </SortableContext>
                <div className="add-card-area">
                  {addingFor === list.id ? (
                    <Input size="sm"
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
              </ListColumn>
            );
          })}
        </SortableContext>

        <form className="add-list-form" onSubmit={handleAddList}>
          <Input size="sm"
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            error={listError}
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
