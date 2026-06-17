import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { runSeed } from "./seed.js";

const root = process.cwd();
const dataDir = join(root, "data");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, "trello.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const schemaPath = join(
  fileURLToPath(import.meta.url),
  "..",
  "schema.sql",
);
const schema = readFileSync(schemaPath, "utf-8");
db.exec(schema);

export default db;

runSeed();
