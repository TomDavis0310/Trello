import db from "./db.js";

export const genId = () => Date.now() + Math.floor(Math.random() * 1000);

// ============= HELPERS =============

function toCamel(row) {
  if (!row) return null;
  const out = {};
  for (const key of Object.keys(row)) {
    out[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = row[key];
  }
  return out;
}

// ============= USERS & SESSIONS =============

export function createUser(email, password, name) {
  const info = db
    .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
    .run(email, password, name || email.split("@")[0]);

  const user = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(Number(info.lastInsertRowid));

  const { password: _, ...safe } = user;
  return safe;
}

export function findUserByEmail(email) {
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  return toCamel(row);
}

export function findUserById(id) {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return toCamel(row);
}

export function createSession(userId) {
  const token =
    "tok_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(
    token,
    userId,
  );
  return token;
}

export function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserByToken(token) {
  const row = db
    .prepare(
      `SELECT users.* FROM users
       JOIN sessions ON sessions.user_id = users.id
       WHERE sessions.token = ?`,
    )
    .get(token);
  return toCamel(row);
}

// ============= BOARDS =============

export function createBoard(userId, name) {
  const seed = db.transaction(() => {
    const boardInfo = db
      .prepare("INSERT INTO boards (user_id, name) VALUES (?, ?)")
      .run(userId, name);
    const boardId = Number(boardInfo.lastInsertRowid);

    const insertList = db.prepare(
      `INSERT INTO lists (board_id, name, "order") VALUES (?, ?, ?)`,
    );
    ["Todo", "In Progress", "Review", "Done"].forEach((n, i) => {
      insertList.run(boardId, n, i);
    });

    return boardId;
  });

  const boardId = seed();
  const board = db.prepare("SELECT * FROM boards WHERE id = ?").get(boardId);
  return toCamel(board);
}

export function getBoardsByUser(userId) {
  const rows = db.prepare("SELECT * FROM boards WHERE user_id = ?").all(userId);
  return rows.map(toCamel);
}

export function getBoardById(id) {
  const row = db.prepare("SELECT * FROM boards WHERE id = ?").get(id);
  return toCamel(row);
}

export function updateBoard(id, data) {
  const result = db
    .prepare("UPDATE boards SET name = ? WHERE id = ?")
    .run(data.name, id);
  if (result.changes === 0) return null;
  return toCamel(
    db.prepare("SELECT * FROM boards WHERE id = ?").get(id),
  );
}

export function deleteBoard(id) {
  const result = db.prepare("DELETE FROM boards WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getListsByBoard(boardId) {
  const rows = db
    .prepare(`SELECT * FROM lists WHERE board_id = ? ORDER BY "order" ASC`)
    .all(boardId);
  return rows.map(toCamel);
}

export function getCardsByBoard(boardId) {
  const rows = db
    .prepare(
      `SELECT cards.* FROM cards
       JOIN lists ON lists.id = cards.list_id
       WHERE lists.board_id = ?`,
    )
    .all(boardId);
  return rows.map(toCamel);
}

export function getUserData(userId) {
  const boards = getBoardsByUser(userId);
  if (boards.length === 0) return { boards: [], lists: [], cards: [] };

  const boardIds = boards.map((b) => b.id);
  const ph = boardIds.map(() => "?").join(",");

  const lists = db
    .prepare(
      `SELECT * FROM lists WHERE board_id IN (${ph}) ORDER BY "order" ASC`,
    )
    .all(...boardIds)
    .map(toCamel);

  const cards = db
    .prepare(
      `SELECT cards.* FROM cards
       JOIN lists ON lists.id = cards.list_id
       WHERE lists.board_id IN (${ph})`,
    )
    .all(...boardIds)
    .map(enrichCard);

  return { boards, lists, cards };
}

// ============= LISTS =============

export function getAllLists() {
  const rows = db
    .prepare(`SELECT * FROM lists ORDER BY board_id, "order" ASC`)
    .all();
  return rows.map(toCamel);
}

export function getListById(id) {
  return toCamel(db.prepare("SELECT * FROM lists WHERE id = ?").get(id));
}

export function createList(boardId, name) {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM lists WHERE board_id = ?")
    .get(boardId);

  const info = db
    .prepare(`INSERT INTO lists (board_id, name, "order") VALUES (?, ?, ?)`)
    .run(boardId, name, count);

  return toCamel(
    db.prepare("SELECT * FROM lists WHERE id = ?").get(Number(info.lastInsertRowid)),
  );
}

export function updateList(id, data) {
  if (data.name === undefined) return getListById(id);

  const result = db
    .prepare("UPDATE lists SET name = ? WHERE id = ?")
    .run(data.name, id);

  if (result.changes === 0) return null;
  return toCamel(db.prepare("SELECT * FROM lists WHERE id = ?").get(id));
}

export function deleteList(id) {
  const result = db.prepare("DELETE FROM lists WHERE id = ?").run(id);
  return result.changes > 0;
}

export function reorderList(listId, targetListId) {
  const src = db.prepare("SELECT * FROM lists WHERE id = ?").get(listId);
  const tgt = db.prepare("SELECT * FROM lists WHERE id = ?").get(targetListId);
  if (!src || !tgt || src.board_id !== tgt.board_id) return false;

  const rows = db
    .prepare(`SELECT * FROM lists WHERE board_id = ? ORDER BY "order" ASC`)
    .all(src.board_id);

  const si = rows.findIndex((r) => r.id === listId);
  const ti = rows.findIndex((r) => r.id === targetListId);
  if (si === -1 || ti === -1) return false;

  const [moved] = rows.splice(si, 1);
  rows.splice(ti, 0, moved);

  const update = db.prepare(`UPDATE lists SET "order" = ? WHERE id = ?`);
  const reorder = db.transaction(() => {
    rows.forEach((r, i) => update.run(i, r.id));
  });
  reorder();

  return true;
}

// ============= CARDS =============

function enrichCard(row) {
  if (!row) return null;
  const card = toCamel(row);

  card.comments = db
    .prepare("SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC")
    .all(card.id)
    .map(toCamel);

  card.labels = db
    .prepare("SELECT * FROM labels WHERE card_id = ?")
    .all(card.id)
    .map(toCamel);

  return card;
}

export function getCardById(id) {
  return enrichCard(db.prepare("SELECT * FROM cards WHERE id = ?").get(id));
}

export function getCardsByList(listId) {
  const rows = db.prepare("SELECT * FROM cards WHERE list_id = ?").all(listId);
  return rows.map(enrichCard);
}

export function createCard(listId, title) {
  const info = db
    .prepare("INSERT INTO cards (list_id, title, description) VALUES (?, ?, '')")
    .run(listId, title);

  return getCardById(Number(info.lastInsertRowid));
}

export function updateCard(id, data) {
  const allowed = {
    title: "title",
    description: "description",
    dueDate: "due_date",
  };
  const sets = [];
  const vals = [];

  for (const [key, col] of Object.entries(allowed)) {
    if (data[key] !== undefined) {
      sets.push(`"${col}" = ?`);
      vals.push(data[key]);
    }
  }

  if (sets.length > 0) {
    vals.push(id);
    db.prepare(`UPDATE cards SET ${sets.join(", ")} WHERE id = ?`).run(
      ...vals,
    );
  }

  return getCardById(id);
}

export function deleteCard(id) {
  const result = db.prepare("DELETE FROM cards WHERE id = ?").run(id);
  return result.changes > 0;
}

export function moveCard(cardId, targetListId) {
  const result = db
    .prepare("UPDATE cards SET list_id = ? WHERE id = ?")
    .run(targetListId, cardId);
  if (result.changes === 0) return null;
  return enrichCard(
    db.prepare("SELECT * FROM cards WHERE id = ?").get(cardId),
  );
}

// ============= COMMENTS =============

export function addComment(cardId, text, author) {
  const card = db.prepare("SELECT id FROM cards WHERE id = ?").get(cardId);
  if (!card) return null;

  const info = db
    .prepare("INSERT INTO comments (card_id, text, author) VALUES (?, ?, ?)")
    .run(cardId, text, author || "Anonymous");

  return toCamel(
    db.prepare("SELECT * FROM comments WHERE id = ?").get(Number(info.lastInsertRowid)),
  );
}

export function deleteComment(cardId, commentId) {
  const card = db.prepare("SELECT id FROM cards WHERE id = ?").get(cardId);
  if (!card) return null;

  const result = db
    .prepare("DELETE FROM comments WHERE id = ? AND card_id = ?")
    .run(commentId, cardId);
  return result.changes > 0;
}

// ============= LABELS =============

export function addLabel(cardId, label) {
  const card = db.prepare("SELECT id FROM cards WHERE id = ?").get(cardId);
  if (!card) return null;

  const info = db
    .prepare("INSERT INTO labels (card_id, color, text) VALUES (?, ?, ?)")
    .run(cardId, label.color || "", label.text || "");

  return toCamel(
    db.prepare("SELECT * FROM labels WHERE id = ?").get(Number(info.lastInsertRowid)),
  );
}

export function removeLabel(cardId, labelId) {
  const result = db
    .prepare("DELETE FROM labels WHERE id = ? AND card_id = ?")
    .run(labelId, cardId);
  return result.changes > 0;
}
