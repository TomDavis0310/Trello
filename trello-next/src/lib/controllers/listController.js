import * as svc from "../services/listService.js";

function ok(data, status = 200) {
  return { data, status };
}
function fail(err) {
  return { error: err.message, status: err.status || 500 };
}

export function getLists() {
  return ok(svc.getAll());
}

export function getList(id) {
  try {
    return ok(svc.getById(id));
  } catch (e) {
    return fail(e);
  }
}

export function createList(boardId, body) {
  try {
    return ok(svc.create(boardId, body?.name), 201);
  } catch (e) {
    return fail(e);
  }
}

export function updateList(id, body) {
  try {
    return ok(svc.update(id, body));
  } catch (e) {
    return fail(e);
  }
}

export function deleteList(id) {
  try {
    return ok(svc.remove(id));
  } catch (e) {
    return fail(e);
  }
}

export function reorderList(listId, body) {
  try {
    return ok(svc.reorder(listId, body?.targetListId));
  } catch (e) {
    return fail(e);
  }
}
