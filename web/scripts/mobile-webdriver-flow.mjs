import { By, Key, until } from "selenium-webdriver";

function containsTextXPath(text) {
  return `//*[contains(normalize-space(.), ${JSON.stringify(text)})]`;
}

function buttonByLabel(label) {
  return By.css(`[aria-label="${label}"]`);
}

function buttonByText(text) {
  return By.xpath(`//button[normalize-space(.)=${JSON.stringify(text)} or .//*[normalize-space(.)=${JSON.stringify(text)}]]`);
}

function drawerButtonByText(text) {
  return By.xpath(`//*[@role='dialog' and @aria-label='Navigation']//button[normalize-space(.)=${JSON.stringify(text)} or .//*[normalize-space(.)=${JSON.stringify(text)}]]`);
}

async function findVisible(driver, locator, timeout = 20000) {
  const element = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

async function clickVisible(driver, locator, timeout = 20000) {
  const element = await findVisible(driver, locator, timeout);
  await driver.executeScript("arguments[0].scrollIntoView({ block: 'center', inline: 'nearest' });", element);
  await element.click();
  return element;
}

export async function runMobileWebSmoke(driver, {
  baseUrl,
  prompt = "android smoke status",
  timeout = 20000,
} = {}) {
  await driver.get(baseUrl);

  const messageBox = await findVisible(driver, buttonByLabel("Message"), timeout);
  await findVisible(driver, buttonByLabel("Open sidebar"), timeout);
  await findVisible(driver, buttonByLabel("Open settings"), timeout);
  await findVisible(driver, buttonByLabel("Open buddy panel"), timeout);

  await clickVisible(driver, buttonByLabel("Open settings"), timeout);
  await findVisible(driver, By.xpath("//*[@role='heading' and normalize-space(.)='Settings'] | //h2[normalize-space(.)='Settings'] | //h1[normalize-space(.)='Settings']"), timeout);
  await clickVisible(driver, buttonByLabel("Close settings"), timeout);

  await clickVisible(driver, buttonByLabel("Open sidebar"), timeout);
  await findVisible(driver, By.xpath("//*[@role='dialog' and @aria-label='Navigation']"), timeout);
  await clickVisible(driver, drawerButtonByText("Files"), timeout);
  await findVisible(driver, By.xpath("//*[@role='dialog' and @aria-label='Navigation']//*[contains(normalize-space(.), 'Workspace root')]"), timeout);
  await clickVisible(driver, drawerButtonByText("buddy"), timeout);
  await clickVisible(driver, drawerButtonByText("companion.ts"), timeout);
  await findVisible(driver, By.xpath("//*[@role='dialog' and @aria-label='companion.ts']"), timeout);
  await findVisible(driver, By.xpath(containsTextXPath("companionUserId")), timeout);
  await clickVisible(driver, buttonByLabel("Close file viewer"), timeout);

  await messageBox.sendKeys(Key.CONTROL, "a", Key.BACK_SPACE);
  await messageBox.sendKeys(prompt);
  await clickVisible(driver, buttonByLabel("Send message"), timeout);
  await findVisible(driver, By.xpath(`//*[contains(normalize-space(.), 'AG-Claw research reply via') and contains(normalize-space(.), ${JSON.stringify(prompt)})]`), 30000);
}

export async function runDesktopWebSmoke(driver, {
  baseUrl,
  timeout = 15000,
} = {}) {
  await driver.get(baseUrl);
  await findVisible(driver, buttonByLabel("Message"), timeout);
  await findVisible(driver, By.css('main[aria-label="Chat"]'), timeout);
}
