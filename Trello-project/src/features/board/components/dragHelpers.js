const EMPTY_ITEMS = [];

export function buildCardsByList(cards) {
  const map = {};
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  sorted.forEach((c) => {
    const key = String(c.listId);
    if (!map[key]) map[key] = [];
    map[key].push(String(c.id));
  });
  return map;
}

export function normalizeDndId(id) {
  return String(id).replace(/^(?:list-drop-|card-|list-)/, "");
}

export function resolveRawOverId(over) {
  const overType = over?.data?.current?.type;
  const overListId = over?.data?.current?.listId;

  if (overType === "list" && overListId != null) {
    return String(overListId);
  }

  return normalizeDndId(over?.id ?? "");
}

export function areCardsByListEqual(a, b) {
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

export function findContainer(cardId, cardStructure) {
  for (const listId of Object.keys(cardStructure)) {
    if (cardStructure[listId].includes(String(cardId))) {
      return listId;
    }
  }
  return null;
}

export function getDropIndex(
  event,
  over,
  overType = over?.data?.current?.type,
  active = null,
) {
  const cursorY =
    typeof event.activatorEvent?.clientY === "number"
      ? event.activatorEvent.clientY + (event.delta?.y ?? 0)
      : null;
  const currentRect = over?.rect?.current;
  const dropRect =
    overType === "card" || overType === "list"
      ? currentRect?.translated ||
        currentRect?.initial ||
        over?.rect?.translated ||
        over?.rect?.initial ||
        over?.rect
      : currentRect?.translated ||
        currentRect?.initial ||
        over?.rect?.translated ||
        over?.rect?.initial ||
        over?.rect;

  if (
    cursorY != null &&
    dropRect?.top != null &&
    dropRect?.height != null &&
    dropRect.height > 0
  ) {
    return cursorY > dropRect.top + dropRect.height / 2 ? "bottom" : "top";
  }

  if (active && over) {
    const activeRect =
      active.rect?.current?.translated || active.rect?.current?.initial;
    const overRect =
      over.rect?.current?.translated || over.rect?.current?.initial;

    if (
      activeRect?.top != null &&
      activeRect?.height != null &&
      overRect?.top != null &&
      overRect?.height != null
    ) {
      const activeCenterY = activeRect.top + activeRect.height / 2;
      const overMidpointY = overRect.top + overRect.height / 2;
      return activeCenterY > overMidpointY ? "bottom" : "top";
    }
  }

  return "top";
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

  const overListId = (() => {
    const containingListId = findContainer(rawOverId, currentClone);
    if (containingListId) return containingListId;
    if (currentClone[rawOverId] || overType === "list") return rawOverId;
    return null;
  })();

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
  const targetCardIds = [...cards]
    .filter((card) => String(card.listId) === targetListId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((card) => String(card.id))
    .filter((id) => id !== rawActiveId);
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
