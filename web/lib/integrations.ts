import type {
  AgentPackId,
  MemoryCommitMode,
  MemoryNamespaceId,
  WorkflowMode,
} from "./types";

export interface AgentPackRole {
  id: string;
  label: string;
  objective: string;
}

export interface AgentPackDefinition {
  id: AgentPackId;
  label: string;
  summary: string;
  deliverable: string;
  roles: AgentPackRole[];
}

export interface MemoryNamespaceDefinition {
  id: MemoryNamespaceId;
  label: string;
  summary: string;
  commitModes: Record<MemoryCommitMode, string>;
}

export interface WorkflowStage {
  id: string;
  label: string;
  description: string;
  order: string;
}

export interface WorkflowModeDefinition {
  id: WorkflowMode;
  label: string;
  summary: string;
}

const AGENT_PACK_MAP: Record<AgentPackId, AgentPackDefinition> = {
  "operator-swarm": {
    id: "operator-swarm",
    label: "Operator swarm",
    summary: "Balanced default pack for plant-safe troubleshooting, genealogy checks, and review-gated advice.",
    deliverable: "Operator-facing plan with explicit review gates.",
    roles: [
      { id: "plc-analyst", label: "PLC analyst", objective: "Trace automation state, alarms, and release logic." },
      { id: "devops", label: "DevOps", objective: "Check runtime dependencies, service health, and rollback options." },
      { id: "safety", label: "Safety", objective: "Flag human-review gates, override risk, and evidence gaps." },
    ],
  },
  "screen-review": {
    id: "screen-review",
    label: "Screen review pack",
    summary: "Focused pack for HMI interpretation, label validation, and advisory-only operator follow-up.",
    deliverable: "Annotated HMI review with risks, observations, and follow-up notes.",
    roles: [
      { id: "screen-reviewer", label: "Screen reviewer", objective: "Interpret HMI state, visible labels, and screen hierarchy." },
      { id: "alarm-triage", label: "Alarm triage", objective: "Assess banner severity, operator state, and unsafe ambiguity." },
      { id: "operator-handoff", label: "Operator handoff", objective: "Produce a concise review note for shift turnover." },
    ],
  },
  "promptfoo-audit": {
    id: "promptfoo-audit",
    label: "Promptfoo audit pack",
    summary: "Evaluation-oriented pack for multimodal gate findings, artifact review, and remediation notes.",
    deliverable: "Gate summary with failure analysis and remediation backlog.",
    roles: [
      { id: "eval-analyst", label: "Eval analyst", objective: "Summarize pack results, regression patterns, and confidence." },
      { id: "artifact-reviewer", label: "Artifact reviewer", objective: "Compare screenshots, prompts, and expected evidence." },
      { id: "remediation-owner", label: "Remediation owner", objective: "Turn findings into concrete follow-up fixes and checks." },
    ],
  },
  "nano-chat": {
    id: "nano-chat",
    label: "Nano chat pack",
    summary: "Nanochat-style pack for compact context retention, one-screen briefs, and sharply edited replies.",
    deliverable: "Condensed brief with a minimal carry-forward context window.",
    roles: [
      { id: "nano-brief", label: "Nano brief", objective: "Compress the investigation into a one-screen summary." },
      { id: "context-keeper", label: "Context keeper", objective: "Retain only the facts required for the next turn." },
      { id: "reply-editor", label: "Reply editor", objective: "Shape the final response for brevity and scanability." },
    ],
  },
};

const MEMORY_NAMESPACE_MAP: Record<MemoryNamespaceId, MemoryNamespaceDefinition> = {
  "operator-session": {
    id: "operator-session",
    label: "Operator session",
    summary: "Short-lived recall for the current operator flow, recent prompts, and active review gates.",
    commitModes: {
      "manual-review": "Only commit notes when the operator explicitly accepts them.",
      "session-handoff": "Capture a shift handoff summary at the end of the session.",
      "investigation-summary": "Store a compact investigation digest after review.",
    },
  },
  "task-memory": {
    id: "task-memory",
    label: "Task memory",
    summary: "Thread-specific recall for orchestration history, retrieved datasets, and next actions.",
    commitModes: {
      "manual-review": "Keep task notes draft-only until a reviewer confirms them.",
      "session-handoff": "Roll the current task state into the next handoff.",
      "investigation-summary": "Promote task conclusions into a reusable summary.",
    },
  },
  "plant-reference": {
    id: "plant-reference",
    label: "Plant reference",
    summary: "Durable knowledge bucket for recipes, genealogy checkpoints, and plant-facing reference material.",
    commitModes: {
      "manual-review": "Require reviewer approval before durable plant knowledge is updated.",
      "session-handoff": "Prepare durable notes for the next operator or engineer handoff.",
      "investigation-summary": "Write a reviewed reference summary after the investigation closes.",
    },
  },
  "investigation-bundle": {
    id: "investigation-bundle",
    label: "Investigation bundle",
    summary: "Bundle retrieved evidence, orchestration artifacts, and recommended next steps into one shareable packet.",
    commitModes: {
      "manual-review": "Keep the bundle draft-only until human reviewers sign off.",
      "session-handoff": "Package the bundle for the next responder to continue.",
      "investigation-summary": "Freeze the bundle as the final reviewed investigation record.",
    },
  },
};

const WORKFLOW_MODE_MAP: Record<WorkflowMode, WorkflowModeDefinition> = {
  "staged-report": {
    id: "staged-report",
    label: "Staged report",
    summary: "Retrieve, interpret, summarize, and report in explicit stages.",
  },
  "fast-pass": {
    id: "fast-pass",
    label: "Fast pass",
    summary: "Condensed review path for quick triage and next-step generation.",
  },
  "review-heavy": {
    id: "review-heavy",
    label: "Review heavy",
    summary: "Adds an explicit challenge-and-review stage before recommendations are emitted.",
  },
};

const WORKFLOW_STAGE_MAP: Record<WorkflowMode, WorkflowStage[]> = {
  "staged-report": [
    { id: "retrieve", label: "Retrieve", description: "Gather relevant datasets, prompts, and recent context.", order: "Stage 1" },
    { id: "interpret", label: "Interpret", description: "Translate findings into operator-safe meaning.", order: "Stage 2" },
    { id: "report", label: "Report", description: "Package artifacts and recommendations into a reviewable report.", order: "Stage 3" },
  ],
  "fast-pass": [
    { id: "triage", label: "Triage", description: "Pull only the highest-signal evidence for the current question.", order: "Stage 1" },
    { id: "nano-brief", label: "Nano brief", description: "Compress the working set into a one-screen update before the full handoff.", order: "Stage 2" },
    { id: "handoff", label: "Handoff", description: "Prepare a short carry-forward note if work is unfinished.", order: "Stage 3" },
  ],
  "review-heavy": [
    { id: "retrieve", label: "Retrieve", description: "Collect the working set of evidence and prior context.", order: "Stage 1" },
    { id: "challenge", label: "Challenge", description: "Cross-check the initial reading for missed contradictions and safety gaps.", order: "Stage 2" },
    { id: "human-review", label: "Human review", description: "Hold recommendations behind an explicit review gate.", order: "Stage 3" },
  ],
};

export const AGENT_PACKS = Object.values(AGENT_PACK_MAP);
export const MEMORY_NAMESPACES = Object.values(MEMORY_NAMESPACE_MAP);
export const WORKFLOW_MODES = Object.values(WORKFLOW_MODE_MAP);

export function getAgentPack(id: AgentPackId): AgentPackDefinition {
  return AGENT_PACK_MAP[id];
}

export function getMemoryNamespace(id: MemoryNamespaceId): MemoryNamespaceDefinition {
  return MEMORY_NAMESPACE_MAP[id];
}

export function getWorkflowMode(id: WorkflowMode): WorkflowModeDefinition {
  return WORKFLOW_MODE_MAP[id];
}

export function getWorkflowStages(id: WorkflowMode): WorkflowStage[] {
  return WORKFLOW_STAGE_MAP[id];
}