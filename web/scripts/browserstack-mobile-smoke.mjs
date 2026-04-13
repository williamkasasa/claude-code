import { Builder } from "selenium-webdriver";
import browserstackLocal from "browserstack-local";
import { runMobileWebSmoke } from "./mobile-webdriver-flow.mjs";

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

if (!username || !accessKey) {
  throw new Error("BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are required.");
}

const useLocal = (process.env.BROWSERSTACK_LOCAL ?? "true").toLowerCase() === "true";
const baseUrl = process.env.AGCLAW_UI_URL ?? "http://bs-local.com:3000";
const buildName = process.env.BROWSERSTACK_BUILD_NAME ?? `agclaw-mobile-${new Date().toISOString()}`;
const sessionName = process.env.BROWSERSTACK_SESSION_NAME ?? "AG-Claw mobile smoke";
const localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;

let local;
if (useLocal) {
  local = new browserstackLocal.Local();
  await new Promise((resolve, reject) => {
    local.start(
      {
        key: accessKey,
        localIdentifier,
      },
      (error) => (error ? reject(error) : resolve())
    );
  });
}

const capabilities = {
  browserName: "Chrome",
  "bstack:options": {
    userName: username,
    accessKey,
    deviceName: process.env.BROWSERSTACK_DEVICE_NAME ?? "Google Pixel 7",
    osVersion: process.env.BROWSERSTACK_OS_VERSION ?? "13.0",
    realMobile: "true",
    projectName: process.env.BROWSERSTACK_PROJECT_NAME ?? "AG-Claw",
    buildName,
    sessionName,
    local: useLocal,
    localIdentifier,
    debug: true,
    networkLogs: true,
  },
};

const driver = await new Builder()
  .usingServer(`https://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`)
  .withCapabilities(capabilities)
  .build();

try {
  await runMobileWebSmoke(driver, {
    baseUrl,
    prompt: process.env.AGCLAW_MOBILE_SMOKE_PROMPT ?? "browserstack mobile smoke",
    timeout: 30000,
  });
  console.log(`BrowserStack mobile smoke passed against ${baseUrl}`);
} finally {
  await driver.quit();
  if (local) {
    await new Promise((resolve) => local.stop(resolve));
  }
}