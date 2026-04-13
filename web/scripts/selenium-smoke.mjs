import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { runDesktopWebSmoke, runMobileWebSmoke } from "./mobile-webdriver-flow.mjs";

const args = new Set(process.argv.slice(2));
const isMobile = args.has("--mobile");
const baseUrl = process.env.AGCLAW_UI_URL ?? "http://127.0.0.1:3000";

const options = new chrome.Options();
if (isMobile) {
  options.setMobileEmulation({ deviceName: "Pixel 7" });
} else {
  options.addArguments("--window-size=1440,1200");
}

const driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();

try {
  if (isMobile) {
    await runMobileWebSmoke(driver, { baseUrl, prompt: "mobile selenium smoke" });
  } else {
    await runDesktopWebSmoke(driver, { baseUrl });
  }

  console.log(`Selenium smoke (${isMobile ? "mobile" : "desktop"}) passed against ${baseUrl}`);
} finally {
  await driver.quit();
}
