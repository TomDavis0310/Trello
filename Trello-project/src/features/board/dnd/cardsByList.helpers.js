import { EMPTY_ITEMS } from "./constants";

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
