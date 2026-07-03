import {
  EMPTY_ITEMS,
  areCardIdListsEqual,
  buildExpectedCardsByList,
  findContainer,
  getDropIndex,
  normalizeDndId,
  resolveOverListId,
  resolveRawOverId,
} from "./dragHelpers";

export function resolveActiveDragType({ explicitType, rawId, cards }) {
  if (explicitType) return explicitType;

  const isCard = cards.some((card) => String(card.id) === rawId);
  return isCard ? "card" : "list";
}

export function buildCardDragPreviewState({
  event,
  active,
  over,
  currentClone,
}) {
  const activeId = String(active.id);
  const overId = String(over.id);
  const overType = over.data.current?.type;

  if (!currentClone) return null;

  const rawActiveId = normalizeDndId(activeId);
  const rawOverId = resolveRawOverId(over);

  const activeListId = findContainer(rawActiveId, currentClone);
  if (!activeListId) return null;

  const initialSourceListId =
    active.data.current?.listId != null
      ? String(active.data.current.listId)
      : active.data.current?.card?.listId != null
        ? String(active.data.current.card.listId)
        : activeListId;
  const hasCrossedLists = activeListId !== initialSourceListId;

  const overListId = resolveOverListId(rawOverId, overType, currentClone);
  if (!overListId) return null;
  if (activeId === overId && !hasCrossedLists) return null;
  if (activeListId === overListId && !hasCrossedLists) return null;

  const sourceCards = currentClone[activeListId].filter((id) => id !== rawActiveId);
  const targetCards =
    activeListId === overListId
      ? [...sourceCards]
      : [...(currentClone[overListId] || [])];

  const isBelow = getDropIndex(event, over, "card", active) === "bottom";
  let overIndex = targetCards.indexOf(rawOverId);
  if (
    activeId === overId &&
    hasCrossedLists &&
    activeListId === overListId
  ) {
    const currentPreviewIndex =
      (currentClone[activeListId] || EMPTY_ITEMS).indexOf(rawActiveId);
    overIndex =
      currentPreviewIndex >= 0
        ? currentPreviewIndex + (isBelow ? 1 : 0)
        : targetCards.length;
  } else if (overIndex >= 0) {
    overIndex += isBelow ? 1 : 0;
  } else {
    overIndex = targetCards.length;
  }

  const reorderedTargetCards = [
    ...targetCards.slice(0, overIndex),
    rawActiveId,
    ...targetCards.slice(overIndex),
  ];
  const nextClone =
    activeListId === overListId
      ? {
          ...currentClone,
          [overListId]: reorderedTargetCards,
        }
      : {
          ...currentClone,
          [activeListId]: sourceCards,
          [overListId]: reorderedTargetCards,
        };

  return {
    rawActiveId,
    rawOverId,
    activeListId,
    overListId,
    overIndex,
    nextClone,
  };
}

export function getSortedCardIds(cards, listId) {
  return [...cards]
    .filter((card) => String(card.listId) === String(listId))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((card) => String(card.id));
}

export function resolveCardDragOverType({
  explicitType,
  overCard,
  rawOverId,
  lists,
}) {
  return (
    explicitType ||
    (overCard ? "card" : lists.some((list) => String(list.id) === rawOverId)
      ? "list"
      : null)
  );
}

export function resolveCardOverCardTarget({
  event,
  over,
  active,
  overCard,
  rawActiveId,
  rawOverId,
  cards,
  currentClone,
  sourceListId,
}) {
  if (currentClone) {
    const previewTargetListId = findContainer(rawActiveId, currentClone);
    const previewTargetCards = previewTargetListId
      ? currentClone[previewTargetListId] || EMPTY_ITEMS
      : EMPTY_ITEMS;
    const previewTargetIndex = previewTargetCards.indexOf(rawActiveId);

    if (
      previewTargetListId &&
      previewTargetListId !== sourceListId &&
      previewTargetIndex >= 0
    ) {
      const previewIsBelow =
        rawOverId === rawActiveId
          ? getDropIndex(event, over, "card", active) === "bottom"
          : null;
      const maxPreviewTargetIndex = previewTargetCards.length - 1;
      return {
        targetListId: previewTargetListId,
        targetIndex:
          previewIsBelow == null
            ? previewTargetIndex
            : Math.min(
                previewTargetIndex + (previewIsBelow ? 1 : 0),
                maxPreviewTargetIndex,
              ),
        overIdx: previewTargetCards.indexOf(rawOverId),
        isBelow: previewIsBelow,
        usedPreviewTarget: true,
      };
    }
  }

  const targetListId = String(overCard.listId);
  const targetCardIds = getSortedCardIds(cards, targetListId).filter(
    (id) => id !== rawActiveId,
  );
  const overIdx = targetCardIds.indexOf(rawOverId);

  if (overIdx >= 0) {
    const isBelow = getDropIndex(event, over, "card", active) === "bottom";
    return {
      targetListId,
      targetIndex: overIdx + (isBelow ? 1 : 0),
      overIdx,
      isBelow,
      usedPreviewTarget: false,
    };
  }

  return {
    targetListId,
    targetIndex: targetCardIds.length,
    overIdx,
    isBelow: null,
    usedPreviewTarget: false,
  };
}

export function resolveCardOverListTarget({
  cards,
  rawActiveId,
  targetListId,
}) {
  const targetCardIds = getSortedCardIds(cards, targetListId).filter(
    (id) => id !== rawActiveId,
  );

  return {
    targetCardCount: targetCardIds.length,
    targetIndex: targetCardIds.length === 0 ? 0 : targetCardIds.length,
  };
}

export function buildPendingDropState({
  cards,
  sourceListId,
  targetListId,
  rawActiveId,
  targetIndex,
}) {
  const expectedCardsByList = buildExpectedCardsByList(
    cards,
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

  return {
    expectedCardsByList,
    affectedLists,
  };
}

export function matchesPendingDropState({
  pendingDrop,
  currentStoreCardsByList,
}) {
  return Object.entries(pendingDrop.lists).every(([listId, expectedCardIds]) =>
    areCardIdListsEqual(
      currentStoreCardsByList[listId] || EMPTY_ITEMS,
      expectedCardIds,
    ),
  );
}
