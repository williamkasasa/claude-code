import { Builder, By, until } from "selenium-webdriver";
import { runMobileWebSmoke } from "./mobile-webdriver-flow.mjs";

const baseUrl = process.env.AGCLAW_UI_URL ?? "http://127.0.0.1:3000";
const serverUrl = process.env.APPIUM_SERVER_URL ?? "http://127.0.0.1:4723";

const capabilities = {
  platformName: "Android",
  browserName: "Chrome",
  "appium:automationName": process.env.APPIUM_AUTOMATION_NAME ?? "UiAutomator2",
  "appium:deviceName": process.env.APPIUM_DEVICE_NAME ?? "Android Device",
  "appium:newCommandTimeout": Number(process.env.APPIUM_NEW_COMMAND_TIMEOUT ?? 240),
};

if (process.env.ANDROID_UDID) {
  capabilities["appium:udid"] = process.env.ANDROID_UDID;
}

const driver = await new Builder().usingServer(serverUrl).withCapabilities(capabilities).build();

try {
  await runMobileWebSmoke(driver, {
    baseUrl,
    prompt: process.env.AGCLAW_MOBILE_SMOKE_PROMPT ?? "appium android smoke",
  });
  console.log(`Appium Android smoke passed against ${baseUrl} via ${serverUrl}`);
} finally {
  await driver.quit();
}

