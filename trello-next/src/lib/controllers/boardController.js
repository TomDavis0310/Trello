import * as svc from "../services/boardService.js";
import * as db from "../data/mockData.js";

function ok(data, status = 200) {
  return { data, status };
}
function fail(err) {
  return { error: err.message, status: err.status || 500 };
}

function getUserId(headers) {
  const token = headers?.authorization?.replace("Bearer ", "");
  const user = db.getUserByToken(token);
  return user?.id;
}

export function getBoards(headers) {
  try {
    const userId = getUserId(headers);
    if (!userId) return { error: "Unauthorized", status: 401 };
    return ok(svc.getAll(userId));
  } catch (e) {
    return fail(e);
  }
}

export function getBoard(id) {
  try {
    return ok(svc.getById(id));
  } catch (e) {
    return fail(e);
  }
}

export function createBoard(body, headers) {
  try {
    const userId = getUserId(headers);
    if (!userId) return { error: "Unauthorized", status: 401 };
    return ok(svc.create(userId, body?.name), 201);
  } catch (e) {
    return fail(e);
  }
}

export function updateBoard(id, body) {
  try {
    return ok(svc.update(id, body));
  } catch (e) {
    return fail(e);
  }
}

export function deleteBoard(id) {
  try {
    return ok(svc.remove(id));
  } catch (e) {
    return fail(e);
  }
}
