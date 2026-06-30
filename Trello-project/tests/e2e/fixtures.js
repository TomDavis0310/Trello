import { expect, test as base } from "@playwright/test";

const blockedConsolePatterns = [
  /Encountered two children with the same key/i,
  /duplicate key/i,
  /Maximum update depth exceeded/i,
];

export const test = base.extend({
  page: async ({ page }, use) => {
    const issues = [];

    const capture = (source, text) => {
      if (blockedConsolePatterns.some((pattern) => pattern.test(text))) {
        issues.push(`${source}: ${text}`);
      }
    };

    page.on("console", (message) => {
      capture(`console:${message.type()}`, message.text());
    });

    page.on("pageerror", (error) => {
      capture("pageerror", error.message);
    });

    await use(page);

    expect(
      issues,
      issues.length
        ? `Unexpected console/runtime warnings:\n${issues.join("\n\n")}`
        : undefined,
    ).toEqual([]);
  },
});

export { expect };
