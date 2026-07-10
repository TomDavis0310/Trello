import { EMPTY_ITEMS } from "./constants";
import { getDropIndex, resolveCardDropTargetFromClone } from "./preview.helpers";

export function resolveCardOverCardTarget({
  event,
  over,
  active,
  overCard,
  rawActiveId,
  rawOverId,
  cards,
}) {
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

export function resolveCardDropTarget({
  event,
  active,
  over,
  rawActiveId,
  rawOverId,
  cards,
  lists,
  currentClone,
}) {
  const previewTarget = resolveCardDropTargetFromClone(
    rawActiveId,
    currentClone,
  );
  if (previewTarget) {
    return {
      targetListId: previewTarget.targetListId,
      targetIndex: previewTarget.targetIndex,
      overIdx: previewTarget.targetCards.indexOf(rawOverId),
      isBelow: null,
      targetCardCount: previewTarget.targetCards.length,
      usedPreviewTarget: true,
      debugBranch: "CARD_PREVIEW_TARGET",
    };
  }

  const overCard = cards.find((card) => String(card.id) === rawOverId);
  const resolvedOverType =
    over.data.current?.type ||
    (overCard
      ? "card"
      : lists.some((list) => String(list.id) === rawOverId)
        ? "list"
        : null);

  if (resolvedOverType === "card" && overCard) {
    const cardTarget = resolveCardOverCardTarget({
      event,
      over,
      active,
      overCard,
      rawActiveId,
      rawOverId,
      cards,
    });

    return {
      ...cardTarget,
      debugBranch:
        cardTarget.overIdx >= 0
          ? "CARD_OVER_CARD"
          : "CARD_OVER_CARD_FALLBACK",
    };
  }

  if (resolvedOverType === "list") {
    const targetListId = rawOverId;
    const targetCardIds = [...cards]
      .filter((card) => String(card.listId) === String(targetListId))
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((card) => String(card.id))
      .filter((id) => id !== rawActiveId);

    return {
      targetListId,
      targetIndex: targetCardIds.length === 0 ? 0 : targetCardIds.length,
      targetCardCount: targetCardIds.length,
      overIdx: -1,
      isBelow: null,
      usedPreviewTarget: false,
      debugBranch: "CARD_OVER_LIST",
    };
  }

  return null;
}

export function resolveCardDragEndPayload({
  event,
  active,
  over,
  rawActiveId,
  rawOverId,
  cards,
  lists,
  currentClone,
}) {
  const activeCard = cards.find(
    (card) => String(card.id) === String(rawActiveId),
  );
  if (!activeCard) {
    return {
      cancelReason: "ACTIVE_CARD_NOT_FOUND",
    };
  }

  const sourceListId = String(activeCard.listId);
  const cardDropTarget = resolveCardDropTarget({
    event,
    active,
    over,
    rawActiveId,
    rawOverId,
    cards,
    lists,
    currentClone,
  });

  if (!cardDropTarget) {
    return {
      cancelReason: "UNRESOLVED_TARGET",
      sourceListId,
      overType: over.data.current?.type ?? null,
    };
  }

  if (
    typeof cardDropTarget.targetIndex !== "number" ||
    cardDropTarget.targetIndex < 0
  ) {
    return {
      cancelReason: "INVALID_TARGET_INDEX",
      sourceListId,
      ...cardDropTarget,
    };
  }

  return {
    ...cardDropTarget,
    cancelReason: null,
    sourceListId,
    parsedCardId: isNaN(Number(rawActiveId))
      ? rawActiveId
      : Number(rawActiveId),
    parsedListId: isNaN(Number(cardDropTarget.targetListId))
      ? cardDropTarget.targetListId
      : Number(cardDropTarget.targetListId),
  };
}

export function buildExpectedCardsByList({
  currentCardsByList,
  rawActiveId,
  sourceListId,
  targetListId,
  targetIndex,
}) {
  const normalizedTargetIndex = Math.max(0, targetIndex);

  if (sourceListId === targetListId) {
    return {
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
    };
  }

  return {
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
}

export function buildPendingDropLists({
  expectedCardsByList,
  sourceListId,
  targetListId,
}) {
  if (sourceListId === targetListId) {
    return {
      [sourceListId]: expectedCardsByList[sourceListId] || EMPTY_ITEMS,
    };
  }

  return {
    [sourceListId]: expectedCardsByList[sourceListId] || EMPTY_ITEMS,
    [targetListId]: expectedCardsByList[targetListId] || EMPTY_ITEMS,
  };
}
