import * as db from "../data/mockData.js";

export function getAll(userId) {
  return db.getBoardsByUser(userId);
}

export function getById(id) {
  const board = db.getBoardById(id);
  if (!board) throw Object.assign(new Error("Board not found"), { status: 404 });
  return board;
}

export function create(userId, name) {
  if (!name?.trim()) {
    throw Object.assign(new Error("Board name is required"), { status: 400 });
  }
  return db.createBoard(userId, name.trim());
}

export function update(id, data) {
  const board = db.updateBoard(id, data);
  if (!board) throw Object.assign(new Error("Board not found"), { status: 404 });
  return board;
}

export function remove(id) {
  if (!db.deleteBoard(id)) {
    throw Object.assign(new Error("Board not found"), { status: 404 });
  }
  return { message: "Board deleted" };
}
