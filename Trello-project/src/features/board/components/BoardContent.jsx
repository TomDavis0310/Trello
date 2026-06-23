import { useMemo, useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import useBoardStore from "../../../store/boardStore";
import ListColumn from "./ListColumn";

// --- CÁC HÀM TRỢ GIÚP CHUẨN HÓA DỮ LIỆU (ID SẠCH - DẠNG STRING CHO DND-KIT) ---
const EMPTY_ITEMS = [];

function buildCardsByList(cards) {
  const map = {};
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  sorted.forEach((c) => {
    const key = String(c.listId);
    if (!map[key]) map[key] = [];
    map[key].push(String(c.id));
  });
  return map;
}

function buildListIds(lists) {
  return lists.map((l) => `list-${l.id}`);
}

function buildCardMap(cards) {
  const map = {};
  cards.forEach((c) => {
    map[`card-${c.id}`] = c;
  });
  return map;
}

function findContainer(cardId, cardStructure) {
  for (const listId of Object.keys(cardStructure)) {
    if (cardStructure[listId].includes(String(cardId))) {
      return listId;
    }
  }
  return null;
}

export default function BoardContent({ boardId }) {
  // --- LẤY DỮ LIỆU & ACTIONS TỪ ZUSTAND STORE ---
  const allCards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);
  const createCard = useBoardStore((s) => s.createCard);
  const createList = useBoardStore((s) => s.createList);
  const deleteList = useBoardStore((s) => s.deleteList);
  const moveCard = useBoardStore((s) => s.moveCard);
  const moveList = useBoardStore((s) => s.moveList);

  // --- LỌC VÀ SẮP XẾP LIST THUỘC BOARD HIỆN TẠI ---
  const lists = useMemo(
    () =>
      allLists
        .filter((l) => String(l.boardId) === String(boardId))
        .sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0),
        ),
    [allLists, boardId],
  );

  const listIds = useMemo(() => buildListIds(lists), [lists]);
  const cardMap = useMemo(() => buildCardMap(allCards), [allCards]);

  // --- STATE QUẢN LÝ UI CHỨC NĂNG PHỤ ---
  const [addingFor, setAddingFor] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [listName, setListName] = useState("");
  const [filterLabel, setFilterLabel] = useState(null);

  const cardError =
    newTitle.length > 50 ? "Tiêu đề card không được quá 50 ký tự" : null;
  const listError =
    listName.length > 50 ? "Tên list không được quá 50 ký tự" : null;

  // --- STATE & REFS CHIẾN LƯỢC ĐỂ QUẢN LÝ KÉO THẢ (DRAG & DROP) ---
  const [activeItem, setActiveItem] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [clonedCards, setClonedCards] = useState(null);

  const clonedCardsRef = useRef(null);
  const activeItemRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Nếu đang kéo, ưu tiên dùng cấu trúc map tạm thời (clonedCards) để tránh lag giật UI
  const displayCardsByList = useMemo(() => {
    if (clonedCards) return clonedCards;
    return buildCardsByList(allCards);
  }, [allCards, clonedCards]);

  // Cấu hình Sensors chống kích hoạt nhầm khi click chuột bình thường
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // --- ACTIONS XỬ LÝ LIÊN QUAN ĐẾN THÊM MỚI CARD/LIST ---
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
    if (!newTitle.trim()) return;
    createCard(addingFor, newTitle.trim());
    closeAdd();
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (listError) return;
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveItem(null);
    setActiveType(null);
    activeItemRef.current = null;
    setClonedCards(null);
    clonedCardsRef.current = null;
  }, []);

  // ==========================================
  // 1. HANDLE DRAG START (Bắt đầu kéo)
  // ==========================================
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      isDraggingRef.current = true;

      const activeId = String(active.id);
      const rawId = activeId.replace(/^(card-|list-)/, '');
      let type = active.data.current?.type;

      // Cơ chế phòng vệ tự động đoán type nếu OpenCode truyền thiếu data
      if (!type) {
        const currentStoreCards = useBoardStore.getState().cards;
        const isCard = currentStoreCards.some((c) => String(c.id) === rawId);
        type = isCard ? "card" : "list";
      }

      if (type === "card") {
        const snapshot = buildCardsByList(useBoardStore.getState().cards);
        setClonedCards(snapshot);
        clonedCardsRef.current = snapshot;

        const cardData = cardMap[activeId] || active.data.current?.card;
        setActiveItem(cardData);
        setActiveType("card");
        activeItemRef.current = { type: "card", data: cardData };
      } else if (type === "list") {
        const listData =
          lists.find((l) => String(l.id) === rawId) ||
          active.data.current?.list;
        setActiveItem(listData);
        setActiveType("list");
        activeItemRef.current = { type: "list", data: listData };
      }
    },
    [cardMap, lists],
  );

  // ==========================================
  // 2. HANDLE DRAG OVER (Kéo gai qua các vùng - Xử lý xuyên cột)
  // ==========================================
  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const currentClone = clonedCardsRef.current;
    if (!currentClone) return;

    // Strip prefix for clone lookups (clone stores raw IDs)
    const rawActiveId = activeId.replace(/^card-/, '');
    const rawOverId = overId.replace(/^(card-|list-)/, '');

    const activeListId = findContainer(rawActiveId, currentClone);
    if (!activeListId) return;

    let overListId = null;

    if (findContainer(rawOverId, currentClone)) {
      overListId = findContainer(rawOverId, currentClone);
    } else if (currentClone[rawOverId] || over.data.current?.type === "list") {
      overListId = rawOverId;
    }

    if (!overListId || activeListId === overListId) return;

    const sourceCards = currentClone[activeListId].filter(
      (id) => id !== rawActiveId,
    );
    const targetCards = [...(currentClone[overListId] || [])];

    let overIndex = targetCards.indexOf(rawOverId);
    if (overIndex < 0) {
      overIndex = over.data.current?.type === "list" ? 0 : targetCards.length;
    }

    const nextClone = {
      ...currentClone,
      [activeListId]: sourceCards,
      [overListId]: [
        ...targetCards.slice(0, overIndex),
        rawActiveId,
        ...targetCards.slice(overIndex),
      ],
    };

    setClonedCards(nextClone);
    clonedCardsRef.current = nextClone;
  }, []);

  // ==========================================
  // 3. HANDLE DRAG END (Nhả chuột - Chốt hạ và đẩy về Zustand)
  // ==========================================
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      isDraggingRef.current = false;

      if (!active || !over) {
        handleDragCancel();
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const rawActiveId = activeId.replace(/^(card-|list-)/, '');
      const rawOverId = overId.replace(/^(card-|list-)/, '');
      const store = useBoardStore.getState();

      const isCardDrag = clonedCardsRef.current !== null;

      if (isCardDrag) {
        const activeCard = store.cards.find((c) => String(c.id) === rawActiveId);
        if (!activeCard) {
          handleDragCancel();
          return;
        }

        const finalClone = clonedCardsRef.current;
        const sourceListId = String(activeCard.listId);
        let targetListId = findContainer(rawActiveId, finalClone);
        if (over.data.current?.type === "list") {
          targetListId = rawOverId;
        } else if (!targetListId) {
          targetListId = sourceListId;
        }
        let targetIndex = 0;

        if (sourceListId === targetListId) {
          const listCards = [...store.cards]
            .filter((c) => String(c.listId) === targetListId)
            .sort((a, b) => a.position - b.position)
            .map((c) => String(c.id));

          const oldIdx = listCards.indexOf(rawActiveId);
          const newIdx = listCards.indexOf(rawOverId);

          if (oldIdx !== -1 && newIdx !== -1) {
            const reordered = arrayMove(listCards, oldIdx, newIdx);
            targetIndex = reordered.indexOf(rawActiveId);
          } else if (over.data.current?.type === "list" && oldIdx !== -1) {
            targetIndex = 0;
          } else if (oldIdx !== -1) {
            // over có thể là 1 vị trí trống trong list (ghé vào cuối)
            const overCard = store.cards.find((c) => String(c.id) === rawOverId);
            if (!overCard || String(overCard.listId) === targetListId) {
              const newIdx = listCards.indexOf(rawOverId);
              if (newIdx >= 0) {
                const reordered = arrayMove(listCards, oldIdx, newIdx);
                targetIndex = reordered.indexOf(rawActiveId);
              }
            }
          }
        } else if (finalClone) {
          const targetCardIds = finalClone[targetListId] || [];
          targetIndex = targetCardIds.indexOf(rawActiveId);
          if (over.data.current?.type === "list") {
            targetIndex = 0;
          } else if (targetIndex < 0) {
            targetIndex = targetCardIds.length;
          }
        }

        const parsedCardId = isNaN(Number(rawActiveId))
          ? rawActiveId
          : Number(rawActiveId);
        const parsedListId = isNaN(Number(targetListId))
          ? targetListId
          : Number(targetListId);

        store.moveCard(parsedCardId, parsedListId, targetIndex);
      } else {
        if (rawActiveId !== rawOverId) {
          store.moveList(rawActiveId, rawOverId);
        }
      }

      setActiveItem(null);
      setActiveType(null);
      activeItemRef.current = null;
      setClonedCards(null);
      clonedCardsRef.current = null;
    },
    [handleDragCancel, moveCard, moveList],
  );

  return (
      <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-columns">
        {filterLabel && (
          <div className="filter-bar">
            <span>Filtering by label</span>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => setFilterLabel(null)}
            >
              Clear
            </button>
          </div>
        )}

        {/* Khung xử lý kéo thả ngang cho toàn bộ List Column */}
        <SortableContext
          items={listIds}
          strategy={horizontalListSortingStrategy}
        >
          {listIds.map((listId) => {
            const rawListId = listId.replace(/^list-/, '');
            const list = lists.find((l) => String(l.id) === rawListId);
            if (!list) return null;

            const cardIds = displayCardsByList[rawListId] ?? EMPTY_ITEMS;

            return (
              <ListColumn
                key={listId}
                list={list}
                cardIds={cardIds}
                cardMap={cardMap}
                onDelete={deleteList}
                addingFor={addingFor}
                openAdd={openAdd}
                closeAdd={closeAdd}
                submitAdd={submitAdd}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                cardError={cardError}
                filterLabel={filterLabel}
                setFilterLabel={setFilterLabel}
              />
            );
          })}
        </SortableContext>

        {/* Form thêm mới một cột */}
        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            className="add-list-input"
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>

        {/* Drag Overlay: Tạo bóng ảo mượt mà khi di chuyển vật thể */}
        <DragOverlay>
          {activeType === "card" && activeItem ? (
            <div className="card drag-overlay">{activeItem.title}</div>
          ) : null}
          {activeType === "list" && activeItem ? (
            <div className="board-column-wrapper drag-overlay">
              <div className="board-column">
                <h3>{activeItem.name}</h3>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
