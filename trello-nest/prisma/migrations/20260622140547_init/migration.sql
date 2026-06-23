-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sessions" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "boards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lists" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "board_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL,
    CONSTRAINT "lists_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "list_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "due_date" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "card_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "labels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "card_id" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "labels_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
