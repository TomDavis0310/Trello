import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tests/e2e/web-server.mjs",
    cwd: ".",
    url: "http://127.0.0.1:5173",
    timeout: 120_000,
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
  },
});
