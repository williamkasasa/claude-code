import { defineConfig, devices } from "@playwright/test";
import path from "path";

const port = 3100;
const backendPort = 8108;

export default defineConfig({
  testDir: "./e2e",
  reporter: "list",
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `node scripts/start-playwright-stack.mjs ${backendPort}`,
    cwd: path.resolve(__dirname),
    url: `http://127.0.0.1:${port}/health`,
    timeout: 600000,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile-shell\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      testMatch: /mobile-shell\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
  ],
});

