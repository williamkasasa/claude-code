const fs = require("fs");
const path = require("path");

function mimeTypeForExtension(extension) {
  switch (extension.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "http://127.0.0.1:11434").replace(/\/+$/, "");
}

function routeEnvName(baseName, routeKey) {
  if (!routeKey) {
    return baseName;
  }
  return `${baseName}_${String(routeKey).trim().replace(/[^a-z0-9]+/gi, "_").toUpperCase()}`;
}

function resolveRouteEnv(baseName, routeKey, fallback = "") {
  const routedValue = process.env[routeEnvName(baseName, routeKey)];
  if (typeof routedValue === "string" && routedValue.trim()) {
    return routedValue.trim();
  }
  const defaultValue = process.env[baseName];
  if (typeof defaultValue === "string" && defaultValue.trim()) {
    return defaultValue.trim();
  }
  return fallback;
}

function resolveRouteIntEnv(baseName, routeKey, fallback) {
  const value = resolveRouteEnv(baseName, routeKey, String(fallback));
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function endpointForProvider(provider, baseUrl) {
  if (provider === "github-models") {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
}

function headersForProvider(provider, apiKey) {
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  if (provider === "github-models") {
    headers["X-GitHub-Api-Version"] = "2022-11-28";
  }
  return headers;
}

async function resolveImageBytes(imageUrl) {
  if (!imageUrl) {
    return "";
  }
  if (imageUrl.startsWith("data:")) {
    return imageUrl.split(",", 2)[1] || "";
  }
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString("base64");
}

function resolveImageUrl(payload) {
  if (payload.image_url) {
    return payload.image_url;
  }

  if (!payload.image_path) {
    return "";
  }

  const absolutePath = path.isAbsolute(payload.image_path)
    ? payload.image_path
    : path.resolve(process.cwd(), payload.image_path);
  const extension = path.extname(absolutePath);
  const body = fs.readFileSync(absolutePath);
  return `data:${mimeTypeForExtension(extension)};base64,${body.toString("base64")}`;
}

function extractContent(response) {
  const firstChoice = response?.choices?.[0]?.message?.content;
  if (typeof firstChoice === "string") {
    return firstChoice;
  }
  if (Array.isArray(firstChoice)) {
    return firstChoice.map((part) => part?.text || "").join("");
  }
  return "";
}

function extractOllamaContent(response) {
  const content = response?.message?.content;
  return typeof content === "string" ? content : "";
}

async function buildRequestSpec(provider, baseUrl, apiKey, model, payload, imageUrl, routeKey) {
  if (provider === "ollama") {
    const image = await resolveImageBytes(imageUrl);
    return {
      endpoint: `${baseUrl}/api/chat`,
      headers: headersForProvider(provider, apiKey),
      body: {
        model,
        stream: false,
        keep_alive: resolveRouteEnv("AGCLAW_PROMPTFOO_VISION_KEEP_ALIVE", routeKey, "0s"),
        options: {
          temperature: 0.1,
          num_predict: 400,
        },
        messages: [
          {
            role: "system",
            content: payload.system_prompt || "You are a precise multimodal evaluator.",
          },
          {
            role: "user",
            content: payload.task || "Describe the image.",
            ...(image ? { images: [image] } : {}),
          },
        ],
      },
      parse: extractOllamaContent,
    };
  }

  return {
    endpoint: endpointForProvider(provider, baseUrl),
    headers: headersForProvider(provider, apiKey),
    body: {
      model,
      stream: false,
      temperature: 0.1,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: payload.system_prompt || "You are a precise multimodal evaluator.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: payload.task || "Describe the image." },
            ...(imageUrl ? [{ type: "image_url", image_url: { url: imageUrl, detail: "low" } }] : []),
          ],
        },
      ],
    },
    parse: extractContent,
  };
}

function resolveTemplateValue(value, vars) {
  if (typeof value !== "string") {
    return value;
  }
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_, key) => {
    const resolved = vars?.[String(key).trim()];
    return resolved == null ? "" : String(resolved);
  });
}

function resolvePromptPayload(prompt, context) {
  const payload = JSON.parse(String(prompt));
  const vars = context?.vars || {};
  return {
    route_key: resolveTemplateValue(payload.route_key, vars),
    system_prompt: resolveTemplateValue(payload.system_prompt, vars),
    task: resolveTemplateValue(payload.task, vars),
    image_path: resolveTemplateValue(payload.image_path, vars),
    image_url: resolveTemplateValue(payload.image_url, vars),
  };
}

class AgClawVisionProvider {
  constructor(options = {}) {
    this.providerId = options.id || "agclaw-vision-provider";
  }

  id() {
    return this.providerId;
  }

  async callApi(prompt, context = {}) {
    const payload = resolvePromptPayload(prompt, context);
    const routeKey = String(payload.route_key || context?.vars?.route_key || "").trim().toLowerCase();
    const provider = resolveRouteEnv("AGCLAW_PROMPTFOO_VISION_PROVIDER", routeKey, "ollama");
    const baseUrl = normalizeBaseUrl(resolveRouteEnv("AGCLAW_PROMPTFOO_VISION_BASE_URL", routeKey, "http://127.0.0.1:11434"));
    const model = resolveRouteEnv("AGCLAW_PROMPTFOO_VISION_MODEL", routeKey, "qwen2.5vl:3b");
    const apiKey = resolveRouteEnv("AGCLAW_PROMPTFOO_VISION_API_KEY", routeKey, "");
    const timeoutMs = resolveRouteIntEnv("AGCLAW_PROMPTFOO_VISION_TIMEOUT_MS", routeKey, 240000);
    const maxRetries = resolveRouteIntEnv("AGCLAW_PROMPTFOO_VISION_RETRIES", routeKey, 1);
    const imageUrl = resolveImageUrl(payload);
    const requestSpec = await buildRequestSpec(provider, baseUrl, apiKey, model, payload, imageUrl, routeKey);
    let lastError = "Unknown multimodal failure";

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await fetch(requestSpec.endpoint, {
          method: "POST",
          headers: requestSpec.headers,
          signal: AbortSignal.timeout(timeoutMs),
          body: JSON.stringify(requestSpec.body),
        });

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${await response.text()}`;
        } else {
          const result = await response.json();
          return { output: requestSpec.parse(result) };
        }
      } catch (error) {
        lastError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      }

      if (attempt < maxRetries) {
        await delay(1500 * (attempt + 1));
      }
    }

    return {
      error: lastError,
    };
  }
}

module.exports = AgClawVisionProvider;