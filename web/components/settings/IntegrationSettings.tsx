"use client";

import { useMemo } from "react";
import { useChatStore } from "@/lib/store";
import {
  AGENT_PACKS,
  MEMORY_NAMESPACES,
  WORKFLOW_MODES,
  getAgentPack,
  getMemoryNamespace,
  getWorkflowStages,
} from "@/lib/integrations";
import { SectionHeader, SettingRow, Toggle } from "./SettingRow";

export function IntegrationSettings() {
  const { settings, updateSettings, resetSettings } = useChatStore();
  const activePack = useMemo(
    () => getAgentPack(settings.integrations.activeAgentPack),
    [settings.integrations.activeAgentPack]
  );
  const activeNamespace = useMemo(
    () => getMemoryNamespace(settings.integrations.memoryNamespace),
    [settings.integrations.memoryNamespace]
  );
  const activeStages = useMemo(
    () => getWorkflowStages(settings.integrations.workflowMode),
    [settings.integrations.workflowMode]
  );

  return (
    <div>
      <SectionHeader title="Integrations" onReset={() => resetSettings("integrations")} />

      <SettingRow
        label="Pretext measurement"
        description="Use the real Pretext layout engine for chat composer sizing and measured previews instead of the old heuristic fallback."
      >
        <Toggle
          checked={settings.integrations.pretextEnabled}
          onChange={(value) =>
            updateSettings({
              integrations: { ...settings.integrations, pretextEnabled: value },
            })
          }
        />
      </SettingRow>

      <SettingRow
        label="Agent pack"
        description="Agency-style pack selection for Buddy guidance and research orchestration roles."
        stack
      >
        <select
          value={settings.integrations.activeAgentPack}
          onChange={(event) =>
            updateSettings({
              integrations: {
                ...settings.integrations,
                activeAgentPack: event.target.value as typeof settings.integrations.activeAgentPack,
              },
            })
          }
          className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          aria-label="Agent pack"
        >
          {AGENT_PACKS.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.label}
            </option>
          ))}
        </select>
        <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
          <div className="font-medium text-surface-100">{activePack.label}</div>
          <p className="mt-2 text-surface-400">{activePack.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activePack.roles.map((role) => (
              <span key={role.id} className="rounded-full border border-surface-700 px-2 py-0.5 text-xs text-surface-400">
                {role.label}
              </span>
            ))}
          </div>
        </div>
      </SettingRow>

      <SettingRow
        label="Memory namespace"
        description="OpenViking-inspired namespace and commit behavior for session recall, handoff, and investigation bundles."
        stack
      >
        <div className="grid gap-3 md:grid-cols-2">
          <select
            value={settings.integrations.memoryNamespace}
            onChange={(event) =>
              updateSettings({
                integrations: {
                  ...settings.integrations,
                  memoryNamespace: event.target.value as typeof settings.integrations.memoryNamespace,
                },
              })
            }
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            aria-label="Memory namespace"
          >
            {MEMORY_NAMESPACES.map((namespace) => (
              <option key={namespace.id} value={namespace.id}>
                {namespace.label}
              </option>
            ))}
          </select>
          <select
            value={settings.integrations.memoryCommitMode}
            onChange={(event) =>
              updateSettings({
                integrations: {
                  ...settings.integrations,
                  memoryCommitMode: event.target.value as typeof settings.integrations.memoryCommitMode,
                },
              })
            }
            className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
            aria-label="Memory commit mode"
          >
            <option value="manual-review">Manual review</option>
            <option value="session-handoff">Session handoff</option>
            <option value="investigation-summary">Investigation summary</option>
          </select>
        </div>
        <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
          <div className="font-medium text-surface-100">{activeNamespace.label}</div>
          <p className="mt-2 text-surface-400">{activeNamespace.summary}</p>
          <div className="mt-3 text-xs uppercase tracking-wide text-surface-500">Commit behavior</div>
          <p className="mt-1 text-surface-300">{activeNamespace.commitModes[settings.integrations.memoryCommitMode]}</p>
        </div>
      </SettingRow>

      <SettingRow
        label="Workflow mode"
        description="MiroFish-style staged orchestration presets for the research workbench."
        stack
      >
        <select
          value={settings.integrations.workflowMode}
          onChange={(event) =>
            updateSettings({
              integrations: {
                ...settings.integrations,
                workflowMode: event.target.value as typeof settings.integrations.workflowMode,
              },
            })
          }
          className="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-brand-500"
          aria-label="Workflow mode"
        >
          {WORKFLOW_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
        <div className="grid gap-3 md:grid-cols-3">
          {activeStages.map((stage) => (
            <div key={stage.id} className="rounded-xl border border-surface-800 bg-surface-900/70 p-4 text-sm text-surface-200">
              <div className="text-xs uppercase tracking-wide text-surface-500">{stage.order}</div>
              <div className="mt-1 font-medium text-surface-100">{stage.label}</div>
              <p className="mt-2 text-surface-400">{stage.description}</p>
            </div>
          ))}
        </div>
      </SettingRow>
    </div>
  );
}