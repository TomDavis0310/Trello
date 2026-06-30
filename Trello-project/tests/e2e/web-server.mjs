import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(currentDir, "..", "..");
const backendDir = path.resolve(frontendDir, "..", "trello-nest");
const children = [];
let keepAliveTimer = null;
let shuttingDown = false;

function startProcess(name, cwd, command) {
  const child = spawn("cmd.exe", ["/c", command], {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  children.push(child);

  child.on("exit", (code) => {
    if (shuttingDown) return;

    console.error(`${name} exited before the Playwright suite finished.`);
    shutdown(code ?? 1);
  });

  return child;
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;

    const tryConnect = () => {
      const socket = net.createConnection({ port, host });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
          return;
        }

        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }

  for (const child of children) {
    try {
      child.kill();
    } catch {
      // Ignore child shutdown races.
    }
  }

  setTimeout(() => {
    process.exit(code);
  }, 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("uncaughtException", (error) => {
  console.error(error);
  shutdown(1);
});
process.on("unhandledRejection", (error) => {
  console.error(error);
  shutdown(1);
});

async function main() {
  startProcess("backend", backendDir, "npm run start");
  startProcess(
    "frontend",
    frontendDir,
    "npm run dev -- --host 127.0.0.1 --port 5173",
  );

  await Promise.all([waitForPort(3000), waitForPort(5173)]);

  console.log("Playwright web servers are ready.");
  keepAliveTimer = setInterval(() => {}, 60_000);
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
