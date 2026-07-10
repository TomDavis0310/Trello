import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
} from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import { EMPTY_ITEMS } from "./constants";
import {
  buildCardsByList,
  areCardsByListEqual,
} from "./cardsByList.helpers";
import { normalizeDndId, resolveRawOverId } from "./id.helpers";
import { buildCardDragPreviewState } from "./preview.helpers";
import {
  buildExpectedCardsByList,
  buildPendingDropLists,
  resolveCardDragEndPayload,
} from "./dragEnd.helpers";

export default function useBoardDragAndDrop({ lists, cardMap }) {
  const allCards = useBoardStore((s) => s.cards);

  const [activeItem, setActiveItem] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [clonedCards, setClonedCards] = useState(null);

  const clonedCardsRef = useRef(null);
  const activeItemRef = useRef(null);
  const isDraggingRef = useRef(false);
  const pendingDropRef = useRef(null);

  const displayCardsByList = useMemo(() => {
    if (clonedCards) return clonedCards;
    return buildCardsByList(allCards);
  }, [allCards, clonedCards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveItem(null);
    setActiveType(null);
    activeItemRef.current = null;
    setClonedCards(null);
    clonedCardsRef.current = null;
    pendingDropRef.current = null;
  }, []);

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      isDraggingRef.current = true;

      const activeId = String(active.id);
      const rawId = normalizeDndId(activeId);
      const type =
        active.data.current?.type ||
        (useBoardStore
          .getState()
          .cards.some((card) => String(card.id) === rawId)
          ? "card"
          : "list");

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

  const handleDragOver = useCallback((event) => {
    if (!isDraggingRef.current) return;

    const { active, over } = event;
    if (!active || !over) return;

    const previewState = buildCardDragPreviewState({
      event,
      active,
      over,
      currentClone: clonedCardsRef.current,
    });
    if (!previewState) return;

    const changed = !areCardsByListEqual(
      clonedCardsRef.current,
      previewState.nextClone,
    );

    console.log("[DND_OVER_PREVIEW]", {
      activeId: previewState.rawActiveId,
      overId: previewState.rawOverId,
      sourceListId: previewState.activeListId,
      targetListId: previewState.overListId,
      overIndex: previewState.overIndex,
      changed,
    });

    if (changed) {
      setClonedCards(previewState.nextClone);
      clonedCardsRef.current = previewState.nextClone;
    }
  }, []);

  const cleanupCompletedDrag = useCallback(() => {
    setActiveItem(null);
    setActiveType(null);
    activeItemRef.current = null;
    if (!pendingDropRef.current) {
      setClonedCards(null);
      clonedCardsRef.current = null;
    }
  }, []);

  const commitCardMove = useCallback(
    ({
      store,
      rawActiveId,
      sourceListId,
      targetListId,
      targetIndex,
      parsedCardId,
      parsedListId,
    }) => {
      const currentCardsByList = buildCardsByList(store.cards);
      const expectedCardsByList = buildExpectedCardsByList({
        currentCardsByList,
        rawActiveId,
        sourceListId,
        targetListId,
        targetIndex,
      });
      const affectedLists = buildPendingDropLists({
        expectedCardsByList,
        sourceListId,
        targetListId,
      });

      pendingDropRef.current = { lists: affectedLists };
      if (!areCardsByListEqual(clonedCardsRef.current, expectedCardsByList)) {
        setClonedCards(expectedCardsByList);
      }
      clonedCardsRef.current = expectedCardsByList;

      console.log("[DND_END_MOVE_API]", {
        cardId: parsedCardId,
        targetListId: parsedListId,
        targetIndex,
      });
      store.moveCard(parsedCardId, parsedListId, targetIndex);
    },
    [],
  );

  const handleCardDragEnd = useCallback(
    ({ event, active, over, rawActiveId, rawOverId, store }) => {
      const cardDragEndPayload = resolveCardDragEndPayload({
        event,
        active,
        over,
        rawActiveId,
        rawOverId,
        cards: store.cards,
        lists,
        currentClone: clonedCardsRef.current,
      });

      if (cardDragEndPayload.cancelReason === "ACTIVE_CARD_NOT_FOUND") {
        console.log("[DnD] END_CANCEL_ACTIVE_CARD_NOT_FOUND", {
          activeId: rawActiveId,
        });
        handleDragCancel();
        return false;
      }

      if (cardDragEndPayload.cancelReason === "UNRESOLVED_TARGET") {
        console.log("[DnD] END_CANCEL_UNRESOLVED", {
          activeId: rawActiveId,
          rawOverId,
          overType: cardDragEndPayload.overType,
        });
        handleDragCancel();
        return false;
      }

      if (cardDragEndPayload.cancelReason === "INVALID_TARGET_INDEX") {
        console.log("[DnD] END_CANCEL_INVALID_TARGET_INDEX", {
          activeId: rawActiveId,
          rawOverId,
          sourceListId: cardDragEndPayload.sourceListId,
          targetListId: cardDragEndPayload.targetListId ?? null,
          targetIndex: cardDragEndPayload.targetIndex ?? null,
          branch: cardDragEndPayload.debugBranch ?? null,
        });
        handleDragCancel();
        return false;
      }

      const {
        sourceListId,
        targetListId,
        targetIndex,
        debugBranch,
        usedPreviewTarget,
        overIdx,
        isBelow,
        targetCardCount,
        parsedCardId,
        parsedListId,
      } = cardDragEndPayload;

      console.log("[DnD] END_CARD_TARGET", {
        branch: debugBranch,
        activeId: rawActiveId,
        overId: rawOverId,
        sourceListId,
        targetListId,
        targetIndex,
        overIdx,
        isBelow,
        targetCardCount,
        usedPreviewTarget,
      });

      commitCardMove({
        store,
        rawActiveId,
        sourceListId,
        targetListId,
        targetIndex,
        parsedCardId,
        parsedListId,
      });

      return true;
    },
    [commitCardMove, handleDragCancel, lists],
  );

  const handleListDragEnd = useCallback(
    ({ over, rawActiveId, rawOverId, store }) => {
      if (over.data.current?.type === "list" && rawActiveId !== rawOverId) {
        store.moveList(rawActiveId, rawOverId);
        return;
      }

      if (over.data.current?.type !== "card") return;

      const overCard = store.cards.find((c) => String(c.id) === rawOverId);
      if (!overCard) return;

      const parentListId = String(overCard.listId);
      if (parentListId !== rawActiveId) {
        store.moveList(rawActiveId, parentListId);
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event) => {
      if (!isDraggingRef.current) return;

      const { active, over } = event;
      isDraggingRef.current = false;

      if (!active || !over) {
        handleDragCancel();
        return;
      }

      const activeId = String(active.id);
      const rawActiveId = normalizeDndId(activeId);
      const rawOverId = resolveRawOverId(over);
      const store = useBoardStore.getState();

      const isCardDrag = clonedCardsRef.current !== null;

      if (isCardDrag) {
        const didHandleCardDrag = handleCardDragEnd({
          event,
          active,
          over,
          rawActiveId,
          rawOverId,
          store,
        });
        if (!didHandleCardDrag) {
          return;
        }
      } else {
        handleListDragEnd({ over, rawActiveId, rawOverId, store });
      }

      cleanupCompletedDrag();
    },
    [
      cleanupCompletedDrag,
      handleCardDragEnd,
      handleDragCancel,
      handleListDragEnd,
    ],
  );

  useEffect(() => {
    if (!clonedCards) return;

    const pendingDrop = pendingDropRef.current;
    if (!pendingDrop) return;

    const currentStoreCardsByList = buildCardsByList(allCards);
    const matchesPendingDrop = Object.entries(pendingDrop.lists).every(
      ([listId, expectedCardIds]) => {
        const currentCardIds =
          currentStoreCardsByList[listId] || EMPTY_ITEMS;
        if (currentCardIds.length !== expectedCardIds.length) return false;

        for (let index = 0; index < currentCardIds.length; index += 1) {
          if (currentCardIds[index] !== expectedCardIds[index]) return false;
        }

        return true;
      },
    );

    if (!matchesPendingDrop) return;

    setClonedCards(null);
    clonedCardsRef.current = null;
    pendingDropRef.current = null;
  }, [allCards, clonedCards]);

  return {
    activeItem,
    activeType,
    sensors,
    displayCardsByList,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
