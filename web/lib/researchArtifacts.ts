import {
  DEFAULT_PROVIDER_URLS,
  getModelOptions,
  isLocalProvider,
} from "./constants";
import type {
  AgentPackId,
  AppSettings,
  ChatProvider,
  Conversation,
  InvestigationBundlePayload,
  OrchestrationRolePlan,
  ResearchResponsePayload,
  WorkflowMode,
} from "./types";

export interface ResearchRouteResolution {
  provider: ChatProvider;
  apiUrl: string;
  model: string;
  laneLabel: string;
  rationale: string;
}

export interface BundleArtifactSource extends ResearchResponsePayload {
  prompt: string;
  createdAt: string;
  provider: string;
  model: string;
}

function makeModelMap(provider: ChatProvider): Record<AgentPackId, Record<WorkflowMode, string>> {
  switch (provider) {
    case "anthropic":
      return {
        "operator-swarm": {
          "fast-pass": "claude-haiku-4-5-20251001",
          "staged-report": "claude-sonnet-4-6",
          "review-heavy": "claude-opus-4-6",
        },
        "screen-review": {
          "fast-pass": "claude-sonnet-4-6",
          "staged-report": "claude-sonnet-4-6",
          "review-heavy": "claude-opus-4-6",
        },
        "promptfoo-audit": {
          "fast-pass": "claude-sonnet-4-6",
          "staged-report": "claude-sonnet-4-6",
          "review-heavy": "claude-opus-4-6",
        },
        "nano-chat": {
          "fast-pass": "claude-haiku-4-5-20251001",
          "staged-report": "claude-haiku-4-5-20251001",
          "review-heavy": "claude-sonnet-4-6",
        },
      };
    case "github-models":
      return {
        "operator-swarm": {
          "fast-pass": "openai/gpt-4.1-mini",
          "staged-report": "openai/gpt-4.1",
          "review-heavy": "openai/gpt-4.1",
        },
        "screen-review": {
          "fast-pass": "openai/gpt-4o-mini",
          "staged-report": "openai/gpt-4o",
          "review-heavy": "openai/gpt-4o",
        },
        "promptfoo-audit": {
          "fast-pass": "openai/gpt-4.1-mini",
          "staged-report": "openai/gpt-4.1",
          "review-heavy": "openai/gpt-4.1",
        },
        "nano-chat": {
          "fast-pass": "openai/gpt-4.1-nano",
          "staged-report": "openai/gpt-4.1-nano",
          "review-heavy": "openai/gpt-4.1-mini",
        },
      };
    case "openai":
      return {
        "operator-swarm": {
          "fast-pass": "gpt-4.1-mini",
          "staged-report": "gpt-4.1",
          "review-heavy": "gpt-4.1",
        },
        "screen-review": {
          "fast-pass": "gpt-4o-mini",
          "staged-report": "gpt-4o",
          "review-heavy": "gpt-4o",
        },
        "promptfoo-audit": {
          "fast-pass": "gpt-4.1-mini",
          "staged-report": "gpt-4.1",
          "review-heavy": "gpt-4.1",
        },
        "nano-chat": {
          "fast-pass": "gpt-4.1-nano",
          "staged-report": "gpt-4.1-nano",
          "review-heavy": "gpt-4.1-mini",
        },
      };
    case "openai-compatible":
    case "vllm":
      return {
        "operator-swarm": {
          "fast-pass": "Qwen/Qwen2.5-Coder-3B-Instruct",
          "staged-report": "Qwen/Qwen2.5-Coder-7B-Instruct",
          "review-heavy": "Qwen/Qwen2.5-Coder-14B-Instruct",
        },
        "screen-review": {
          "fast-pass": "Qwen/Qwen2.5-VL-3B-Instruct",
          "staged-report": "Qwen/Qwen2.5-VL-7B-Instruct",
          "review-heavy": "Qwen/Qwen2.5-VL-7B-Instruct",
        },
        "promptfoo-audit": {
          "fast-pass": "Qwen/Qwen2.5-Coder-7B-Instruct",
          "staged-report": "Qwen/Qwen3-Coder-30B-A3B-Instruct",
          "review-heavy": "Qwen/Qwen3-Coder-30B-A3B-Instruct",
        },
        "nano-chat": {
          "fast-pass": "Qwen/Qwen2.5-Coder-3B-Instruct",
          "staged-report": "Qwen/Qwen2.5-Coder-3B-Instruct",
          "review-heavy": "Qwen/Qwen2.5-Coder-7B-Instruct",
        },
      };
    case "ollama":
    default:
      return {
        "operator-swarm": {
          "fast-pass": "qwen2.5-coder:3b",
          "staged-report": "qwen2.5-coder:7b",
          "review-heavy": "qwen2.5-coder:7b",
        },
        "screen-review": {
          "fast-pass": "qwen2.5vl:3b",
          "staged-report": "qwen2.5-vl:7b",
          "review-heavy": "qwen2.5-vl:7b",
        },
        "promptfoo-audit": {
          "fast-pass": "qwen2.5-coder:3b",
          "staged-report": "qwen2.5-coder:7b",
          "review-heavy": "qwen2.5-coder:7b",
        },
        "nano-chat": {
          "fast-pass": "qwen2.5:3b",
          "staged-report": "qwen2.5:3b",
          "review-heavy": "qwen2.5-coder:3b",
        },
      };
  }
}

function describeLane(pack: AgentPackId, workflow: WorkflowMode): string {
  return `${pack.replace(/-/g, " ")} / ${workflow.replace(/-/g, " ")}`;
}

export function resolveResearchRoute(settings: AppSettings): ResearchRouteResolution {
  const provider = settings.provider;
  const pack = settings.integrations.activeAgentPack;
  const workflow = settings.integrations.workflowMode;
  const modelMap = makeModelMap(provider);
  const requestedModel = modelMap[pack]?.[workflow] ?? settings.model;
  const availableModelIds = new Set(getModelOptions(provider).map((item) => item.id));
  const model = availableModelIds.has(requestedModel) ? requestedModel : settings.model;
  const laneLabel = describeLane(pack, workflow);
  const localOrHosted = isLocalProvider(provider) || settings.localMode ? "local/edge" : "hosted";

  return {
    provider,
    apiUrl: settings.apiUrl || DEFAULT_PROVIDER_URLS[provider],
    model,
    laneLabel,
    rationale: `Resolved ${laneLabel} onto the ${localOrHosted} ${provider} lane with a model tuned for ${workflow.replace(/-/g, " ")} execution.`,
  };
}

function asBullets(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

function rolePlansText(rolePlans: OrchestrationRolePlan[]): string {
  return rolePlans
    .map((plan) => {
      const artifacts = plan.artifacts.map((artifact) => `- ${artifact.title} (${artifact.kind})`).join("\n") || "- none";
      return [
        `${plan.role.replace(/-/g, " ")}`,
        `Objective: ${plan.objective}`,
        "Findings:",
        asBullets(plan.findings),
        "Next actions:",
        asBullets(plan.next_actions),
        "Artifacts:",
        artifacts,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

function bundleText(bundle: InvestigationBundlePayload | null, source: BundleArtifactSource): string {
  if (!bundle) {
    return "No investigation bundle was attached to this run.";
  }
  return [
    `${bundle.label} (${bundle.status})`,
    `Agent pack: ${source.agent_pack}`,
    `Memory namespace: ${source.memory_namespace} (${source.memory_commit_mode})`,
    `Workflow mode: ${source.workflow_mode}`,
    `Workflow stages: ${bundle.workflow_stages.join(", ")}`,
    "",
    "Nano brief:",
    bundle.nano_summary,
    "",
    "Report sections:",
    asBullets(bundle.report_sections),
    "",
    "Artifact titles:",
    asBullets(bundle.artifact_titles),
    "",
    "Carry forward:",
    bundle.carry_forward,
  ].join("\n");
}

export function buildBundleConversation(source: BundleArtifactSource): Conversation {
  const createdAt = Number.isFinite(Date.parse(source.createdAt)) ? Date.parse(source.createdAt) : Date.now();
  const titleSeed = source.prompt.trim() || source.bundle?.label || "investigation bundle";
  const title = `${source.bundle?.label ?? "Investigation bundle"}: ${titleSeed}`.slice(0, 80);
  return {
    id: `bundle-${createdAt}`,
    title,
    createdAt,
    updatedAt: createdAt,
    model: source.model,
    messages: [
      {
        id: `bundle-prompt-${createdAt}`,
        role: "user",
        content: source.prompt,
        status: "complete",
        createdAt,
      },
      {
        id: `bundle-summary-${createdAt}`,
        role: "assistant",
        content: [
          source.summary,
          "",
          `Provider: ${source.provider}`,
          `Model: ${source.model}`,
          `Agent pack: ${source.agent_pack}`,
          `Memory namespace: ${source.memory_namespace}`,
          `Workflow mode: ${source.workflow_mode}`,
          "",
          `Nano brief: ${source.nano_summary || "none"}`,
        ].join("\n"),
        status: "complete",
        createdAt: createdAt + 1,
      },
      {
        id: `bundle-findings-${createdAt}`,
        role: "assistant",
        content: ["Findings:", asBullets(source.findings), "", "Follow-up actions:", asBullets(source.follow_up_actions)].join("\n"),
        status: "complete",
        createdAt: createdAt + 2,
      },
      {
        id: `bundle-roles-${createdAt}`,
        role: "assistant",
        content: rolePlansText(source.role_plans),
        status: "complete",
        createdAt: createdAt + 3,
      },
      {
        id: `bundle-packet-${createdAt}`,
        role: "assistant",
        content: bundleText(source.bundle, source),
        status: "complete",
        createdAt: createdAt + 4,
      },
    ],
  };
}

export function buildBundleFileStem(source: BundleArtifactSource): string {
  const head = (source.bundle?.label || "investigation-bundle").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const prompt = source.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  return `${head}-${prompt || "artifact"}`;
}