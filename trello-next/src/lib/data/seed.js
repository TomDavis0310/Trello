import db from "./db.js";

export function runSeed() {
  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM users")
    .get();

  if (count > 0) return;

  const seed = db.transaction(() => {
    const userInfo = db
      .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
      .run("demo@trello.com", "123456", "Demo");
    const userId = Number(userInfo.lastInsertRowid);

    const b1Info = db
      .prepare("INSERT INTO boards (user_id, name) VALUES (?, ?)")
      .run(userId, "My Project");
    const b1Id = Number(b1Info.lastInsertRowid);

    const b2Info = db
      .prepare("INSERT INTO boards (user_id, name) VALUES (?, ?)")
      .run(userId, "Personal Tasks");
    const b2Id = Number(b2Info.lastInsertRowid);

    const insertList = db.prepare(
      `INSERT INTO lists (board_id, name, "order") VALUES (?, ?, ?)`,
    );

    const listNames = ["Todo", "In Progress", "Review", "Done"];
    const b1Lists = listNames.map((name, i) => {
      const info = insertList.run(b1Id, name, i);
      return { id: Number(info.lastInsertRowid), name };
    });
    const b2Lists = listNames.map((name, i) => {
      const info = insertList.run(b2Id, name, i);
      return { id: Number(info.lastInsertRowid), name };
    });

    const insertCard = db.prepare(
      "INSERT INTO cards (list_id, title) VALUES (?, ?)",
    );

    const c1 = Number(
      insertCard.run(b1Lists[0].id, "Design landing page").lastInsertRowid,
    );
    Number(insertCard.run(b1Lists[0].id, "Setup CI/CD").lastInsertRowid);
    const c3 = Number(
      insertCard.run(b1Lists[1].id, "Implement auth").lastInsertRowid,
    );
    const c4 = Number(
      insertCard.run(b1Lists[1].id, "Build API").lastInsertRowid,
    );
    Number(insertCard.run(b1Lists[2].id, "Code review").lastInsertRowid);
    Number(
      insertCard.run(b1Lists[3].id, "Deploy to production").lastInsertRowid,
    );

    Number(insertCard.run(b2Lists[0].id, "Buy groceries").lastInsertRowid);
    Number(insertCard.run(b2Lists[0].id, "Read book").lastInsertRowid);
    Number(insertCard.run(b2Lists[1].id, "Learn React").lastInsertRowid);
    Number(
      insertCard.run(b2Lists[2].id, "Write blog post").lastInsertRowid,
    );
    const c11 = Number(
      insertCard.run(b2Lists[3].id, "Clean room").lastInsertRowid,
    );

    const insertComment = db.prepare(
      "INSERT INTO comments (card_id, text, author) VALUES (?, ?, ?)",
    );
    insertComment.run(c1, "Need to finalize color scheme", "Demo");
    insertComment.run(c3, "Use JWT for tokens", "Demo");
    insertComment.run(c4, "RESTful endpoints done", "Demo");
    insertComment.run(c11, "This weekend!", "Demo");
  });

  seed();
}
