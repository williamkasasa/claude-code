# AG-Claw Agency Agents Spike

## Source Reference

- `msitarzewski/agency-agents`

## Why It Fits

- provides a concrete model for packaging role-specialized agents without hard-wiring them into one runtime core
- matches AG-Claw's need to separate operator-facing personas from backend orchestration concerns
- gives a cleaner seam for future prompt packs, tool bundles, and policy-specific agent variants

## AG-Claw Integration Target

- treat agent personas as configuration-driven packs, not framework-wide singletons
- map each pack to a narrow responsibility such as:
  - operator assistant
  - MES retrieval analyst
  - screen-review helper
  - promptfoo evaluation helper

## Immediate Repository Use

- keep this repo on the current runtime stack
- use the reference to define a future pack layout under either `backend/agclaw_backend/agents/` or `src/skills/` after the clean-room backend contracts settle
- use the reference to separate persona text, tool allowlists, and capability metadata

## Proposed First Slice

1. Create an `agents/manifest.json` that declares agent ids, labels, tool scopes, and system-prompt files.
2. Move buddy/operator-specific text into pack files instead of leaving it embedded in UI code.
3. Add a backend route that selects an agent pack explicitly for orchestration requests.

## Non-Goals For This Repo State

- no direct dependency on the `agency-agents` package or runtime
- no migration of the existing web shell into a third-party agent framework
- no expansion of backend orchestration until the clean-room boundaries are stable
