"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, BookOpenText, Copy, Download, ExternalLink, Eye, FlaskConical, Route, Share2, Wand2, X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { getAgentPack, getMemoryNamespace, getWorkflowMode, getWorkflowStages } from "@/lib/integrations";
import { useNotificationStore } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type {
  InvestigationBundlePayload,
  OrchestrationHistoryDetail,
  OrchestrationHistoryItem,
  ResearchResponsePayload,
} from "@/lib/types";
import { buildBundleConversation, buildBundleFileStem, resolveResearchRoute, type BundleArtifactSource } from "@/lib/researchArtifacts";

type ResearchSection = "orchestrate" | "retrieve" | "log-slim" | "screen-review";

const SECTION_META: Record<ResearchSection, { label: string; icon: React.ElementType }> = {
  orchestrate: { label: "Orchestrate", icon: Wand2 },
  retrieve: { label: "ISA-95 Retrieval", icon: BookOpenText },
  "log-slim": { label: "Log Slimming", icon: FlaskConical },
  "screen-review": { label: "HMI Review", icon: Eye },
};

const DEFAULT_LOG_SAMPLE = [
  "2026-04-03T08:00:01Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:02Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:03Z Batch=42 started by operator=anne",
  "2026-04-03T08:00:04Z LINE1 ALARM 42 ACTIVE",
  "2026-04-03T08:00:05Z Batch=42 started by operator=anne",
].join("\n");

const DEFAULT_SCREEN_NOTES = "Alarm banner visible. Manual mode lit. Batch 42 recipe screen open with release hold indicator.";

function BundlePanel({
  bundle,
  title,
  actions,
  shareUrl,
}: {
  bundle: InvestigationBundlePayload;
  title: string;
  actions?: React.ReactNode;
  shareUrl?: string | null;
}) {
  return (
    <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-surface-500">{title}</div>
          <div className="mt-1 font-medium text-surface-100">{bundle.label}</div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <span className="rounded-full border border-emerald-800/70 bg-emerald-950/40 px-2 py-0.5 text-[11px] uppercase tracking-wide text-emerald-300">
            {bundle.status.replace(/-/g, " ")}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-surface-400">
        <span className="rounded-full border border-surface-700 px-2 py-0.5">{bundle.agent_pack}</span>
        <span className="rounded-full border border-surface-700 px-2 py-0.5">{bundle.memory_namespace}</span>
        <span className="rounded-full border border-surface-700 px-2 py-0.5">{bundle.workflow_mode}</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="text-xs uppercase tracking-wide text-surface-500">Nano brief</div>
          <p className="mt-2 text-surface-300">{bundle.nano_summary}</p>
          <div className="mt-4 text-xs uppercase tracking-wide text-surface-500">Report sections</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {bundle.report_sections.map((section) => (
              <span key={section} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                {section}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-surface-500">Artifact digest</div>
          <ul className="mt-2 space-y-2 text-surface-300">
            {bundle.artifact_titles.slice(0, 6).map((title) => (
              <li key={title}>- {title}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-surface-500">{bundle.carry_forward}</p>
          {shareUrl && (
            <div className="mt-3 rounded-md border border-surface-800 bg-surface-950/80 p-3">
              <div className="text-[11px] uppercase tracking-wide text-surface-500">Bundle share URL</div>
              <div className="mt-2 break-all text-xs text-surface-300">{shareUrl}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResearchWorkbench() {
  const { researchOpen, closeResearch, settings } = useChatStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const addToast = useNotificationStore((state) => state.addToast);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [activeSection, setActiveSection] = useState<ResearchSection>("orchestrate");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bundleShareUrls, setBundleShareUrls] = useState<Record<string, string>>({});

  const [orchestratePrompt, setOrchestratePrompt] = useState("Review the MES release flow for operator approvals and genealogy capture.");
  const [orchestrateResponse, setOrchestrateResponse] = useState<ResearchResponsePayload | null>(null);
  const [orchestrationHistory, setOrchestrationHistory] = useState<OrchestrationHistoryItem[]>([]);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<OrchestrationHistoryDetail | null>(null);

  const [retrieveQuery, setRetrieveQuery] = useState("material genealogy traceability");
  const [datasetCatalog, setDatasetCatalog] = useState<Array<{
    id: string;
    name: string;
    version: string;
    description: string;
    tags: string[];
  }>>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>(["isa95-core"]);
  const [retrieveResponse, setRetrieveResponse] = useState<null | {
    query: string;
    results: Array<{ source: string; title: string; excerpt: string; tags: string[] }>;
    datasets: Array<{ id: string; name: string; version: string; description: string; tags: string[] }>;
  }>(null);

  const [logText, setLogText] = useState(DEFAULT_LOG_SAMPLE);
  const [preserveTokens, setPreserveTokens] = useState("Batch=42, operator");
  const [logSlimResponse, setLogSlimResponse] = useState<null | {
    original_lines: number;
    kept_lines: number;
    text: string;
  }>(null);

  const [screenTitle, setScreenTitle] = useState("Mixer release screen");
  const [screenNotes, setScreenNotes] = useState(DEFAULT_SCREEN_NOTES);
  const [screenLabels, setScreenLabels] = useState("ALARM 42, MANUAL MODE, Batch 42, Release Hold");
  const [screenImageName, setScreenImageName] = useState("");
  const [screenImageDataUrl, setScreenImageDataUrl] = useState("");
  const [screenResponse, setScreenResponse] = useState<null | {
    summary: string;
    adapter: string;
    observations: string[];
    risks: string[];
    recommended_follow_up: string[];
  }>(null);

  const activePack = useMemo(() => getAgentPack(settings.integrations.activeAgentPack), [settings.integrations.activeAgentPack]);
  const activeNamespace = useMemo(
    () => getMemoryNamespace(settings.integrations.memoryNamespace),
    [settings.integrations.memoryNamespace]
  );
  const workflowMode = useMemo(() => getWorkflowMode(settings.integrations.workflowMode), [settings.integrations.workflowMode]);
  const workflowStages = useMemo(() => getWorkflowStages(settings.integrations.workflowMode), [settings.integrations.workflowMode]);
  const resolvedRoute = useMemo(() => resolveResearchRoute(settings), [settings]);
  const recentBundles = useMemo(
    () => orchestrationHistory.filter((item) => Boolean(item.bundle_label)),
    [orchestrationHistory]
  );

  const currentBundleSource = useMemo<BundleArtifactSource | null>(() => {
    if (!orchestrateResponse?.bundle) {
      return null;
    }
    return {
      ...orchestrateResponse,
      prompt: orchestratePrompt,
      createdAt: new Date().toISOString(),
      provider: resolvedRoute.provider,
      model: resolvedRoute.model,
    };
  }, [orchestratePrompt, orchestrateResponse, resolvedRoute.model, resolvedRoute.provider]);

  const persistedBundleSource = useMemo<BundleArtifactSource | null>(() => {
    if (!selectedHistoryDetail?.bundle) {
      return null;
    }
    return {
      ...selectedHistoryDetail,
      prompt: selectedHistoryDetail.prompt,
      createdAt: selectedHistoryDetail.created_at,
      provider: selectedHistoryDetail.provider,
    };
  }, [selectedHistoryDetail]);

  const exportBundle = useCallback(async (source: BundleArtifactSource, format: "json" | "markdown") => {
    const conversation = buildBundleConversation(source);
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation,
        options: {
          format,
          includeToolUse: false,
          includeThinking: false,
          includeTimestamps: true,
          includeFileContents: false,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const blob = await response.blob();
    const fileStem = buildBundleFileStem(source);
    const extension = format === "markdown" ? "md" : "json";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileStem}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const shareBundle = useCallback(async (shareKey: string, source: BundleArtifactSource) => {
    const conversation = buildBundleConversation(source);
    const response = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation,
        visibility: "unlisted",
        expiry: "24h",
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const payload = await response.json();
    setBundleShareUrls((current) => ({ ...current, [shareKey]: payload.url }));
    addToast({
      variant: "success",
      title: "Bundle share created",
      description: "A read-only link for this investigation bundle is ready.",
      duration: 4000,
    });
  }, [addToast]);

  const copyShareUrl = useCallback(async (shareKey: string) => {
    const shareUrl = bundleShareUrls[shareKey];
    if (!shareUrl) {
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    addToast({
      variant: "success",
      title: "Copied bundle link",
      duration: 2500,
    });
  }, [addToast, bundleShareUrls]);

  const renderBundleActions = useCallback((shareKey: string, source: BundleArtifactSource | null) => {
    if (!source?.bundle) {
      return null;
    }
    const shareUrl = bundleShareUrls[shareKey] ?? null;
    return {
      shareUrl,
      actions: (
        <>
          <button
            type="button"
            onClick={() => void exportBundle(source, "json")}
            className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            JSON
          </button>
          <button
            type="button"
            onClick={() => void exportBundle(source, "markdown")}
            className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Markdown
          </button>
          <button
            type="button"
            onClick={() => void shareBundle(shareKey, source)}
            className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share bundle
          </button>
          {shareUrl && (
            <>
              <button
                type="button"
                onClick={() => void copyShareUrl(shareKey)}
                className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy link
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-surface-700 px-2 py-1 text-xs text-surface-300 transition-colors hover:bg-surface-800 hover:text-surface-100"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Open share
              </a>
            </>
          )}
        </>
      ),
    };
  }, [bundleShareUrls, copyShareUrl, exportBundle, shareBundle]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/orchestration/history?limit=6");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setOrchestrationHistory(payload.items ?? []);
    } catch {
      setOrchestrationHistory([]);
    }
  }, []);

  const loadDatasetCatalog = useCallback(async () => {
    try {
      const response = await fetch("/api/mes/datasets");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setDatasetCatalog(payload.items ?? []);
    } catch {
      setDatasetCatalog([]);
    }
  }, []);

  const loadHistoryDetail = useCallback(async (detailId: string) => {
    try {
      const response = await fetch(`/api/orchestration/history/${encodeURIComponent(detailId)}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = await response.json();
      setSelectedHistoryDetail(payload);
    } catch {
      setSelectedHistoryDetail(null);
    }
  }, []);

  useEffect(() => {
    if (researchOpen) {
      void loadHistory();
      void loadDatasetCatalog();
    }
  }, [loadDatasetCatalog, loadHistory, researchOpen]);

  useEffect(() => {
    if (!researchOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeResearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeResearch, researchOpen]);

  const handleScreenFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setScreenImageName("");
      setScreenImageDataUrl("");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

    setScreenImageName(file.name);
    setScreenImageDataUrl(dataUrl);
  }, []);

  const content = useMemo(() => {
    if (activeSection === "orchestrate") {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
              <div className="text-xs uppercase tracking-wide text-surface-500">Active pack</div>
              <div className="mt-1 font-medium text-surface-100">{activePack.label}</div>
              <p className="mt-2 text-surface-400">{activePack.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePack.roles.map((role) => (
                  <span key={role.id} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                    {role.label}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Memory namespace</div>
              <p className="mt-1 text-surface-300">
                {activeNamespace.label}: {activeNamespace.commitModes[settings.integrations.memoryCommitMode]}
              </p>
              <div className="mt-4 rounded-md border border-surface-800 bg-surface-950/80 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-surface-500">
                  <Route className="h-3.5 w-3.5" aria-hidden="true" />
                  Resolved orchestration route
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-surface-400">
                  <span className="rounded-full border border-surface-700 px-2 py-0.5">{resolvedRoute.provider}</span>
                  <span className="rounded-full border border-surface-700 px-2 py-0.5">{resolvedRoute.model}</span>
                </div>
                <p className="mt-2 text-surface-400">{resolvedRoute.rationale}</p>
              </div>
            </div>
            <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
              <div className="text-xs uppercase tracking-wide text-surface-500">Workflow mode</div>
              <div className="mt-1 font-medium text-surface-100">{workflowMode.label}</div>
              <p className="mt-2 text-surface-400">{workflowMode.summary}</p>
              <div className="mt-3 space-y-2">
                {workflowStages.map((stage) => (
                  <div key={stage.id} className="rounded-md border border-surface-800 bg-surface-950/80 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-surface-500">{stage.order}</div>
                    <div className="mt-1 font-medium text-surface-200">{stage.label}</div>
                    <p className="mt-1 text-surface-400">{stage.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="research-orchestrate-prompt" className="mb-2 block text-sm font-medium text-surface-200">Research prompt</label>
            <textarea
              id="research-orchestrate-prompt"
              value={orchestratePrompt}
              onChange={(event) => setOrchestratePrompt(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/orchestrate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt: orchestratePrompt,
                    provider: resolvedRoute.provider,
                    model: resolvedRoute.model,
                    roles: activePack.roles.map((role) => role.id),
                    context: {
                      project_name: "ag-claw",
                      safety_mode: "advisory-only",
                      agent_pack: activePack.id,
                      memory_namespace: activeNamespace.id,
                      memory_commit_mode: settings.integrations.memoryCommitMode,
                      workflow_mode: workflowMode.id,
                      workflow_stages: workflowStages.map((stage) => stage.id),
                      routing_lane: resolvedRoute.laneLabel,
                      routing_rationale: resolvedRoute.rationale,
                    },
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setOrchestrateResponse(payload);
                setSelectedHistoryDetail(null);
                await loadHistory();
                addNotification({
                  title: "Research orchestration complete",
                  description: `${activePack.label} guidance is ready for review.`,
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "Research orchestration failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Running..." : "Run orchestration"}
          </button>
          {orchestrateResponse && (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                <div className="font-medium text-surface-100">{orchestrateResponse.summary}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-surface-400">
                  <span className="rounded-full border border-surface-700 px-2 py-0.5">{orchestrateResponse.agent_pack}</span>
                  <span className="rounded-full border border-surface-700 px-2 py-0.5">{orchestrateResponse.memory_namespace}</span>
                  <span className="rounded-full border border-surface-700 px-2 py-0.5">{orchestrateResponse.workflow_mode}</span>
                </div>
                <ul className="mt-3 space-y-2 text-surface-300">
                  {orchestrateResponse.findings.map((finding) => (
                    <li key={finding}>- {finding}</li>
                  ))}
                </ul>
              </div>
              {orchestrateResponse.bundle && (() => {
                const bundleActions = renderBundleActions("current", currentBundleSource);
                return (
                  <BundlePanel
                    bundle={orchestrateResponse.bundle}
                    title="Current investigation bundle"
                    actions={bundleActions?.actions}
                    shareUrl={bundleActions?.shareUrl}
                  />
                );
              })()}
              <div className="grid gap-4 lg:grid-cols-3">
                {orchestrateResponse.role_plans.map((plan) => (
                  <div key={plan.role} className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                    <div className="font-medium capitalize text-surface-100">{plan.role.replace(/-/g, " ")}</div>
                    <p className="mt-2 text-surface-400">{plan.objective}</p>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Findings</div>
                    <ul className="mt-2 space-y-2 text-surface-300">
                      {plan.findings.map((finding) => (
                        <li key={finding}>- {finding}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Next actions</div>
                    <ul className="mt-2 space-y-2 text-surface-300">
                      {plan.next_actions.map((action) => (
                        <li key={action}>- {action}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Artifacts</div>
                    <div className="mt-2 space-y-2">
                      {plan.artifacts.map((artifact) => (
                        <div key={`${plan.role}-${artifact.title}`} className="rounded-md border border-surface-800 bg-surface-950/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-medium text-surface-200">{artifact.title}</div>
                            <span className="rounded-full border border-surface-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-surface-400">
                              {artifact.kind}
                            </span>
                          </div>
                          <p className="mt-2 text-surface-400">{artifact.body}</p>
                          <div className="mt-2 text-[10px] uppercase tracking-wide text-amber-300">
                            {artifact.review_gate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
            <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Recent orchestration runs</div>
            <div className="space-y-3">
              {orchestrationHistory.length === 0 ? (
                <div className="text-surface-500">No persisted orchestration history yet.</div>
              ) : (
                orchestrationHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void loadHistoryDetail(item.detail_id || item.id)}
                    className="w-full rounded-md border border-surface-800 bg-surface-950/80 p-3 text-left transition-colors hover:border-surface-700"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500">
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                      <span>{item.provider}</span>
                      <span>{item.model}</span>
                      <span>{item.artifact_count} artifacts</span>
                    </div>
                    <div className="mt-2 font-medium text-surface-200">{item.summary}</div>
                    <p className="mt-1 text-surface-400">{item.prompt}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-surface-400">
                      <span className="rounded-full border border-surface-700 px-2 py-0.5">{item.agent_pack}</span>
                      <span className="rounded-full border border-surface-700 px-2 py-0.5">{item.workflow_mode}</span>
                      {item.bundle_label && (
                        <span className="rounded-full border border-emerald-800/70 px-2 py-0.5 text-emerald-300">
                          {item.bundle_label}
                        </span>
                      )}
                    </div>
                    {item.nano_summary && <p className="mt-2 text-xs text-surface-500">{item.nano_summary}</p>}
                  </button>
                ))
              )}
            </div>
          </div>
          {recentBundles.length > 0 && (
            <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
              <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Recent investigation bundles</div>
              <div className="space-y-3">
                {recentBundles.map((item) => (
                  <button
                    key={`bundle-${item.id}`}
                    type="button"
                    onClick={() => void loadHistoryDetail(item.detail_id || item.id)}
                    className="w-full rounded-md border border-surface-800 bg-surface-950/80 p-3 text-left transition-colors hover:border-surface-700"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500">
                      <span>{item.bundle_label}</span>
                      <span>{item.bundle_status.replace(/-/g, " ")}</span>
                      <span>{item.memory_namespace}</span>
                    </div>
                    <div className="mt-2 font-medium text-surface-200">{item.summary}</div>
                    <p className="mt-1 text-surface-500">{item.nano_summary}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedHistoryDetail && (
            <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Persisted orchestration detail</div>
                  <div className="mt-1 font-medium text-surface-100">{selectedHistoryDetail.summary}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryDetail(null)}
                  className="rounded-md border border-surface-700 px-3 py-1 text-xs text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                >
                  Clear
                </button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Prompt</div>
                  <p className="mt-2 text-surface-300">{selectedHistoryDetail.prompt}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-surface-400">
                    <span className="rounded-full border border-surface-700 px-2 py-0.5">{selectedHistoryDetail.agent_pack}</span>
                    <span className="rounded-full border border-surface-700 px-2 py-0.5">{selectedHistoryDetail.memory_namespace}</span>
                    <span className="rounded-full border border-surface-700 px-2 py-0.5">{selectedHistoryDetail.workflow_mode}</span>
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-surface-500">Follow-up actions</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {selectedHistoryDetail.follow_up_actions.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-surface-500">Persisted findings</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {selectedHistoryDetail.findings.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {selectedHistoryDetail.bundle && (() => {
                const bundleActions = renderBundleActions(`persisted-${selectedHistoryDetail.id}`, persistedBundleSource);
                return (
                  <div className="mt-4">
                    <BundlePanel
                      bundle={selectedHistoryDetail.bundle}
                      title="Persisted investigation bundle"
                      actions={bundleActions?.actions}
                      shareUrl={bundleActions?.shareUrl}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "retrieve") {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="research-retrieve-query" className="mb-2 block text-sm font-medium text-surface-200">Query</label>
            <input
              id="research-retrieve-query"
              value={retrieveQuery}
              onChange={(event) => setRetrieveQuery(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          {datasetCatalog.length > 0 && (
            <div>
              <div className="mb-2 block text-sm font-medium text-surface-200">Datasets</div>
              <div className="grid gap-2 md:grid-cols-2">
                {datasetCatalog.map((dataset) => {
                  const checked = selectedDatasetIds.includes(dataset.id);
                  return (
                    <label
                      key={dataset.id}
                      className="flex cursor-pointer gap-3 rounded-md border border-surface-800 bg-surface-900/70 p-3 text-sm text-surface-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedDatasetIds((current) =>
                            checked ? current.filter((item) => item !== dataset.id) : [...current, dataset.id]
                          );
                        }}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-surface-100">{dataset.name}</div>
                        <div className="mt-1 text-xs text-surface-500">{dataset.version}</div>
                        <p className="mt-2 text-xs text-surface-400">{dataset.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/mes/retrieve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    query: retrieveQuery,
                    domains: ["isa-95"],
                    limit: 5,
                    dataset_ids: selectedDatasetIds,
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setRetrieveResponse(payload);
                addNotification({
                  title: "MES retrieval complete",
                  description: "ISA-95 research references are ready.",
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "MES retrieval failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <BookOpenText className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Searching..." : "Retrieve research"}
          </button>
          {retrieveResponse && (
            <div className="space-y-3">
              {retrieveResponse.datasets.length > 0 && (
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Datasets used</div>
                  <div className="flex flex-wrap gap-2">
                    {retrieveResponse.datasets.map((dataset) => (
                      <span key={dataset.id} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                        {dataset.name} {dataset.version}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {retrieveResponse.results.map((result) => (
                <div key={`${result.source}-${result.title}`} className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="font-medium text-surface-100">{result.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-surface-500">{result.source}</div>
                  <p className="mt-3 text-surface-300">{result.excerpt}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeSection === "screen-review") {
      return (
        <div className="space-y-4">
          <div>
            <label htmlFor="research-screen-title" className="mb-2 block text-sm font-medium text-surface-200">Screen title</label>
            <input
              id="research-screen-title"
              value={screenTitle}
              onChange={(event) => setScreenTitle(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="research-screen-notes" className="mb-2 block text-sm font-medium text-surface-200">Screenshot notes / OCR text</label>
            <textarea
              id="research-screen-notes"
              value={screenNotes}
              onChange={(event) => setScreenNotes(event.target.value)}
              rows={5}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="research-screen-labels" className="mb-2 block text-sm font-medium text-surface-200">Visible labels</label>
            <input
              id="research-screen-labels"
              value={screenLabels}
              onChange={(event) => setScreenLabels(event.target.value)}
              className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="research-screen-file" className="mb-2 block text-sm font-medium text-surface-200">Optional screenshot</label>
            <input
              id="research-screen-file"
              type="file"
              accept="image/*"
              onChange={async (event) => {
                try {
                  await handleScreenFileChange(event.target.files?.[0] ?? null);
                } catch (error) {
                  addNotification({
                    title: "Screenshot load failed",
                    description: error instanceof Error ? error.message : "Unknown error",
                    category: "error",
                  });
                }
              }}
              className="block w-full text-sm text-surface-300 file:mr-4 file:rounded-md file:border-0 file:bg-surface-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-surface-100 hover:file:bg-surface-700"
            />
            {screenImageName && (
              <div className="mt-2 text-xs text-surface-500">Attached: {screenImageName}</div>
            )}
          </div>
          <button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const response = await fetch("/api/mes/interpret-screen", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: screenTitle,
                    notes: screenNotes,
                    visible_labels: screenLabels.split(",").map((value) => value.trim()).filter(Boolean),
                    image_name: screenImageName,
                    image_data_url: screenImageDataUrl,
                  }),
                });
                if (!response.ok) {
                  throw new Error(await response.text());
                }
                const payload = await response.json();
                setScreenResponse(payload);
                addNotification({
                  title: "HMI review complete",
                  description: "Screen observations are ready for review.",
                  category: "activity",
                });
              } catch (error) {
                addNotification({
                  title: "HMI review failed",
                  description: error instanceof Error ? error.message : "Unknown error",
                  category: "error",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? "Reviewing..." : "Interpret screen"}
          </button>
          {screenResponse && (
            <div className="space-y-4">
              <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                <div className="font-medium text-surface-100">{screenResponse.summary}</div>
                <div className="mt-2 text-xs uppercase tracking-wide text-surface-500">Adapter: {screenResponse.adapter}</div>
              </div>
              {screenImageDataUrl && (
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="mb-3 text-xs uppercase tracking-wide text-surface-500">Attached screenshot</div>
                  <Image
                    src={screenImageDataUrl}
                    alt={screenImageName || "Uploaded HMI screenshot"}
                    width={640}
                    height={360}
                    unoptimized
                    className="max-h-72 w-auto rounded-md border border-surface-800 object-contain"
                  />
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Observations</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.observations.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Risks</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.risks.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
                  <div className="text-xs uppercase tracking-wide text-surface-500">Recommended follow-up</div>
                  <ul className="mt-2 space-y-2 text-surface-300">
                    {screenResponse.recommended_follow_up.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="research-log-text" className="mb-2 block text-sm font-medium text-surface-200">Raw industrial log</label>
          <textarea
            id="research-log-text"
            value={logText}
            onChange={(event) => setLogText(event.target.value)}
            rows={7}
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label htmlFor="research-preserve-tokens" className="mb-2 block text-sm font-medium text-surface-200">Preserve tokens</label>
          <input
            id="research-preserve-tokens"
            value={preserveTokens}
            onChange={(event) => setPreserveTokens(event.target.value)}
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={async () => {
            setIsSubmitting(true);
            try {
              const response = await fetch("/api/mes/log-slim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: logText,
                  preserve_tokens: preserveTokens.split(",").map((value) => value.trim()).filter(Boolean),
                  max_lines: 4,
                }),
              });
              if (!response.ok) {
                throw new Error(await response.text());
              }
              const payload = await response.json();
              setLogSlimResponse(payload);
              addNotification({
                title: "Log slimming complete",
                description: "Noise-reduced industrial log is ready.",
                category: "activity",
              });
            } catch (error) {
              addNotification({
                title: "Log slimming failed",
                description: error instanceof Error ? error.message : "Unknown error",
                category: "error",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-surface-800 disabled:text-surface-500"
        >
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Slimming..." : "Slim log"}
        </button>
        {logSlimResponse && (
          <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
            <div className="mb-2 text-xs text-surface-500">
              {logSlimResponse.kept_lines} of {logSlimResponse.original_lines} lines kept
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-surface-950 p-3 text-xs text-surface-300">
              {logSlimResponse.text}
            </pre>
          </div>
        )}
      </div>
    );
  }, [activeNamespace, activePack, activeSection, addNotification, currentBundleSource, datasetCatalog, handleScreenFileChange, isSubmitting, loadHistory, loadHistoryDetail, logSlimResponse, logText, orchestrationHistory, orchestratePrompt, orchestrateResponse, persistedBundleSource, preserveTokens, recentBundles, renderBundleActions, resolvedRoute, retrieveQuery, retrieveResponse, screenImageDataUrl, screenImageName, screenLabels, screenNotes, screenResponse, screenTitle, selectedDatasetIds, selectedHistoryDetail, settings.integrations.memoryCommitMode, workflowMode, workflowStages]);

  if (!researchOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="research-workbench-title"
        aria-describedby="research-workbench-description"
        className="flex h-[min(48rem,92vh)] w-[min(76rem,100%)] overflow-hidden rounded-2xl border border-surface-800 bg-surface-950 shadow-2xl"
      >
        <div className="flex w-64 flex-col border-r border-surface-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="research-workbench-title" className="text-lg font-semibold text-surface-100">Research Workbench</h2>
              <p id="research-workbench-description" className="text-xs text-surface-500">Clean-room orchestration and MES analysis tools.</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeResearch}
              className="rounded-md p-2 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
              aria-label="Close research workbench"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-2">
            {(Object.keys(SECTION_META) as ResearchSection[]).map((section) => {
              const Icon = SECTION_META[section].icon;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    activeSection === section
                      ? "bg-surface-800 text-surface-100"
                      : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {SECTION_META[section].label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">{content}</div>
      </div>
    </div>
  );
}
