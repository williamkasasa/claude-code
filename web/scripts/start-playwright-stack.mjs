import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..");
const backendPort = process.argv[2] ?? process.env.AGCLAW_BACKEND_PORT ?? "8108";

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function runBuild() {
  await rm(path.resolve(webDir, ".next"), { recursive: true, force: true });

  await new Promise((resolve, reject) => {
    const child = spawn(npmCommand(), ["run", "build"], {
      cwd: webDir,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        AGCLAW_WEB_ROOT: "..",
        AGCLAW_BACKEND_PORT: backendPort,
      },
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`npm run build exited with ${code ?? 1}`));
    });
  });
}

await runBuild();
process.env.AGCLAW_WEB_ROOT = "..";
process.env.AGCLAW_BACKEND_PORT = backendPort;
await import("./start-e2e-server.mjs");