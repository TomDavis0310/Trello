import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
} from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import {
  buildCardDragPreviewState,
  buildPendingDropState,
  matchesPendingDropState,
  resolveActiveDragType,
  resolveCardDragOverType,
  resolveCardOverCardTarget,
  resolveCardOverListTarget,
} from "./boardDragFlowHelpers";
import {
  buildCardsByList,
  normalizeDndId,
  resolveRawOverId,
  areCardsByListEqual,
} from "./dragHelpers";

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
      const type = resolveActiveDragType({
        explicitType: active.data.current?.type,
        rawId,
        cards: useBoardStore.getState().cards,
      });

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
        const activeCard = store.cards.find(
          (c) => String(c.id) === rawActiveId,
        );
        if (!activeCard) {
          handleDragCancel();
          return;
        }

        const sourceListId = String(activeCard.listId);
        const overCard = store.cards.find((c) => String(c.id) === rawOverId);
        const resolvedOverType = resolveCardDragOverType({
          explicitType: over.data.current?.type,
          overCard,
          rawOverId,
          lists,
        });

        let targetListId;
        let targetIndex;
        let debugBranch;

        // === CARD_OVER_CARD ===
        if (resolvedOverType === "card" && overCard) {
          const cardOverCardTarget = resolveCardOverCardTarget({
            event,
            over,
            active,
            overCard,
            rawActiveId,
            rawOverId,
            cards: store.cards,
            currentClone: clonedCardsRef.current,
            sourceListId,
          });

          targetListId = cardOverCardTarget.targetListId;
          targetIndex = cardOverCardTarget.targetIndex;
          console.log("[END_TARGET_INDEX]", {
            branch: "CARD_OVER_CARD",
            activeId: rawActiveId,
            rawOverId,
            sourceListId,
            targetListId,
            targetIndex,
            overIdx: cardOverCardTarget.overIdx,
            isBelow: cardOverCardTarget.isBelow,
            usedPreviewTarget: cardOverCardTarget.usedPreviewTarget,
          });
          if (cardOverCardTarget.overIdx >= 0) {
            debugBranch = "CARD_OVER_CARD";
            console.log(
              `[DnD] END_${debugBranch} | activeId=${rawActiveId} overId=${rawOverId} sourceListId=${sourceListId} targetListId=${targetListId} overIdx=${cardOverCardTarget.overIdx} targetIndex=${targetIndex} isBelow=${cardOverCardTarget.isBelow}`,
            );
          } else {
            debugBranch = "CARD_OVER_CARD_FALLBACK";
            console.log(
              `[DnD] END_${debugBranch} | activeId=${rawActiveId} overId=${rawOverId} targetListId=${targetListId} fallbackIndex=${targetIndex}`,
            );
          }
        }

        // === CARD_OVER_LIST / EMPTY_LIST ===
        else if (resolvedOverType === "list") {
          targetListId = rawOverId;
          const cardOverListTarget = resolveCardOverListTarget({
            cards: store.cards,
            rawActiveId,
            targetListId,
          });
          targetIndex = cardOverListTarget.targetIndex;
          console.log("[END_TARGET_INDEX]", {
            branch: "CARD_OVER_LIST",
            activeId: rawActiveId,
            rawOverId,
            sourceListId,
            targetListId,
            targetIndex,
            targetCardCount: cardOverListTarget.targetCardCount,
          });
          debugBranch = "CARD_OVER_LIST";
          console.log(
            `[DnD] END_${debugBranch} | activeId=${rawActiveId} targetListId=${targetListId} targetCardCount=${cardOverListTarget.targetCardCount} targetIndex=${targetIndex}`,
          );
        }

        // === CANCEL (unresolved) ===
        else {
          debugBranch = "CANCEL_UNRESOLVED";
          console.log(
            `[DnD] END_${debugBranch} | activeId=${rawActiveId} rawOverId=${rawOverId} resolvedOverType=${resolvedOverType}`,
          );
          handleDragCancel();
          return;
        }

        const parsedCardId = isNaN(Number(rawActiveId))
          ? rawActiveId
          : Number(rawActiveId);
        const parsedListId = isNaN(Number(targetListId))
          ? targetListId
          : Number(targetListId);

        if (typeof targetIndex === "number" && targetIndex >= 0) {
          const { expectedCardsByList, affectedLists } = buildPendingDropState({
            cards: store.cards,
            sourceListId,
            targetListId,
            rawActiveId,
            targetIndex,
          });

          pendingDropRef.current = { lists: affectedLists };
          if (
            !areCardsByListEqual(clonedCardsRef.current, expectedCardsByList)
          ) {
            setClonedCards(expectedCardsByList);
          }
          clonedCardsRef.current = expectedCardsByList;
          console.log("[DND_END_MOVE_API]", {
            cardId: parsedCardId,
            targetListId: parsedListId,
            targetIndex,
          });
          store.moveCard(parsedCardId, parsedListId, targetIndex);
        } else {
          handleDragCancel();
          return;
        }
      } else {
        if (over.data.current?.type === "list" && rawActiveId !== rawOverId) {
          store.moveList(rawActiveId, rawOverId);
        } else if (over.data.current?.type === "card") {
          const overCard = store.cards.find((c) => String(c.id) === rawOverId);
          if (overCard) {
            const parentListId = String(overCard.listId);
            if (parentListId !== rawActiveId) {
              store.moveList(rawActiveId, parentListId);
            }
          }
        }
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

  useEffect(() => {
    if (!clonedCards) return;

    const pendingDrop = pendingDropRef.current;
    if (!pendingDrop) return;

    const currentStoreCardsByList = buildCardsByList(allCards);
    const matchesPendingDrop = matchesPendingDropState({
      pendingDrop,
      currentStoreCardsByList,
    });

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
