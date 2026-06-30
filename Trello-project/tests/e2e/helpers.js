import { expect } from "./fixtures";

export function uniqueName(prefix) {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  return `${prefix}-${stamp}`;
}

export function listByName(page, listName) {
  return page.locator(
    `[data-testid="list-column"][data-list-name="${listName}"]`,
  );
}

export function listCardArea(page, listName) {
  return listByName(page, listName).getByTestId("list-card-area");
}

export function cardByTitle(scope, cardTitle) {
  return scope.locator(`[data-testid="card"][data-card-title="${cardTitle}"]`);
}

export async function registerUser(page, credentials) {
  await page.goto("/login");
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.goto("/register");
  await expect(page.getByTestId("register-page")).toBeVisible();
  await page.getByTestId("register-email").fill(credentials.email);
  await page.getByTestId("register-password").fill(credentials.password);
  await page.getByTestId("register-submit").click();
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
}

export async function loginUser(page, credentials) {
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByTestId("login-email").fill(credentials.email);
  await page.getByTestId("login-password").fill(credentials.password);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
}

export async function createBoardAndOpen(page, boardName) {
  await page.getByTestId("new-board-button").click();
  await page.getByTestId("create-board-input").fill(boardName);
  await page.getByTestId("create-board-submit").click();

  const boardLink = page.locator(
    `[data-testid="board-link"][data-board-name="${boardName}"]`,
  );
  await expect(boardLink).toHaveCount(1);
  await boardLink.click();
  await expect(page.getByTestId("board-columns")).toBeVisible();
}

export async function addList(page, listName) {
  const input = page.getByTestId("add-list-input");
  await input.fill(listName);
  await input.press("Enter");
  await expect(listByName(page, listName)).toHaveCount(1);
}

export async function addCard(page, listName, cardTitle) {
  const list = listByName(page, listName);
  await expect(list).toHaveCount(1);
  await list.getByTestId("add-card-button").click();
  const input = list.getByTestId("add-card-input");
  await input.fill(cardTitle);
  await input.press("Enter");
  await expect(cardByTitle(list, cardTitle)).toHaveCount(1);
}

export async function getCardTitles(list) {
  const titles = await list.getByTestId("card-title").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
  );

  return titles;
}

export async function getListTitles(page) {
  return page.getByTestId("list-title").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean),
  );
}

export async function ensureBoardAfterReload(page, credentials, boardUrl) {
  await page.reload();

  const boardColumns = page.getByTestId("board-columns");
  const loginPage = page.getByTestId("login-page");

  try {
    await Promise.race([
      boardColumns.waitFor({ state: "visible", timeout: 10_000 }),
      loginPage.waitFor({ state: "visible", timeout: 10_000 }),
    ]);
  } catch {
    // Fall through to the final visibility assertion below.
  }

  if (await loginPage.isVisible().catch(() => false)) {
    await loginUser(page, credentials);
  }

  if (!(await boardColumns.isVisible().catch(() => false))) {
    await page.goto(boardUrl);
  }

  await expect(boardColumns).toBeVisible();
}

function pointFromBox(box, position) {
  const centerX = box.x + box.width / 2;

  if (position === "top") {
    return { x: centerX, y: box.y + Math.max(6, box.height * 0.2) };
  }

  if (position === "bottom") {
    return { x: centerX, y: box.y + Math.max(6, box.height * 0.8) };
  }

  return { x: centerX, y: box.y + box.height / 2 };
}

async function moveMouseSmooth(page, from, to, steps = 12, pauseMs = 10) {
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    await page.mouse.move(x, y);

    if (pauseMs > 0) {
      await page.waitForTimeout(pauseMs);
    }
  }
}

export async function dragCardToTarget(
  page,
  sourceCard,
  target,
  { targetPosition = "center" } = {},
) {
  await sourceCard.scrollIntoViewIfNeeded();
  await sourceCard.hover();

  const dragHandle = sourceCard.getByTestId("card-drag-handle");
  await expect(dragHandle).toBeVisible();

  const startBox = await dragHandle.boundingBox();
  const targetBox = await target.boundingBox();

  if (!startBox || !targetBox) {
    throw new Error("Could not resolve drag coordinates for DnD test.");
  }

  const start = pointFromBox(startBox, "center");
  const targetPoint = pointFromBox(targetBox, targetPosition);
  const liftPoint = { x: start.x + 12, y: start.y + 12 };
  const midpoint = {
    x: (liftPoint.x + targetPoint.x) / 2,
    y: (liftPoint.y + targetPoint.y) / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await moveMouseSmooth(page, start, liftPoint, 4, 10);
  await moveMouseSmooth(page, liftPoint, midpoint, 8, 10);
  await moveMouseSmooth(page, midpoint, targetPoint, 12, 10);
  await page.waitForTimeout(50);
  await page.mouse.up();
}
