import type { ChatProvider } from "./types";

export interface ModelOption {
  id: string;
  label: string;
  description: string;
}

export interface ProviderOption {
  id: ChatProvider;
  label: string;
  description: string;
}

export const PROVIDERS: ProviderOption[] = [
  {
    id: "anthropic",
    label: "Anthropic API",
    description: "Direct hosted Messages API endpoint",
  },
  {
    id: "github-models",
    label: "GitHub Models",
    description: "Hosted GitHub Models inference endpoint for chat-completions workloads",
  },
  {
    id: "openai",
    label: "OpenAI API",
    description: "Direct hosted OpenAI chat-completions endpoint",
  },
  {
    id: "openai-compatible",
    label: "OpenAI-Compatible Gateway",
    description: "Generic local or remote chat-completions endpoint",
  },
  {
    id: "ollama",
    label: "Ollama",
    description: "Local Ollama service through its chat-completions interface",
  },
  {
    id: "vllm",
    label: "vLLM",
    description: "Self-hosted vLLM inference server",
  },
];

export const DEFAULT_PROVIDER: ChatProvider = "anthropic";

export const DEFAULT_PROVIDER_URLS: Record<ChatProvider, string> = {
  anthropic: "https://api.anthropic.com",
  "github-models": "https://models.github.ai/inference",
  openai: "https://api.openai.com",
  "openai-compatible": "http://127.0.0.1:8000",
  ollama: "http://127.0.0.1:11434",
  vllm: "http://127.0.0.1:8000",
};

export const LOCAL_PROVIDERS: ChatProvider[] = ["ollama", "vllm", "openai-compatible"];

const HF_QWEN_CODER_7B: ModelOption = {
  id: "Qwen/Qwen2.5-Coder-7B-Instruct",
  label: "Qwen2.5 Coder 7B",
  description: "Compact open-weight coding model",
};

const HF_QWEN_CODER_3B: ModelOption = {
  id: "Qwen/Qwen2.5-Coder-3B-Instruct",
  label: "Qwen2.5 Coder 3B",
  description: "Lower-latency coding model for constrained local hardware",
};

const HF_QWEN_CODER_14B: ModelOption = {
  id: "Qwen/Qwen2.5-Coder-14B-Instruct",
  label: "Qwen2.5 Coder 14B",
  description: "Balanced coding model for local or hosted inference",
};

const HF_QWEN_CODER_32B: ModelOption = {
  id: "Qwen/Qwen2.5-Coder-32B-Instruct",
  label: "Qwen2.5 Coder 32B",
  description: "Higher-capability coding model for stronger hardware",
};

const HF_QWEN3_CODER_30B: ModelOption = {
  id: "Qwen/Qwen3-Coder-30B-A3B-Instruct",
  label: "Qwen3 Coder 30B A3B",
  description: "Newer coding-oriented open-weight option",
};

const HF_QWEN_VL_7B: ModelOption = {
  id: "Qwen/Qwen2.5-VL-7B-Instruct",
  label: "Qwen2.5 VL 7B",
  description: "Vision-capable model for HMI and screenshot review",
};

const HF_QWEN_VL_3B: ModelOption = {
  id: "Qwen/Qwen2.5-VL-3B-Instruct",
  label: "Qwen2.5 VL 3B",
  description: "Lower-footprint vision model for local HMI and screenshot review",
};

const HF_GEMMA4_E2B: ModelOption = {
  id: "google/gemma-4-E2B-it",
  label: "Gemma 4 E2B",
  description: "Compact multimodal open-weight model for local gateways and experimentation",
};

const HF_GEMMA4_E4B: ModelOption = {
  id: "google/gemma-4-E4B-it",
  label: "Gemma 4 E4B",
  description: "Stronger multimodal Gemma 4 variant for local or hosted-compatible inference",
};

const HF_GEMMA4_26B: ModelOption = {
  id: "google/gemma-4-26B-A4B-it",
  label: "Gemma 4 26B A4B",
  description: "Higher-capability Gemma 4 option for vLLM or OpenAI-compatible serving",
};

const MODEL_OPTIONS: Record<ChatProvider, ModelOption[]> = {
  anthropic: [
    { id: "claude-opus-4-6", label: "Claude Opus 4.6", description: "Most capable" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", description: "Balanced" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", description: "Fastest" },
  ],
  "github-models": [
    { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", description: "Fast hosted GitHub Models option" },
    { id: "openai/gpt-4.1", label: "GPT-4.1", description: "General-purpose hosted reasoning model" },
    { id: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano", description: "Lower-cost hosted GitHub Models option" },
    { id: "openai/gpt-4o-mini", label: "GPT-4o mini", description: "Compact multimodal hosted model" },
    { id: "openai/gpt-4o", label: "GPT-4o", description: "Stronger multimodal hosted model" },
  ],
  openai: [
    { id: "gpt-4.1-mini", label: "gpt-4.1-mini", description: "Fast hosted OpenAI option" },
    { id: "gpt-4.1", label: "gpt-4.1", description: "General-purpose hosted reasoning model" },
    { id: "gpt-4.1-nano", label: "gpt-4.1-nano", description: "Lower-cost hosted OpenAI option" },
    { id: "gpt-4o-mini", label: "gpt-4o-mini", description: "Compact multimodal model" },
    { id: "gpt-4o", label: "gpt-4o", description: "Higher-capability multimodal model" },
  ],
  "openai-compatible": [
    HF_QWEN_CODER_3B,
    HF_QWEN_CODER_7B,
    HF_QWEN_CODER_14B,
    HF_QWEN_CODER_32B,
    HF_QWEN3_CODER_30B,
    HF_QWEN_VL_3B,
    HF_QWEN_VL_7B,
    HF_GEMMA4_E2B,
    HF_GEMMA4_E4B,
    HF_GEMMA4_26B,
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B Instruct", description: "General local assistant" },
  ],
  ollama: [
    { id: "qwen2.5-coder:7b", label: "qwen2.5-coder:7b", description: "Good local coding default" },
    { id: "qwen2.5-coder:3b", label: "qwen2.5-coder:3b", description: "Faster local coding option for lower VRAM" },
    { id: "qwen2.5:3b", label: "qwen2.5:3b", description: "Small general-purpose local assistant" },
    { id: "qwen2.5vl:3b", label: "qwen2.5vl:3b", description: "Local multimodal model validated for HMI review" },
    { id: "llama3.2:3b", label: "llama3.2:3b", description: "Small general local assistant with broad ecosystem support" },
    { id: "gemma3:1b", label: "gemma3:1b", description: "Small Gemma-family local assistant for low-latency fallback" },
    { id: "qwen2.5-vl:7b", label: "qwen2.5-vl:7b", description: "Local vision-capable model for HMI review" },
    { id: "llama3.1:8b", label: "llama3.1:8b", description: "General-purpose local assistant" },
    { id: "deepseek-coder:6.7b", label: "deepseek-coder:6.7b", description: "Compact coding model" },
  ],
  vllm: [
    HF_QWEN_CODER_3B,
    HF_QWEN_CODER_7B,
    HF_QWEN_CODER_14B,
    HF_QWEN_CODER_32B,
    HF_QWEN3_CODER_30B,
    HF_QWEN_VL_3B,
    HF_QWEN_VL_7B,
    HF_GEMMA4_E2B,
    HF_GEMMA4_E4B,
    HF_GEMMA4_26B,
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B Instruct", description: "Common vLLM deployment" },
  ],
};

export const DEFAULT_MODEL = MODEL_OPTIONS[DEFAULT_PROVIDER][1].id;

export const API_ROUTES = {
  chat: "/api/chat",
  stream: "/api/stream",
  providerHealth: "/api/provider-health",
} as const;

export const MAX_MESSAGE_LENGTH = 100_000;

export const STREAMING_CHUNK_SIZE = 64;

export function getModelOptions(provider: ChatProvider): ModelOption[] {
  return MODEL_OPTIONS[provider];
}

export function getDefaultModelForProvider(provider: ChatProvider): string {
  return MODEL_OPTIONS[provider][0]?.id ?? DEFAULT_MODEL;
}

export function isLocalProvider(provider: ChatProvider): boolean {
  return LOCAL_PROVIDERS.includes(provider);
}

export function getProviderKeyLabel(provider: ChatProvider): string {
  switch (provider) {
    case "anthropic":
      return "Anthropic API key";
    case "github-models":
      return "GitHub token";
    case "openai":
      return "OpenAI API key";
    default:
      return "Bearer token";
  }
}

export function getProviderKeyPlaceholder(provider: ChatProvider): string {
  switch (provider) {
    case "anthropic":
      return "sk-ant-...";
    case "github-models":
      return "ghp_... or github_pat_...";
    case "openai":
      return "sk-...";
    case "ollama":
      return "Optional for proxied Ollama";
    default:
      return "Optional bearer token";
  }
}

export function getProviderHelpText(provider: ChatProvider): string {
  switch (provider) {
    case "anthropic":
      return "Required for direct Anthropic access. Stored locally in browser state only.";
    case "github-models":
      return "Required for hosted GitHub Models calls. Use a token with repo access if your org policy requires it.";
    case "openai":
      return "Required for direct OpenAI access. Stored locally in browser state only.";
    default:
      return "Optional for local providers unless your gateway requires a bearer token.";
  }
}
