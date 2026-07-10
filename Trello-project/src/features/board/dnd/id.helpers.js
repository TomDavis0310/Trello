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
