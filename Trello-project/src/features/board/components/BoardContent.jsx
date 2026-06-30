import { useMemo, useState, useRef, useCallback, useEffect } from "react";
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

function normalizeDndId(id) {
  return String(id).replace(/^(?:list-drop-|card-|list-)/, "");
}

function resolveRawOverId(over) {
  const overType = over?.data?.current?.type;
  const overListId = over?.data?.current?.listId;

  if (overType === "list" && overListId != null) {
    return String(overListId);
  }

  return normalizeDndId(over?.id ?? "");
}

function areCardsByListEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const listA = a[key] || EMPTY_ITEMS;
    const listB = b[key] || EMPTY_ITEMS;

    if (listA.length !== listB.length) return false;

    for (let index = 0; index < listA.length; index += 1) {
      if (listA[index] !== listB[index]) return false;
    }
  }

  return true;
}

function areCardIdListsEqual(a = EMPTY_ITEMS, b = EMPTY_ITEMS) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }

  return true;
}

function findContainer(cardId, cardStructure) {
  for (const listId of Object.keys(cardStructure)) {
    if (cardStructure[listId].includes(String(cardId))) {
      return listId;
    }
  }
  return null;
}

function resolveOverListId(rawOverId, overType, cardStructure) {
  const containingListId = findContainer(rawOverId, cardStructure);
  if (containingListId) return containingListId;
  if (cardStructure[rawOverId] || overType === "list") return rawOverId;
  return null;
}

function getDropRect(over, overType) {
  const currentRect = over.rect?.current;

  if (overType === "card") {
    return (
      currentRect?.translated ||
      currentRect?.initial ||
      over.rect?.translated ||
      over.rect?.initial ||
      over.rect
    );
  }

  if (overType === "list") {
    return (
      currentRect?.translated ||
      currentRect?.initial ||
      over.rect?.translated ||
      over.rect?.initial ||
      over.rect
    );
  }

  return (
    currentRect?.translated ||
    currentRect?.initial ||
    over.rect?.translated ||
    over.rect?.initial ||
    over.rect
  );
}

// Xác định vị trí chèn (đầu/cuối) khi drop vào list dựa trên cursor Y
function getDropIndex(event, over, overType = over.data.current?.type) {
  // activatorEvent is the pointerdown event (drag start), NOT the current
  // cursor position. Adding delta.y gives the actual cursor Y at drop/over time.
  const cursorY = (event.activatorEvent?.clientY ?? 0) + (event.delta?.y ?? 0);
  const r = getDropRect(over, overType);
  if (r?.top != null && r?.height != null && r.height > 0) {
    return cursorY > r.top + r.height / 2 ? 'bottom' : 'top';
  }
  return 'top';
}

function buildExpectedCardsByList(
  cards,
  sourceListId,
  targetListId,
  activeCardId,
  targetIndex,
) {
  const nextCardsByList = buildCardsByList(cards);
  const normalizedTargetIndex = Math.max(0, targetIndex);

  if (sourceListId === targetListId) {
    const sameListCards = (nextCardsByList[sourceListId] || []).filter(
      (id) => id !== activeCardId,
    );

    sameListCards.splice(
      Math.min(normalizedTargetIndex, sameListCards.length),
      0,
      activeCardId,
    );

    return {
      ...nextCardsByList,
      [sourceListId]: sameListCards,
    };
  }

  const sourceCards = (nextCardsByList[sourceListId] || []).filter(
    (id) => id !== activeCardId,
  );
  const targetCards = (nextCardsByList[targetListId] || []).filter(
    (id) => id !== activeCardId,
  );

  targetCards.splice(
    Math.min(normalizedTargetIndex, targetCards.length),
    0,
    activeCardId,
  );

  return {
    ...nextCardsByList,
    [sourceListId]: sourceCards,
    [targetListId]: targetCards,
  };
}

export default function BoardContent({ boardId }) {
  // --- LẤY DỮ LIỆU & ACTIONS TỪ ZUSTAND STORE ---
  const allCards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);
  const createCard = useBoardStore((s) => s.createCard);
  const createList = useBoardStore((s) => s.createList);
  const deleteList = useBoardStore((s) => s.deleteList);


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
  const pendingDropRef = useRef(null);

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
    pendingDropRef.current = null;
  }, []);

  useEffect(() => {
    if (!clonedCards) return;

    const pendingDrop = pendingDropRef.current;
    if (!pendingDrop) return;

    const currentStoreCardsByList = buildCardsByList(allCards);
    const matchesPendingDrop = Object.entries(pendingDrop.lists).every(
      ([listId, expectedCardIds]) =>
        areCardIdListsEqual(
          currentStoreCardsByList[listId] || EMPTY_ITEMS,
          expectedCardIds,
        ),
    );

    if (!matchesPendingDrop) return;

    setClonedCards(null);
    clonedCardsRef.current = null;
    pendingDropRef.current = null;
  }, [allCards, clonedCards]);

  // ==========================================
  // 1. HANDLE DRAG START (Bắt đầu kéo)
  // ==========================================
  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      isDraggingRef.current = true;

      const activeId = String(active.id);
      const rawId = normalizeDndId(activeId);
      let type = active.data.current?.type;

      // Cơ chế phòng vệ tự động đoán type nếu OpenCode truyền thiếu data
      if (!type) {
        const currentStoreCards = useBoardStore.getState().cards;
        const isCard = currentStoreCards.some((c) => String(c.id) === rawId);
        type = isCard ? "card" : "list";
      }

      if (type === "card") {
        pendingDropRef.current = null;
        const snapshot = buildCardsByList(useBoardStore.getState().cards);
        setClonedCards(snapshot);
        clonedCardsRef.current = snapshot;

        const cardData = cardMap[activeId] || active.data.current?.card;
        setActiveItem(cardData);
        setActiveType("card");
        activeItemRef.current = { type: "card", data: cardData };
      } else if (type === "list") {
        pendingDropRef.current = null;
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
  // 2. HANDLE DRAG OVER (Kéo gai qua các vùng - Xử lý xuyên cột và cùng cột)
  // ==========================================
  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over) {
      console.log(`[handleDragOver] EARLY RETURN: active=${!!active} over=${!!over}`);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const overType = over.data.current?.type;
    console.log(`[handleDragOver] active.id=${activeId} over.id=${overId} overType=${overType}`);

    if (activeId === overId) {
      console.log(`[handleDragOver] EARLY RETURN: same id`);
      return;
    }

    const currentClone = clonedCardsRef.current;
    if (!currentClone) {
      console.log(`[handleDragOver] EARLY RETURN: no clonedCardsRef`);
      return;
    }

    console.log("[T2 DragOver]", {
      activeId: active?.id,
      overId: over?.id,
      overType: over?.data?.current?.type,
      overData: over?.data?.current,
    });

    const rawActiveId = normalizeDndId(activeId);
    const rawOverId = resolveRawOverId(over);

    console.log("[T3 Normalize]", {
      rawActiveId,
      rawOverId,
    });

    console.log(`[handleDragOver] rawActiveId=${rawActiveId} rawOverId=${rawOverId}`);

    const activeListId = findContainer(rawActiveId, currentClone);
    if (!activeListId) {
      console.log(`[handleDragOver] EARLY RETURN: activeListId not found in clone`);
      return;
    }

    const overListId = resolveOverListId(rawOverId, overType, currentClone);
    console.log(`[handleDragOver] activeListId=${activeListId} overListId=${overListId}`);
    if (!overListId) {
      console.log(`[handleDragOver] EARLY RETURN: overListId not resolved`);
      return;
    }
    if (activeListId === overListId) {
      console.log(`[handleDragOver] EARLY RETURN: same list`);
      return;
    }

    console.log("[T4 ResolveOver]", {
      activeListId,
      overListId,
      currentCloneKeys: Object.keys(currentClone || {}),
      targetClone: currentClone?.[overListId],
    });

    console.log(`[handleDragOver] currentClone keys=${Object.keys(currentClone)}`);
    console.log(`[handleDragOver] currentClone[overListId]=${JSON.stringify(currentClone[overListId])}`);

    // Cross-list only: preview move từ active list sang over list
    const sourceCards = currentClone[activeListId].filter(
      (id) => id !== rawActiveId,
    );
    const targetCards = [...(currentClone[overListId] || [])];
    const dropZone = getDropIndex(event, over, overType);

    let overIndex = targetCards.indexOf(rawOverId);
    if (overIndex >= 0 && dropZone === "bottom") {
      overIndex += 1;
    } else if (overIndex < 0) {
      overIndex = overType === "list"
        ? (dropZone === "bottom" ? targetCards.length : 0)
        : targetCards.length;
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

    const changed = !areCardsByListEqual(currentClone, nextClone);

    console.log("[OVER_TARGET]", {
      time: performance.now(),
      activeId,
      overId,
      overType,
      rawOverId,
      activeListId,
      overListId,
      nextCloneForOverList: nextClone[overListId],
    });

    console.log("[T5 Preview]", {
      changed,
      sourceCards,
      targetCards,
      nextTargetCards: nextClone?.[overListId],
    });

    console.log(`[handleDragOver] setClonedCards=${changed} overIndex=${overIndex} targetCards.length=${targetCards.length}`);
    if (changed) {
      setClonedCards(nextClone);
      clonedCardsRef.current = nextClone;
    }
  }, []);

  // ==========================================
  // 3. HANDLE DRAG END (Nhả chuột - Chốt hạ và đẩy về Zustand)
  // ==========================================
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      isDraggingRef.current = false;

      console.log(`[handleDragEnd] active=${active?.id} over=${over?.id} overData=${JSON.stringify(over?.data?.current)}`);

      console.log("[T6 DragEnd]", {
        activeId: active?.id,
        overId: over?.id,
        overType: over?.data?.current?.type,
        overData: over?.data?.current,
      });

      if (!active || !over) {
        console.log(`[handleDragEnd] CANCEL: active=${!!active} over=${!!over}`);
        handleDragCancel();
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const rawActiveId = normalizeDndId(activeId);
      const rawOverId = resolveRawOverId(over);
      const store = useBoardStore.getState();

      const isCardDrag = clonedCardsRef.current !== null;
      console.log(`[handleDragEnd] isCardDrag=${isCardDrag} rawActiveId=${rawActiveId} rawOverId=${rawOverId}`);

      if (isCardDrag) {
        const activeCard = store.cards.find((c) => String(c.id) === rawActiveId);
        if (!activeCard) {
          console.log(`[handleDragEnd] CANCEL: activeCard not found in store`);
          handleDragCancel();
          return;
        }

        const sourceListId = String(activeCard.listId);
        const overCard = store.cards.find((c) => String(c.id) === rawOverId);
        const resolvedOverType = over.data.current?.type ||
          (overCard
            ? "card"
            : lists.some((l) => String(l.id) === rawOverId)
              ? "list"
              : null);
        console.log(`[handleDragEnd] sourceListId=${sourceListId} resolvedOverType=${resolvedOverType} overCard=${overCard?.id}`);
        console.log(`[handleDragEnd] lists.includes(rawOverId)=${lists.some((l) => String(l.id) === rawOverId)}`);

        const dropZone = getDropIndex(event, over, resolvedOverType);
        const getSortedCardIds = (listId) =>
          [...store.cards]
            .filter((c) => String(c.listId) === String(listId))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((c) => String(c.id));

        let targetListId = sourceListId;
        let targetIndex = -1;

        if (resolvedOverType === "card") {
          if (overCard) {
            targetListId = String(overCard.listId);
            const targetCardIds = getSortedCardIds(targetListId).filter(
              (id) => id !== rawActiveId,
            );
            const overIdx = targetCardIds.indexOf(rawOverId);
            targetIndex = overIdx >= 0
              ? (dropZone === "bottom" ? overIdx + 1 : overIdx)
              : targetCardIds.length;
            console.log(`[handleDragEnd] card branch: targetListId=${targetListId} targetIndex=${targetIndex}`);
          } else {
            console.log(`[handleDragEnd] card branch: overCard falsy, targetIndex stays -1`);
          }
        } else if (resolvedOverType === "list") {
          targetListId = rawOverId;
          const targetCardIds = getSortedCardIds(targetListId).filter(
            (id) => id !== rawActiveId,
          );
          targetIndex = targetCardIds.length === 0
            ? 0
            : (dropZone === "bottom" ? targetCardIds.length : 0);
          console.log(`[handleDragEnd] list branch: targetListId=${targetListId} targetCardIds=${JSON.stringify(targetCardIds)} targetIndex=${targetIndex}`);
        } else {
          console.log(`[handleDragEnd] UNKNOWN resolvedOverType=${resolvedOverType} — targetIndex stays -1, no-op`);
        }

        console.log("[END_TARGET]", {
          time: performance.now(),
          activeId,
          overId,
          overType: over.data.current?.type,
          rawOverId,
          resolvedOverType,
          sourceListId,
          targetListId,
          targetIndex,
          previewAtEnd: clonedCardsRef.current,
        });

        const preview = clonedCardsRef.current;
        let previewListId = null;
        let previewIndex = -1;
        if (preview) {
          for (const [plId, cardIds] of Object.entries(preview)) {
            const idx = cardIds.indexOf(rawActiveId);
            if (idx !== -1) {
              previewListId = plId;
              previewIndex = idx;
              break;
            }
          }
        }
        console.log("[END_COMPARE]", {
          previewListId,
          previewIndex,
          finalTargetListId: targetListId,
          finalTargetIndex: targetIndex,
          match: previewListId === targetListId && previewIndex === targetIndex,
        });

        console.log("[T7 FinalTarget]", {
          resolvedOverType,
          rawActiveId,
          rawOverId,
          sourceListId,
          targetListId,
          targetIndex,
          dropZone,
        });

        const parsedCardId = isNaN(Number(rawActiveId))
          ? rawActiveId
          : Number(rawActiveId);
        const parsedListId = isNaN(Number(targetListId))
          ? targetListId
          : Number(targetListId);

        if (typeof targetIndex === "number" && targetIndex >= 0) {
          console.log("[T8 MoveCall]", {
            willCall: targetIndex >= 0,
            cardId: parsedCardId,
            targetListId: parsedListId,
            targetIndex,
          });
          console.log(`[handleDragEnd] CALLING moveCard cardId=${parsedCardId} targetListId=${parsedListId} targetIndex=${targetIndex}`);
          const expectedCardsByList = buildExpectedCardsByList(
            store.cards,
            sourceListId,
            targetListId,
            rawActiveId,
            targetIndex,
          );

          const affectedLists =
            sourceListId === targetListId
              ? {
                  [sourceListId]: expectedCardsByList[sourceListId] || EMPTY_ITEMS,
                }
              : {
                  [sourceListId]: expectedCardsByList[sourceListId] || EMPTY_ITEMS,
                  [targetListId]: expectedCardsByList[targetListId] || EMPTY_ITEMS,
                };

          pendingDropRef.current = { lists: affectedLists };
          if (!areCardsByListEqual(clonedCardsRef.current, expectedCardsByList)) {
            setClonedCards(expectedCardsByList);
          }
          clonedCardsRef.current = expectedCardsByList;
          store.moveCard(parsedCardId, parsedListId, targetIndex);
        } else {
          console.log(`[handleDragEnd] SKIP moveCard: targetIndex=${targetIndex} not >= 0`);
        }
      } else {
        console.log(`[handleDragEnd] list drag branch (not card drag)`);
        // List drag: chỉ chấp nhận over có type === "list"
        if (over.data.current?.type === "list" && rawActiveId !== rawOverId) {
          store.moveList(rawActiveId, rawOverId);
        } else if (over.data.current?.type === "card") {
          // closestCorners trả về card — tìm list cha của card đó
          const overCard = store.cards.find((c) => String(c.id) === rawOverId);
          if (overCard) {
            const parentListId = String(overCard.listId);
            if (parentListId !== rawActiveId) {
              store.moveList(rawActiveId, parentListId);
            }
          }
        }
        // over không phải list cũng không phải card → cancel (no-op)
      }

      setActiveItem(null);
      setActiveType(null);
      activeItemRef.current = null;
      if (!pendingDropRef.current) {
        setClonedCards(null);
        clonedCardsRef.current = null;
      }
    },
    [handleDragCancel, lists],
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
      <div className="board-columns" data-testid="board-columns">
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
            const rawListId = normalizeDndId(listId);
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
            data-testid="add-list-input"
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
