import * as db from "../data/mockData.js";

export function getAll() {
  return db.getAllLists();
}

export function getById(id) {
  const list = db.getListById(id);
  if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
  return list;
}

export function create(boardId, name) {
  if (!name?.trim()) {
    throw Object.assign(new Error("List name is required"), { status: 400 });
  }
  return db.createList(boardId, name.trim());
}

export function update(id, data) {
  if (!data || Object.keys(data).length === 0) {
    throw Object.assign(new Error("No data to update"), { status: 400 });
  }
  const list = db.updateList(id, data);
  if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
  return list;
}

export function remove(id) {
  if (!db.deleteList(id)) {
    throw Object.assign(new Error("List not found"), { status: 404 });
  }
  return { message: "List deleted" };
}

export function reorder(listId, targetListId) {
  if (!db.reorderList(listId, targetListId)) {
    throw Object.assign(new Error("Reorder failed"), { status: 400 });
  }
  return db.getAllLists();
}
