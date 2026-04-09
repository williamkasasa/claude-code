import { mkdir, readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptfooDir = path.resolve(__dirname, "..");
const manifestPath = path.resolve(promptfooDir, "hf-eval-assets.manifest.json");

function parseArgs(argv) {
  const options = {
    dataset: "",
    all: false,
    limit: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dataset") {
      options.dataset = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (token === "--limit") {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.limit = Math.trunc(value);
      }
      index += 1;
      continue;
    }
    if (token === "--all") {
      options.all = true;
    }
  }

  return options;
}

function toFirstRowsUrl(entry) {
  const params = new URLSearchParams({
    dataset: entry.dataset,
    config: entry.config,
    split: entry.split,
  });

  return `https://datasets-server.huggingface.co/first-rows?${params.toString()}`;
}

function normalizeLimit(limit, defaultLimit, maxRows) {
  const bounded = limit ?? defaultLimit;
  return Math.max(1, Math.min(bounded, maxRows));
}

async function fetchJson(url) {
  const caFile = process.env.AGCLAW_HF_CA_FILE?.trim();
  const ca = caFile ? await readFile(caFile, "utf-8") : undefined;
  const agent = new https.Agent({
    rejectUnauthorized: process.env.AGCLAW_HF_ALLOW_INSECURE_TLS !== "1",
    ca,
  });

  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf-8");
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${body}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
  });
}

async function importDataset(datasetKey, entry, requestedLimit) {
  const payload = await fetchJson(toFirstRowsUrl(entry));
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const limit = normalizeLimit(requestedLimit, entry.defaultLimit, rows.length);
  const selectedRows = rows.slice(0, limit);

  const targetPath = path.resolve(promptfooDir, entry.output);
  await mkdir(path.dirname(targetPath), { recursive: true });

  const importedAt = new Date().toISOString();
  const records = selectedRows.map((item) =>
    JSON.stringify({
      dataset_key: datasetKey,
      dataset: entry.dataset,
      config: entry.config,
      split: entry.split,
      imported_at: importedAt,
      purpose: entry.purpose,
      governance: entry.governance,
      row_idx: item.row_idx,
      row: item.row,
      truncated_cells: item.truncated_cells ?? [],
    })
  );

  await writeFile(targetPath, records.join("\n") + "\n", "utf-8");
  return { datasetKey, targetPath, rowsImported: selectedRows.length };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
  const availableKeys = Object.keys(manifest.datasets ?? {});

  if (!options.all && !options.dataset) {
    throw new Error(`Specify --dataset <key> or --all. Available keys: ${availableKeys.join(", ")}`);
  }

  const selectedKeys = options.all ? availableKeys : [options.dataset];
  const results = [];

  for (const key of selectedKeys) {
    const entry = manifest.datasets[key];
    if (!entry) {
      throw new Error(`Unknown dataset key: ${key}`);
    }
    results.push(await importDataset(key, entry, options.limit));
  }

  for (const result of results) {
    console.log(`${result.datasetKey}: imported ${result.rowsImported} rows -> ${path.relative(promptfooDir, result.targetPath)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});