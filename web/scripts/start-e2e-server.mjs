import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webDir, "..");
const nextBin = path.resolve(webDir, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT ?? "3100";
const backendPort = process.env.AGCLAW_BACKEND_PORT ?? "8008";
const liveVision = process.env.AGCLAW_E2E_LIVE_VISION === "1";

const backend = spawn(
  "python",
  ["-m", "agclaw_backend.server", "--host", "127.0.0.1", "--port", backendPort],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PYTHONPATH: path.resolve(repoRoot, "backend"),
      AGCLAW_BACKEND_MOCK_CHAT: "1",
      AGCLAW_BACKEND_MOCK_HEALTH: "1",
      AGCLAW_BACKEND_QUIET: "1",
      ...(liveVision
        ? {
            AGCLAW_SCREEN_VISION_PROVIDER: process.env.AGCLAW_SCREEN_VISION_PROVIDER ?? "ollama",
            AGCLAW_SCREEN_VISION_BASE_URL: process.env.AGCLAW_SCREEN_VISION_BASE_URL ?? "http://127.0.0.1:11434",
            AGCLAW_SCREEN_VISION_MODEL: process.env.AGCLAW_SCREEN_VISION_MODEL ?? "qwen2.5vl:3b",
            AGCLAW_SCREEN_VISION_API_KEY: process.env.AGCLAW_SCREEN_VISION_API_KEY ?? "",
            AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS: process.env.AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS ?? "180",
          }
        : {}),
    },
  }
);

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: webDir,
  stdio: "inherit",
  env: {
    ...process.env,
    AGCLAW_WEB_ROOT: repoRoot,
    AGCLAW_BACKEND_URL: `http://127.0.0.1:${backendPort}`,
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
  },
});

const shutdown = (signal) => {
  if (!backend.killed) {
    backend.kill(signal);
  }
  if (!child.killed) {
    child.kill(signal);
  }
};

child.on("exit", (code) => {
  shutdown("SIGTERM");
  process.exit(code ?? 0);
});

backend.on("exit", (code) => {
  if (code && !child.killed) {
    child.kill("SIGTERM");
    process.exit(code);
  }
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

