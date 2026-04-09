import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULT_MODELS = ["qwen2.5:3b", "gemma3:1b"];
const DEFAULT_PROMPTS = [
  {
    id: "handoff-summary",
    prompt:
      "Summarize a manufacturing shift handoff in four bullet points: line 2 restarted, alarm 42 cleared, batch 17 awaiting QA release, and one CIP rinse still running.",
  },
  {
    id: "safety-triage",
    prompt:
      "A mixer HMI shows MANUAL MODE, release hold active, and an alarm banner. Give a short advisory-only response with the top three operator checks.",
  },
  {
    id: "traceability",
    prompt:
      "Explain why batch genealogy capture matters in ISA-95 style MES workflows using three concise sentences.",
  },
];

function parseArgs(argv) {
  const options = {
    models: DEFAULT_MODELS,
    apiBase: "http://127.0.0.1:11434",
    apiKey: process.env.AGCLAW_BENCHMARK_API_KEY ?? "",
    output: path.resolve(repoRoot, "scripts", "reports", "local-assistant-benchmark.json"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--models") {
      options.models = (argv[index + 1] ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (token === "--api-base") {
      options.apiBase = argv[index + 1] ?? options.apiBase;
      index += 1;
      continue;
    }
    if (token === "--api-key") {
      options.apiKey = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (token === "--output") {
      options.output = path.resolve(repoRoot, argv[index + 1] ?? options.output);
      index += 1;
    }
  }

  if (options.models.length === 0) {
    throw new Error("At least one model is required. Pass --models model-a,model-b.");
  }

  return options;
}

function normalizeEndpoint(apiBase) {
  const trimmed = apiBase.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function extractContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((part) => part?.text ?? "").join("");
  }
  return "";
}

async function runPrompt(endpoint, apiKey, model, prompt) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      stream: false,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are concise, factual, and advisory-only for industrial workflows." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return {
    latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
    text: extractContent(payload),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const endpoint = normalizeEndpoint(options.apiBase);
  const runAt = new Date().toISOString();
  const results = [];

  for (const model of options.models) {
    const samples = [];
    for (const promptCase of DEFAULT_PROMPTS) {
      try {
        const result = await runPrompt(endpoint, options.apiKey, model, promptCase.prompt);
        samples.push({
          promptId: promptCase.id,
          latencyMs: result.latencyMs,
          responseChars: result.text.length,
          excerpt: result.text.slice(0, 220),
        });
      } catch (error) {
        samples.push({
          promptId: promptCase.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successful = samples.filter((sample) => typeof sample.latencyMs === "number");
    results.push({
      model,
      endpoint,
      prompts: samples,
      summary: {
        successes: successful.length,
        failures: samples.length - successful.length,
        averageLatencyMs:
          successful.length > 0
            ? Math.round(
                (successful.reduce((total, sample) => total + sample.latencyMs, 0) / successful.length) * 100
              ) / 100
            : null,
        averageResponseChars:
          successful.length > 0
            ? Math.round(
                successful.reduce((total, sample) => total + sample.responseChars, 0) / successful.length
              )
            : null,
      },
    });
  }

  const output = {
    runAt,
    endpoint,
    prompts: DEFAULT_PROMPTS.map(({ id, prompt }) => ({ id, prompt })),
    results,
  };

  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log(JSON.stringify(output, null, 2));
  console.error(`Wrote benchmark report to ${path.relative(repoRoot, options.output)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});