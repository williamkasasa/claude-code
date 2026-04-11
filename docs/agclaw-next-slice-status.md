# AG-Claw Next Slice Status

## Current State

The clean-room next slice is substantially implemented already.

Implemented now:

- hosted providers in the web shell and backend for `github-models` and `openai`
- existing providers retained for `anthropic`, `openai-compatible`, `ollama`, and `vllm`
- visible buddy widget, helper suggestions, and full panel in the web shell
- direct `@chenglou/pretext` dependency in the web shell through the clean-room measurement adapter in `web/lib/pretextSpike.ts`, now used for:
  - chat input height estimation
  - annotation/comment preview measurement
  - file-viewer path truncation
  - virtualized chat message sizing
- guarded live vision validation path and runbook for a real multimodal endpoint
- Playwright e2e coverage for provider switching and buddy interaction
- routed promptfoo multimodal gate passes locally again on the split-model Ollama runtime at `127.0.0.1:11500`
- `promptfoo` upgraded in-repo to `^0.121.3` so the caption pack no longer fails on the stale CLI path
- local web-shell UI audit hook added through `impeccable` so frontend review can be run on demand without changing runtime dependencies
- preset Impeccable audit commands added for AG-Claw chat-shell, buddy, settings, and common-page surfaces
- concrete checked-in spike docs added for `agency-agents`, `OpenViking`, and `MiroFish`
- in-app integration settings for agent packs, memory namespaces, commit modes, and workflow modes
- research orchestration route resolution, persisted investigation bundles, and bundle export/share actions
- `nano-chat` pack, nano briefs, and carry-forward summaries available in the web shell and orchestration payloads

Still pending or environment-dependent:

- broader e2e expansion beyond the focused provider, buddy, and HMI review coverage
- hosted multimodal validation once a stable credential path is available for this machine
- workstation Node remains on `v22.21.0`, so latest `promptfoo` prints an engine warning until Node is moved to `>=22.22.0`

## Model Catalog Guidance

Hosted provider recommendations:

- `github-models`: use live catalog-backed ids such as `openai/gpt-4.1`, `openai/gpt-4.1-mini`, `openai/gpt-4.1-nano`, `openai/gpt-4o-mini`, `openai/gpt-4o`
- `openai`: use `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o-mini`, `gpt-4o`

Open-weight local or gateway recommendations:

- `Qwen/Qwen2.5-Coder-7B-Instruct`
- `Qwen/Qwen2.5-Coder-14B-Instruct`
- `Qwen/Qwen2.5-Coder-32B-Instruct`
- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `Qwen/Qwen2.5-VL-7B-Instruct`
- `google/gemma-4-E2B-it`
- `google/gemma-4-E4B-it`
- `google/gemma-4-26B-A4B-it`

Boundary:

- Hugging Face remains a model catalog and local-serving input for this slice.
- Hugging Face hosted inference is not added as a first-class runtime provider here.
- GitHub Models presets should only include ids that are actually present in the live GitHub catalog.

## Buddy Status

Buddy is active in the clean-room web shell.

You can see:

- the header widget with rarity, shiny state, species, hat, eye, and stat summary
- helper suggestions above the message input
- the full buddy panel with profile, recent suggestions, and context framing

Buddy remains advisory-only and UI-local in this slice.

## Pretext Fit

`pretext` fits only as a narrow frontend measurement dependency here.

Keep it for:

- reducing repeated DOM measurement in chat input sizing
- comment preview sizing and truncation
- file title/path truncation heuristics
- virtualized chat message sizing

Do not use it for:

- MES ingestion
- backend retrieval
- log preprocessing
- industrial text transformation pipelines

## Heretic Fit

`heretic` should remain out of the runtime implementation slice.

Reason:

- it does not match the clean-room provider, buddy, or HMI validation needs directly
- it increases legal and architectural scope without solving the current operator-shell problems
- the repo plan already treats it as intentionally excluded unless a separate review changes that decision

If you want a research note, keep `heretic` reference-only and document findings separately instead of integrating it into the clean-room runtime.

## Reference Mapping

Use these external repos as follows for this slice:

- `promptfoo/promptfoo`: active dependency and debugging reference for the eval harness
- `pbakaus/impeccable`: usable local audit tool for the web shell through `bun run audit:web:*` presets or `npm run audit:*` in `web`
- `volcengine/OpenViking`: upstream reference only, but its ideas are now mapped into AG-Claw memory namespaces, commit modes, and investigation bundles
- `msitarzewski/agency-agents`: upstream reference only, but its ideas are now mapped into AG-Claw agent packs and role metadata
- `karpathy/nanochat`: upstream reference only, but its ideas are now mapped into the local `nano-chat` pack and nano-brief flow
- `666ghj/MiroFish`: upstream reference only, but its ideas are now mapped into local staged workflow modes and orchestration stages
- `p-e-w/heretic`: intentionally excluded from implementation

## How To Run It

Real clean-room backend plus web shell:

Recommended one-command local stack:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
powershell -ExecutionPolicy Bypass -File .\scripts\start-agclaw-local.ps1 -EnableRoutedVision -StartLiteLLM
```

First-time local setup with routed multimodal validation:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
powershell -ExecutionPolicy Bypass -File .\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -StartLiteLLM -RunVisionGate
```

Manual backend plus web shell:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Mock-backed browser demo:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
npm run build
node .\scripts\start-e2e-server.mjs
```

Then open `http://127.0.0.1:3000` for dev mode or `http://127.0.0.1:3100` for the mock-backed e2e server.

Optional local audit helpers:

- `bun run promptfoo:latest`
- `bun run audit:web-ui -- --help`
- `bun run audit:web:common`
- `bun run audit:web:chat-shell`
- `bun run audit:web:buddy`
- `bun run audit:web:settings`
- `bun run audit:web:url:home`

Both wrappers are non-interactive: the promptfoo check uses `npm view promptfoo version` to avoid local config and engine-warning noise, while the live URL audit uses a repo-owned Puppeteer wrapper around Impeccable's browser detector so it works on Windows with a local Chrome or Edge install.

Checked-in reference spikes:

- `docs/agclaw-agency-agents-spike.md`
- `docs/agclaw-openviking-spike.md`
- `docs/agclaw-mirofish-spike.md`

Validated merged-state checks on this workstation:

- backend unit tests via `python -m unittest discover -s backend/tests`
- browser HMI upload flow through the Playwright stack (`playwright test research-workbench.spec.ts`)

## Commit Guidance

Safe to commit:

- tracked web/backend/docs changes that are part of the clean-room slice
- `docs/agclaw-next-slice-status.md`
- verified e2e specs and provider metadata updates

Do not commit:

- `web/.next/`
- `web/node_modules/`
- `web/test-results/`
- `promptfoo/node_modules/`
- `backend/agclaw_backend/__pycache__/`
- `backend/tests/__pycache__/`
- `web/tsconfig.tsbuildinfo`
- `scripts/test-buddy.mjs` unless it is rewritten to exercise the actual clean-room buddy implementation

Review carefully before committing:

- deletion of `backend/README.md` only if you intended to remove backend-specific runbook content
