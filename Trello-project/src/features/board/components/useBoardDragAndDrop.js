import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  useSensors,
  useSensor,
  PointerSensor,
} from "@dnd-kit/core";
import useBoardStore from "../../../store/boardStore";
import {
  EMPTY_ITEMS,
  buildCardsByList,
  normalizeDndId,
  resolveRawOverId,
  areCardsByListEqual,
  areCardIdListsEqual,
  findContainer,
  resolveOverListId,
  getDropIndex,
  buildExpectedCardsByList,
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
      let type = active.data.current?.type;

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

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const overType = over.data.current?.type;

    if (activeId === overId) return;

    const currentClone = clonedCardsRef.current;
    if (!currentClone) return;

    const rawActiveId = normalizeDndId(activeId);
    const rawOverId = resolveRawOverId(over);

    const activeListId = findContainer(rawActiveId, currentClone);
    if (!activeListId) return;

    const overListId = resolveOverListId(rawOverId, overType, currentClone);
    if (!overListId) return;
    if (activeListId === overListId) return;

    const sourceCards = currentClone[activeListId].filter(
      (id) => id !== rawActiveId,
    );
    const targetCards = [...(currentClone[overListId] || [])];

    let overIndex = targetCards.indexOf(rawOverId);
    if (overIndex >= 0) {
      const isBelow =
        getDropIndex(event, over, "card", active) === "bottom";
      overIndex += isBelow ? 1 : 0;
    } else {
      overIndex = targetCards.length;
    }

    console.log(
      `[DnD] OVER_TARGET | activeId=${rawActiveId} overId=${rawOverId} sourceListId=${activeListId} targetListId=${overListId} overIndex=${overIndex} branch=CROSS_LIST_CARD`,
    );

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

    if (changed) {
      setClonedCards(nextClone);
      clonedCardsRef.current = nextClone;
    }
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
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
            : lists.some((l) => String(l.id) === rawOverId)
              ? "list"
              : null);

        const getSortedCardIds = (listId) =>
          [...store.cards]
            .filter((c) => String(c.listId) === String(listId))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((c) => String(c.id));

        let targetListId;
        let targetIndex;
        let debugBranch;

        // === CARD_OVER_CARD ===
        if (resolvedOverType === "card" && overCard) {
          targetListId = String(overCard.listId);
          const targetCardIds = getSortedCardIds(targetListId).filter(
            (id) => id !== rawActiveId,
          );
          const overIdx = targetCardIds.indexOf(rawOverId);
          if (overIdx >= 0) {
            const isBelow =
              getDropIndex(event, over, "card", active) === "bottom";
            targetIndex = overIdx + (isBelow ? 1 : 0);
            debugBranch = "CARD_OVER_CARD";
            console.log(
              `[DnD] END_${debugBranch} | activeId=${rawActiveId} overId=${rawOverId} sourceListId=${sourceListId} targetListId=${targetListId} overIdx=${overIdx} targetIndex=${targetIndex} isBelow=${isBelow}`,
            );
          } else {
            targetIndex = targetCardIds.length;
            debugBranch = "CARD_OVER_CARD_FALLBACK";
            console.log(
              `[DnD] END_${debugBranch} | activeId=${rawActiveId} overId=${rawOverId} targetListId=${targetListId} fallbackIndex=${targetIndex}`,
            );
          }
        }

        // === CARD_OVER_LIST / EMPTY_LIST ===
        else if (resolvedOverType === "list") {
          targetListId = rawOverId;
          const targetCardIds = getSortedCardIds(targetListId).filter(
            (id) => id !== rawActiveId,
          );
          targetIndex =
            targetCardIds.length === 0 ? 0 : targetCardIds.length;
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
