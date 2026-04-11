import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

function resolveBrowserExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    path.join(process.env.ProgramFiles ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.ProgramFiles ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function formatFindings(url, findings) {
  if (findings.length === 0) {
    return `No impeccable browser findings for ${url}`;
  }

  const lines = [`Impeccable browser findings for ${url}:`];
  findings.forEach((finding, index) => {
    lines.push(`${index + 1}. [${finding.id}] ${finding.snippet}`);
  });
  return lines.join("\n");
}

async function scanUrl(url, browserScript) {
  const launchArgs = process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
  const executablePath = resolveBrowserExecutable();
  const launchOptions = {
    headless: true,
    args: launchArgs,
    ...(executablePath ? { executablePath } : {}),
  };

  const browser = await puppeteer.launch(launchOptions);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    try {
      await page.waitForNetworkIdle({ idleTime: 750, timeout: 10000 });
    } catch {
      // Dynamic shells can keep background requests open; the DOM is sufficient for this audit.
    }
    await page.evaluate(browserScript);

    const findings = await page.evaluate(() => {
      if (!window.impeccableScan) {
        return [];
      }

      const allFindings = window.impeccableScan();
      return allFindings.flatMap(({ findings }) =>
        findings.map((finding) => ({ id: finding.type, snippet: finding.detail }))
      );
    });

    return findings;
  } finally {
    await browser.close();
  }
}

async function main() {
  const urls = process.argv.slice(2).filter((arg) => /^https?:\/\//i.test(arg));
  if (urls.length === 0) {
    console.error("Usage: node ./scripts/run-impeccable-url-audit.mjs <http-url> [more-urls]");
    process.exit(1);
  }

  const browserScriptPath = path.join(webRoot, "node_modules", "impeccable", "src", "detect-antipatterns-browser.js");
  if (!fs.existsSync(browserScriptPath)) {
    throw new Error(`Impeccable browser detector not found at ${browserScriptPath}`);
  }

  const browserScript = fs.readFileSync(browserScriptPath, "utf8");
  const results = [];
  for (const url of urls) {
    const findings = await scanUrl(url, browserScript);
    results.push(formatFindings(url, findings));
  }

  console.log(results.join("\n\n"));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});