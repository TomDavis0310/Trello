import * as db from "../data/mockData.js";

export function getById(id) {
  const card = db.getCardById(id);
  if (!card) throw Object.assign(new Error("Card not found"), { status: 404 });
  return card;
}

export function create(listId, title) {
  if (!title?.trim()) {
    throw Object.assign(new Error("Card title is required"), { status: 400 });
  }
  const list = db.getListById(listId);
  if (!list) throw Object.assign(new Error("List not found"), { status: 404 });
  return db.createCard(listId, title.trim());
}

export function update(id, data) {
  if (!data || Object.keys(data).length === 0) {
    throw Object.assign(new Error("No data to update"), { status: 400 });
  }
  const card = db.updateCard(id, data);
  if (!card) throw Object.assign(new Error("Card not found"), { status: 404 });
  return card;
}

export function remove(id) {
  if (!db.deleteCard(id)) {
    throw Object.assign(new Error("Card not found"), { status: 404 });
  }
  return { message: "Card deleted" };
}

export function move(cardId, targetListId) {
  const card = db.moveCard(cardId, targetListId);
  if (!card) throw Object.assign(new Error("Card not found"), { status: 404 });
  return card;
}

export function addComment(cardId, text, author) {
  const comment = db.addComment(cardId, text, author || "Anonymous");
  if (!comment)
    throw Object.assign(new Error("Card not found"), { status: 404 });
  return comment;
}

export function removeComment(cardId, commentId) {
  const ok = db.deleteComment(cardId, commentId);
  if (!ok)
    throw Object.assign(new Error("Card or comment not found"), {
      status: 404,
    });
  return { message: "Comment deleted" };
}

export function addLabel(cardId, label) {
  const card = db.getCardById(cardId);
  if (!card) throw Object.assign(new Error("Card not found"), { status: 404 });
  return db.addLabel(cardId, label);
}

export function removeLabel(cardId, labelId) {
  const ok = db.removeLabel(cardId, labelId);
  if (!ok)
    throw Object.assign(new Error("Card or label not found"), { status: 404 });
  return { message: "Label removed" };
}

export function setDueDate(cardId, dateString) {
  const card = db.getCardById(cardId);
  if (!card) throw Object.assign(new Error("Card not found"), { status: 404 });
  db.updateCard(cardId, { dueDate: dateString || null });
  return db.getCardById(cardId);
}
