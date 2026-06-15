let nextId = 1;
export const genId = () => nextId++;

// ============= USERS & SESSIONS =============

const users = [];
const sessions = {};

export function createUser(email, password, name) {
  const user = { id: genId(), email, password, name: name || email.split("@")[0] };
  users.push(user);
  const { password: _, ...safe } = user;
  return safe;
}

export function findUserByEmail(email) {
  return users.find((u) => u.email === email) || null;
}

export function findUserById(id) {
  return users.find((u) => u.id === id) || null;
}

export function createSession(userId) {
  const token = "tok_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  sessions[token] = userId;
  return token;
}

export function deleteSession(token) {
  delete sessions[token];
}

export function getUserByToken(token) {
  const userId = sessions[token];
  if (!userId) return null;
  return findUserById(userId);
}

// Seed default demo user
createUser("demo@trello.com", "123456", "Demo");

// ============= BOARDS =============

const boards = [];

export function createBoard(userId, name) {
  const board = { id: genId(), userId, name, createdAt: Date.now() };
  boards.push(board);
  ["Todo", "In Progress", "Review", "Done"].forEach((n, i) => {
    const list = { id: genId(), boardId: board.id, name: n, order: i };
    lists.push(list);
  });
  return board;
}

export function getBoardsByUser(userId) {
  return boards.filter((b) => b.userId === userId);
}

export function getBoardById(id) {
  return boards.find((b) => b.id === id) || null;
}

export function updateBoard(id, data) {
  const idx = boards.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  boards[idx] = { ...boards[idx], ...data };
  return boards[idx];
}

export function deleteBoard(id) {
  const idx = boards.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  boards.splice(idx, 1);
  const boardLists = lists.filter((l) => l.boardId === id);
  boardLists.forEach((l) => deleteList(l.id));
  return true;
}

export function getListsByBoard(boardId) {
  return lists.filter((l) => l.boardId === boardId);
}

export function getCardsByBoard(boardId) {
  const boardLists = lists.filter((l) => l.boardId === boardId);
  const listIds = boardLists.map((l) => l.id);
  return cards.filter((c) => listIds.includes(c.listId));
}

export function getUserData(userId) {
  const userBoards = getBoardsByUser(userId);
  const boardIds = userBoards.map((b) => b.id);
  const userLists = lists.filter((l) => boardIds.includes(l.boardId));
  const listIds = userLists.map((l) => l.id);
  const userCards = cards.filter((c) => listIds.includes(c.listId));
  return { boards: userBoards, lists: userLists, cards: userCards };
}

// ============= LIST =============

const lists = [];

export function getAllLists() {
  return [...lists];
}

export function getListById(id) {
  return lists.find((l) => l.id === id) || null;
}

export function createList(boardId, name) {
  const boardLists = lists.filter((l) => l.boardId === boardId);
  const list = { id: genId(), boardId, name, order: boardLists.length };
  lists.push(list);
  return list;
}

export function updateList(id, data) {
  const idx = lists.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  lists[idx] = { ...lists[idx], ...data };
  return lists[idx];
}

export function deleteList(id) {
  const idx = lists.findIndex((l) => l.id === id);
  if (idx === -1) return false;
  lists.splice(idx, 1);
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i].listId === id) cards.splice(i, 1);
  }
  return true;
}

export function reorderList(listId, targetListId) {
  const src = lists.find((l) => l.id === listId);
  const tgt = lists.find((l) => l.id === targetListId);
  if (!src || !tgt) return false;

  const sorted = [...lists].sort((a, b) => a.order - b.order);
  const si = sorted.findIndex((l) => l.id === listId);
  const ti = sorted.findIndex((l) => l.id === targetListId);
  if (si === -1 || ti === -1) return false;

  const [moved] = sorted.splice(si, 1);
  sorted.splice(ti, 0, moved);
  sorted.forEach((l, i) => {
    const db = lists.findIndex((x) => x.id === l.id);
    if (db !== -1) lists[db] = { ...lists[db], order: i };
  });
  return true;
}

// ============= CARD =============

const cards = [];

export function getCardById(id) {
  return cards.find((c) => c.id === id) || null;
}

export function getCardsByList(listId) {
  return cards.filter((c) => c.listId === listId);
}

export function createCard(listId, title) {
  const card = {
    id: genId(),
    listId,
    title,
    description: "",
    createdAt: Date.now(),
    comments: [],
    labels: [],
    dueDate: null,
  };
  cards.push(card);
  return card;
}

export function updateCard(id, data) {
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  cards[idx] = { ...cards[idx], ...data };
  return cards[idx];
}

export function deleteCard(id) {
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  cards.splice(idx, 1);
  return true;
}

export function moveCard(cardId, targetListId) {
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  cards[idx] = { ...cards[idx], listId: targetListId };
  return cards[idx];
}

export function addComment(cardId, text, author) {
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const comment = { id: genId(), text, author, createdAt: Date.now() };
  cards[idx].comments.push(comment);
  return comment;
}

export function deleteComment(cardId, commentId) {
  const idx = cards.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const before = cards[idx].comments.length;
  cards[idx].comments = cards[idx].comments.filter(
    (c) => c.id !== commentId,
  );
  return cards[idx].comments.length < before;
}

// ============= SEED DATA =============

const user = users[0];
const b1 = createBoard(user.id, "My Project");
const b2 = createBoard(user.id, "Personal Tasks");

const l1 = getListsByBoard(b1.id); // [Todo, In Progress, Review, Done]
const l2 = getListsByBoard(b2.id);

const c1 = createCard(l1[0].id, "Design landing page");
const c2 = createCard(l1[0].id, "Setup CI/CD");
const c3 = createCard(l1[1].id, "Implement auth");
const c4 = createCard(l1[1].id, "Build API");
const c5 = createCard(l1[2].id, "Code review");
const c6 = createCard(l1[3].id, "Deploy to production");

createCard(l2[0].id, "Buy groceries");
createCard(l2[0].id, "Read book");
createCard(l2[1].id, "Learn React");
createCard(l2[2].id, "Write blog post");
const dc = createCard(l2[3].id, "Clean room");

addComment(c1.id, "Need to finalize color scheme", user.name);
addComment(c3.id, "Use JWT for tokens", user.name);
addComment(c4.id, "RESTful endpoints done", user.name);
addComment(dc.id, "This weekend!", user.name);
