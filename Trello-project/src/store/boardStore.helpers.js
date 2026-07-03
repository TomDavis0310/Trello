export function buildOptimisticCardMove({
  cards,
  cardId,
  targetListId,
  targetIndex,
}) {
  const cid = String(cardId);
  const tlid = String(targetListId);

  const card = cards.find((entry) => String(entry.id) === cid);
  if (!card) return null;

  const sourceListId = String(card.listId);
  const sourceCardsBefore = cards.filter(
    (entry) => String(entry.listId) === sourceListId,
  );
  const targetCardsBefore = cards.filter(
    (entry) => String(entry.listId) === tlid,
  );

  const updatedCard = { ...card, listId: targetListId };
  const otherCards = cards.filter((entry) => String(entry.id) !== cid);
  const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
  const normalizePositions = (entries) =>
    entries.map((entry, index) => ({ ...entry, position: index }));
  const clampIndex = (index, length) => Math.max(0, Math.min(index, length));

  let nextCards;
  let nextTargetListCardsBeforeSplice = null;

  if (sourceListId === tlid) {
    const reorderedListCards = otherCards
      .filter((entry) => String(entry.listId) === sourceListId)
      .sort(byPosition);

    reorderedListCards.splice(
      clampIndex(targetIndex, reorderedListCards.length),
      0,
      updatedCard,
    );

    const normalizedListCards = normalizePositions(reorderedListCards);
    const untouchedCards = otherCards.filter(
      (entry) => String(entry.listId) !== sourceListId,
    );

    nextCards = [...untouchedCards, ...normalizedListCards];
  } else {
    const nextSourceListCards = normalizePositions(
      otherCards
        .filter((entry) => String(entry.listId) === sourceListId)
        .sort(byPosition),
    );

    nextTargetListCardsBeforeSplice = otherCards
      .filter((entry) => String(entry.listId) === tlid)
      .sort(byPosition);

    const nextTargetListCards = [...nextTargetListCardsBeforeSplice];
    nextTargetListCards.splice(
      clampIndex(targetIndex, nextTargetListCards.length),
      0,
      updatedCard,
    );

    const normalizedTargetListCards = normalizePositions(nextTargetListCards);
    const untouchedCards = otherCards.filter((entry) => {
      const listId = String(entry.listId);
      return listId !== sourceListId && listId !== tlid;
    });

    nextCards = [
      ...untouchedCards,
      ...nextSourceListCards,
      ...normalizedTargetListCards,
    ];
  }

  return {
    sourceListId,
    sourceCardsBefore,
    targetCardsBefore,
    nextTargetListCardsBeforeSplice,
    nextCards,
  };
}

export function applyMoveCardResponse({
  cards,
  response,
  cardId,
  targetListId,
}) {
  if (response && typeof response === "object") {
    if (Array.isArray(response.sourceCards)) {
      const srcId = String(response.sourceListId);
      const tgtId = String(response.targetListId);
      const idsToReplace = new Set([srcId, tgtId]);
      const otherCards = cards.filter(
        (entry) => !idsToReplace.has(String(entry.listId)),
      );

      return {
        cards: [
          ...otherCards,
          ...response.sourceCards,
          ...(srcId !== tgtId ? response.targetCards : []),
        ],
        shouldLogUnknownFormat: false,
      };
    }

    if (
      "id" in response &&
      "listId" in response &&
      "position" in response
    ) {
      const updatedId = String(response.id);
      return {
        cards: cards.map((entry) =>
          String(entry.id) === updatedId ? { ...entry, ...response } : entry,
        ),
        shouldLogUnknownFormat: false,
      };
    }
  }

  const cid = String(cardId);
  const updatedCard = cards.find((entry) => String(entry.id) === cid);

  return {
    cards: updatedCard
      ? cards.map((entry) =>
          String(entry.id) === cid
            ? { ...entry, listId: targetListId }
            : entry,
        )
      : cards,
    shouldLogUnknownFormat: true,
  };
}
