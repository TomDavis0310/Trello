import * as svc from "../services/cardService.js";

function ok(data, status = 200) {
  return { data, status };
}
function fail(err) {
  return { error: err.message, status: err.status || 500 };
}

export function getCard(id) {
  try {
    return ok(svc.getById(id));
  } catch (e) {
    return fail(e);
  }
}

export function createCard(body) {
  try {
    return ok(svc.create(body?.listId, body?.title), 201);
  } catch (e) {
    return fail(e);
  }
}

export function updateCard(id, body) {
  try {
    return ok(svc.update(id, body));
  } catch (e) {
    return fail(e);
  }
}

export function deleteCard(id) {
  try {
    return ok(svc.remove(id));
  } catch (e) {
    return fail(e);
  }
}

export function moveCard(body) {
  try {
    return ok(svc.move(body?.cardId, body?.targetListId));
  } catch (e) {
    return fail(e);
  }
}

export function addComment(cardId, body) {
  try {
    return ok(svc.addComment(cardId, body?.text, body?.author), 201);
  } catch (e) {
    return fail(e);
  }
}

export function deleteComment(cardId, commentId) {
  try {
    return ok(svc.removeComment(cardId, commentId));
  } catch (e) {
    return fail(e);
  }
}

export function addLabel(cardId, body) {
  try {
    return ok(svc.addLabel(cardId, { color: body?.color, text: body?.text }), 201);
  } catch (e) {
    return fail(e);
  }
}

export function removeLabel(cardId, labelId) {
  try {
    return ok(svc.removeLabel(cardId, labelId));
  } catch (e) {
    return fail(e);
  }
}

export function setDueDate(cardId, body) {
  try {
    return ok(svc.setDueDate(cardId, body?.dueDate));
  } catch (e) {
    return fail(e);
  }
}
