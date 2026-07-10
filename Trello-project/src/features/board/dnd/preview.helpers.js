import { EMPTY_ITEMS } from "./constants";
import { findContainer } from "./cardsByList.helpers";
import { normalizeDndId, resolveRawOverId } from "./id.helpers";

export function resolveCardDropTargetFromClone(rawActiveId, currentClone) {
  if (!currentClone) return null;

  const normalizedActiveId = String(rawActiveId);
  const targetListId = findContainer(normalizedActiveId, currentClone);
  if (!targetListId) return null;

  const targetCards = currentClone[targetListId] || EMPTY_ITEMS;
  const targetIndex = targetCards.indexOf(normalizedActiveId);
  if (targetIndex < 0) return null;

  return {
    targetListId,
    targetIndex,
    targetCards,
  };
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

  const sourceCards = (currentClone[activeListId] || EMPTY_ITEMS).filter(
    (id) => id !== rawActiveId,
  );
  const targetCards =
    activeListId === overListId
      ? [...sourceCards]
      : [...(currentClone[overListId] || [])];

  const isBelow = getDropIndex(event, over, "card", active) === "bottom";
  let overIndex = targetCards.indexOf(rawOverId);
  if (activeId === overId && activeListId === overListId) {
    const currentPreviewIndex =
      (currentClone[activeListId] || EMPTY_ITEMS).indexOf(rawActiveId);
    overIndex =
      currentPreviewIndex >= 0
        ? currentPreviewIndex + (hasCrossedLists ? 0 : (isBelow ? 1 : 0))
        : targetCards.length;
  } else if (overIndex >= 0) {
    overIndex += isBelow ? 1 : 0;
  } else {
    overIndex = targetCards.length;
  }

  const insertionIndex = Math.min(
    Math.max(overIndex, 0),
    targetCards.length,
  );

  const reorderedTargetCards = [
    ...targetCards.slice(0, insertionIndex),
    rawActiveId,
    ...targetCards.slice(insertionIndex),
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
    overIndex: insertionIndex,
    nextClone,
  };
}
