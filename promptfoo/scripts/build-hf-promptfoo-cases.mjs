import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptfooDir = path.resolve(__dirname, "..");
const generatedDir = path.resolve(promptfooDir, "generated");

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function keywordList(text, count = 2) {
  const stopWords = new Set(["the", "and", "for", "with", "this", "that", "page", "screen", "showing", "different", "option", "options", "displaying", "display"]);
  return [...new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3 && !stopWords.has(token))
      .sort((left, right) => right.length - left.length)
  )].slice(0, count);
}

function buildCaptionAssertions(item) {
  const rowIdx = Number(item.row_idx);

  if (rowIdx === 0) {
    return [
      {
        type: "icontains",
        value: "share",
      },
      {
        type: "icontains",
        value: "menu",
      },
    ];
  }

  if (rowIdx === 1) {
    return [
      {
        type: "icontains",
        value: "install",
      },
    ];
  }

  return keywordList(item.row?.text ?? "").map((keyword) => ({
    type: "icontains",
    value: keyword,
  }));
}

async function readCases(relativePath) {
  const absolutePath = path.resolve(promptfooDir, relativePath);
  return parseJsonl(await readFile(absolutePath, "utf-8"));
}

function buildCaptionConfig(rows) {
  return {
    description: "AG-Claw multimodal caption regression pack",
    prompts: ["file://../prompts/vision-caption.txt"],
    providers: ["file://../providers/agclawVisionProvider.js"],
    tests: rows.map((item) => ({
      description: `Caption sample ${item.row_idx}`,
      vars: {
        task: "Describe the main UI state in one short sentence.",
        image_path: item.local_image_path,
      },
      assert: buildCaptionAssertions(item),
    })),
  };
}

function buildOcrConfig(rows) {
  return {
    description: "AG-Claw OCR visual QA regression pack",
    prompts: ["file://../prompts/vision-ocr.txt"],
    providers: ["file://../providers/agclawVisionProvider.js"],
    tests: rows.map((item) => ({
      description: `OCR-VQA sample ${item.row_idx}`,
      vars: {
        image_path: item.local_image_path,
        question: item.row?.questions?.[0] ?? "What is visible in this image?",
      },
      assert: [
        {
          type: "icontains",
          value: item.row?.answers?.[0] ?? "",
        },
      ],
    })),
  };
}

async function writeConfig(fileName, config) {
  await mkdir(generatedDir, { recursive: true });
  const targetPath = path.resolve(generatedDir, fileName);
  await writeFile(targetPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

async function main() {
  const captionRows = await readCases("cases/hf/rico-screen2words.test.jsonl");
  const ocrRows = await readCases("cases/hf/ocr-vqa.validation.jsonl");

  if (!captionRows.length || !ocrRows.length) {
    throw new Error("HF case files are missing. Import the allowlisted datasets before building promptfoo suites.");
  }

  await writeConfig("vision-caption.config.json", buildCaptionConfig(captionRows.slice(0, 2)));
  await writeConfig("vision-ocr.config.json", buildOcrConfig(ocrRows.slice(0, 2)));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});