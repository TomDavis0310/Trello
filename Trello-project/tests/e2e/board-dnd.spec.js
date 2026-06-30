import { expect, test } from "./fixtures";
import {
  addCard,
  addList,
  cardByTitle,
  createBoardAndOpen,
  dragCardToTarget,
  ensureBoardAfterReload,
  getCardTitles,
  getListTitles,
  listByName,
  listCardArea,
  registerUser,
  uniqueName,
} from "./helpers";

async function setupBoard(page) {
  const credentials = {
    email: `${uniqueName("qa-user")}@example.com`,
    password: "Password123!",
  };
  const boardName = uniqueName("qa-board");

  await registerUser(page, credentials);
  await createBoardAndOpen(page, boardName);

  return { boardName, credentials };
}

test("add list once", async ({ page }) => {
  await setupBoard(page);

  const listName = uniqueName("list-once");
  await addList(page, listName);

  await expect(listByName(page, listName)).toHaveCount(1);
  await expect(page.getByTestId("list-title").filter({ hasText: listName })).toHaveCount(1);
});

test("add card once", async ({ page }) => {
  await setupBoard(page);

  const listName = uniqueName("card-list");
  const cardTitle = uniqueName("card-once");

  await addList(page, listName);
  await addCard(page, listName, cardTitle);

  await expect(cardByTitle(listByName(page, listName), cardTitle)).toHaveCount(1);
});

test("drag card into empty list", async ({ page }) => {
  await setupBoard(page);

  const sourceListName = uniqueName("source-list");
  const targetListName = uniqueName("empty-list");
  const cardTitle = uniqueName("empty-drop-card");

  await addList(page, sourceListName);
  await addList(page, targetListName);
  await addCard(page, sourceListName, cardTitle);

  await dragCardToTarget(
    page,
    cardByTitle(listByName(page, sourceListName), cardTitle),
    listCardArea(page, targetListName),
  );

  await expect(cardByTitle(listByName(page, targetListName), cardTitle)).toHaveCount(1);
  await expect(cardByTitle(listByName(page, sourceListName), cardTitle)).toHaveCount(0);
});

test("same-list reorder", async ({ page }) => {
  await setupBoard(page);

  const listName = uniqueName("reorder-list");
  const cardA = uniqueName("card-a");
  const cardB = uniqueName("card-b");

  await addList(page, listName);
  await addCard(page, listName, cardA);
  await addCard(page, listName, cardB);

  const list = listByName(page, listName);

  await dragCardToTarget(
    page,
    cardByTitle(list, cardA),
    cardByTitle(list, cardB),
    { targetPosition: "bottom" },
  );

  await expect.poll(async () => getCardTitles(list)).toEqual([cardB, cardA]);
});

test("cross-list insert", async ({ page }) => {
  await setupBoard(page);

  const sourceListName = uniqueName("from-list");
  const targetListName = uniqueName("to-list");
  const cardA = uniqueName("move-me");
  const cardB = uniqueName("target-b");
  const cardC = uniqueName("target-c");

  await addList(page, sourceListName);
  await addList(page, targetListName);
  await addCard(page, sourceListName, cardA);
  await addCard(page, targetListName, cardB);
  await addCard(page, targetListName, cardC);

  const sourceList = listByName(page, sourceListName);
  const targetList = listByName(page, targetListName);

  await dragCardToTarget(
    page,
    cardByTitle(sourceList, cardA),
    cardByTitle(targetList, cardB),
    { targetPosition: "bottom" },
  );

  await expect.poll(async () => getCardTitles(targetList)).toEqual([
    cardB,
    cardA,
    cardC,
  ]);
  await expect(cardByTitle(sourceList, cardA)).toHaveCount(0);
});

test("reload persistence", async ({ page }) => {
  const { credentials } = await setupBoard(page);

  const listA = uniqueName("reload-list-a");
  const listB = uniqueName("reload-list-b");
  const cardA = uniqueName("reload-card-a");
  const cardB = uniqueName("reload-card-b");
  const cardC = uniqueName("reload-card-c");

  await addList(page, listA);
  await addList(page, listB);
  await addCard(page, listA, cardA);
  await addCard(page, listB, cardB);
  await addCard(page, listB, cardC);

  await dragCardToTarget(
    page,
    cardByTitle(listByName(page, listA), cardA),
    cardByTitle(listByName(page, listB), cardB),
    { targetPosition: "bottom" },
  );

  await expect.poll(async () => getCardTitles(listByName(page, listB))).toEqual([
    cardB,
    cardA,
    cardC,
  ]);

  const boardUrl = page.url();
  await ensureBoardAfterReload(page, credentials, boardUrl);

  await expect(page).toHaveURL(boardUrl);
  await expect(page.getByTestId("board-columns")).toBeVisible();
  await expect
    .poll(async () => {
      const titles = await getListTitles(page);
      return {
        hasListA: titles.includes(listA),
        hasListB: titles.includes(listB),
      };
    })
    .toEqual({
      hasListA: true,
      hasListB: true,
    });
  await expect.poll(async () => getCardTitles(listByName(page, listA))).toEqual([]);
  await expect.poll(async () => getCardTitles(listByName(page, listB))).toEqual([
    cardB,
    cardA,
    cardC,
  ]);
});
