import { spawn } from "node:child_process";

async function runMigrations() {
  await new Promise((resolve, reject) => {
    const migration = spawn(
      process.execPath,
      [
        "/app/apps/api/node_modules/typeorm/cli.js",
        "-d",
        "/app/apps/api/dist/database/data-source.js",
        "migration:run",
      ],
      {
        cwd: "/app/apps/api",
        env: process.env,
        stdio: "inherit",
      },
    );
    migration.once("error", reject);
    migration.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `Database migration failed (${signal ?? `code ${code ?? 1}`})`,
          ),
        );
    });
  });
}

await runMigrations();

const gatewayPort = process.env.PORT ?? "10000";
const processes = [
  {
    name: "api",
    command: "/app/apps/api/dist/main.js",
    environment: { PORT: "3001" },
  },
  {
    name: "web",
    command: "/app/apps/web/server.js",
    environment: { PORT: "3000", HOSTNAME: "127.0.0.1" },
  },
  {
    name: "gateway",
    command: "/app/gateway-server.mjs",
    environment: {
      PORT: gatewayPort,
      WEB_ORIGIN: "http://127.0.0.1:3000",
      API_ORIGIN: "http://127.0.0.1:3001",
    },
  },
];

let shuttingDown = false;
const children = processes.map(({ name, command, environment }) => {
  const child = spawn(process.execPath, [command], {
    env: { ...process.env, ...environment },
    stdio: "inherit",
  });
  child.once("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(
      `${name} exited unexpectedly (${signal ?? `code ${code ?? 1}`})`,
    );
    shutdown("SIGTERM", code ?? 1);
  });
  return child;
});

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
  setTimeout(() => process.exit(exitCode), 10_000).unref();
  Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          if (child.exitCode !== null) resolve();
          else child.once("exit", resolve);
        }),
    ),
  ).then(() => process.exit(exitCode));
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
