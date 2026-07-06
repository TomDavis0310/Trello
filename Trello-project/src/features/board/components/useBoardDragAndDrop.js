import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
} from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import {
  buildCardsByList,
  buildCardDragPreviewState,
  normalizeDndId,
  resolveRawOverId,
  areCardsByListEqual,
  resolveCardOverCardTarget,
} from "./dragHelpers";

export default function useBoardDragAndDrop({ lists, cardMap }) {
  const EMPTY_ITEMS = [];
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
        const resolvedOverType =
          over.data.current?.type ||
          (overCard
            ? "card"
            : lists.some((list) => String(list.id) === rawOverId)
              ? "list"
              : null);

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
          const targetCardIds = [...store.cards]
            .filter((card) => String(card.listId) === String(targetListId))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((card) => String(card.id))
            .filter((id) => id !== rawActiveId);
          targetIndex = targetCardIds.length === 0 ? 0 : targetCardIds.length;
          debugBranch = "CARD_OVER_LIST";
          console.log(
            `[DnD] END_${debugBranch} | activeId=${rawActiveId} targetListId=${targetListId} targetCardCount=${targetCardIds.length} targetIndex=${targetIndex}`,
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
          const currentCardsByList = buildCardsByList(store.cards);
          const normalizedTargetIndex = Math.max(0, targetIndex);

          const expectedCardsByList =
            sourceListId === targetListId
              ? {
                  ...currentCardsByList,
                  [sourceListId]: (() => {
                    const sameListCards = (
                      currentCardsByList[sourceListId] || EMPTY_ITEMS
                    ).filter((id) => id !== rawActiveId);
                    sameListCards.splice(
                      Math.min(normalizedTargetIndex, sameListCards.length),
                      0,
                      rawActiveId,
                    );
                    return sameListCards;
                  })(),
                }
              : {
                  ...currentCardsByList,
                  [sourceListId]: (
                    currentCardsByList[sourceListId] || EMPTY_ITEMS
                  ).filter((id) => id !== rawActiveId),
                  [targetListId]: (() => {
                    const targetCards = (
                      currentCardsByList[targetListId] || EMPTY_ITEMS
                    ).filter((id) => id !== rawActiveId);
                    targetCards.splice(
                      Math.min(normalizedTargetIndex, targetCards.length),
                      0,
                      rawActiveId,
                    );
                    return targetCards;
                  })(),
                };

          const affectedLists =
            sourceListId === targetListId
              ? {
                  [sourceListId]:
                    expectedCardsByList[sourceListId] || EMPTY_ITEMS,
                }
              : {
                  [sourceListId]:
                    expectedCardsByList[sourceListId] || EMPTY_ITEMS,
                  [targetListId]:
                    expectedCardsByList[targetListId] || EMPTY_ITEMS,
                };

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
