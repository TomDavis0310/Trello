export const EMPTY_ITEMS = [];

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

export function buildListIds(lists) {
  return lists.map((l) => `list-${l.id}`);
}

export function buildCardMap(cards) {
  const map = {};
  cards.forEach((c) => {
    map[`card-${c.id}`] = c;
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

export function areCardIdListsEqual(a = EMPTY_ITEMS, b = EMPTY_ITEMS) {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
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

export function resolveOverListId(rawOverId, overType, cardStructure) {
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
  const dropRect = getDropRect(over, overType);

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

export function buildExpectedCardsByList(
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
