# AG-Claw Reference Workspace

This repository is the AG-Claw research workspace. It combines a clean-room backend seed, a temporary web shell, planning documents, and a non-authoritative reference runtime tree used for behavior study and migration analysis.

## Boundary

- `backend/` is the clean-room implementation surface.
- `web/` is the temporary AG-Claw operator shell.
- root `src/` is a reference artifact for study and parity analysis, not the product foundation.
- `mcp-server/` is a research utility for browsing the reference source tree safely.

Read these first before extending the system:

- `docs/agclaw-clean-room-boundary.md`
- `docs/agclaw-local-runbook.md`
- `docs/agclaw-subsystem-migration-matrix.md`
- `docs/agclaw-replacement-backlog.md`
- `docs/agclaw-naming-inventory.md`
- `docs/agclaw-pretext-spike.md`
- `docs/agclaw-excluded-references.md`
- `docs/agclaw-next-slice-status.md`
- `docs/agclaw-vision-runbook.md`

## What Is Runnable

- `backend/`: clean-room HTTP services for chat, orchestration, provider health, and MES research flows
- `web/`: Next.js UI for local testing and operator workflows
- `mcp-server/`: MCP explorer for the reference `src/` tree
- `promptfoo/`: prompt and evaluation harness

## What Is Active In-App

These integrations are live today when you run the local stack:

- `@chenglou/pretext` is installed in `web/` and drives measured chat input sizing, preview truncation helpers, and virtualized chat message height estimation.
- `promptfoo` is installed in `promptfoo/` and wired for routed local multimodal gate runs.
- `impeccable` is installed in `web/` as a local UI audit tool with repo presets; it is not part of the production runtime path.
- `agency-agents` ideas are surfaced as selectable agent packs in the settings UI, buddy flows, research orchestration, and persisted artifacts.
- `OpenViking` ideas are surfaced as memory namespaces and commit modes in the settings UI, orchestration metadata, and investigation bundles.
- `MiroFish` ideas are surfaced as staged workflow modes in the research workbench and orchestration outputs.
- `nanochat` ideas are surfaced as the `nano-chat` pack, nano briefs, and carry-forward bundle summaries.
- `heretic` remains intentionally excluded.

## Quick Start: See The UI

One command for the full local stack, including the routed vision runtime on `127.0.0.1:11500`:

```powershell
Set-Location (git rev-parse --show-toplevel)
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -StartLiteLLM
```

Add `-PullVisionModels` the first time on a new machine to fetch `qwen2.5vl:7b` and `gemma3:4b`. Add `-RunVisionGate` if you want the promptfoo routed multimodal gate to execute after the stack comes up.

Use two terminals if you want the real clean-room backend behind the temporary web shell.

Terminal A:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
$env:PYTHONPATH = (Resolve-Path ./backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Terminal B:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Then open `http://127.0.0.1:3000`.

If you only want a fast mock-backed browser demo, skip the backend terminal and run:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm install
node .\scripts\start-playwright-stack.mjs 8108
```

That serves the UI at `http://127.0.0.1:3100`.

## See The Integrated UI

1. Open `http://127.0.0.1:3000` after the stack is up.
2. Go to `Settings -> Integrations` to toggle Pretext measurement and choose the active agent pack, memory namespace, commit mode, and workflow mode.
3. Open the buddy panel to see pack-aware prompt suggestions and active memory/workflow context.
4. Open `Research tools -> Orchestrate` to see the resolved orchestration route, active pack metadata, current investigation bundle, persisted bundles, and bundle export/share actions.
5. Use the chat surface to exercise the Pretext-backed composer sizing and virtualized message rendering.

## Common Local Commands

Full local stack with routed vision and LiteLLM:

```powershell
Set-Location (git rev-parse --show-toplevel)
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -StartLiteLLM
```

First-time full stack with model pulls and promptfoo multimodal gate:

```powershell
Set-Location (git rev-parse --show-toplevel)
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -StartLiteLLM -RunVisionGate
```

Mock-backed browser demo:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
node .\scripts\start-playwright-stack.mjs 8108
```

Web verification:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm run type-check
npm run e2e
```

Backend verification:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
$env:PYTHONPATH = (Resolve-Path ./backend)
python -m unittest discover -s backend/tests
```

Promptfoo and UI audit helpers:

```powershell
Set-Location (git rev-parse --show-toplevel)
bun run promptfoo:latest
bun run audit:web:common
bun run audit:web:chat-shell
bun run audit:web:buddy
bun run audit:web:settings
bun run audit:web:url:home
```

## Run The Backend

PowerShell:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
$env:PYTHONPATH = (Resolve-Path ./backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Health check:

```powershell
Invoke-WebRequest http://127.0.0.1:8008/health | Select-Object -Expand Content
```

Key endpoints:

- `GET /health`
- `GET /api/provider-health`
- `POST /api/chat`
- `POST /api/orchestrate`
- `GET /api/orchestration/history`
- `POST /api/mes/retrieve`
- `POST /api/mes/log-slim`
- `POST /api/mes/interpret-screen`

## Run The Web UI

PowerShell:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Open `http://127.0.0.1:3000`.

If you want a quick mock-backed stack for browser testing, the Playwright launcher will start the backend in mock mode automatically:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm install
node .\scripts\start-playwright-stack.mjs 8108
```

That serves the UI at `http://127.0.0.1:3100`.

## Run End-To-End Tests

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm install
npm run e2e
```

The Playwright configuration builds the web app and launches the local mock backend automatically.

## Run The MCP Explorer

The MCP explorer is for research against the reference `src/` tree. It is not part of the clean-room runtime.

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "mcp-server")
npm install
npm run build
$env:AGCLAW_REFERENCE_SRC_ROOT = (Resolve-Path ../src)
node .\dist\src\index.js
```

The explorer also accepts legacy `CLAUDE_CODE_SRC_ROOT` for compatibility, but new setups should use `AGCLAW_REFERENCE_SRC_ROOT`.

## Validation Commands

Backend:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
$env:PYTHONPATH = (Resolve-Path ./backend)
python -m unittest discover -s backend/tests
```

Web:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "web")
npm run build
```

MCP explorer:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "mcp-server")
npm run build
```

## Optional LiteLLM Gateway

If you want one control plane in front of multiple models, point the UI at LiteLLM through the existing `openai-compatible` provider.

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
.\scripts\start-litellm.ps1
```

Then in the AG-Claw settings UI:

- Provider: `openai-compatible`
- API URL: `http://127.0.0.1:4000`
- API key: `agclaw-dev-key` by default, or your LiteLLM bearer token if you changed it

That same gateway URL also works with the local benchmark script below.

The starter config lives at `litellm/agclaw-config.local.yaml` and exposes `qwen2.5:3b`, `gemma3:1b`, and `qwen2.5vl:3b` through one OpenAI-compatible endpoint.

For the routed multimodal local workflow, the same config also exposes:

- `vision-caption-local` -> `qwen2.5vl:7b` on `127.0.0.1:11500`
- `vision-hmi-local` -> `qwen2.5vl:7b` on `127.0.0.1:11500`
- `vision-ocr-local` -> `gemma3:4b` on `127.0.0.1:11500`

The PowerShell launchers resolve `litellm.exe` from the repo `.venv` first, then fall back to PATH.

Useful local reference-tool commands from the repo root:

```powershell
bun run promptfoo:latest
bun run audit:web-ui -- --help
bun run audit:web:common
bun run audit:web:chat-shell
bun run audit:web:buddy
bun run audit:web:settings
```

The first checks the currently published `promptfoo` version with `npm view`, which is the practical non-interactive equivalent of confirming what `npx promptfoo@latest` will pull on this machine. The Impeccable commands run targeted audits for the AG-Claw chat shell, buddy surfaces, and settings surfaces without adding anything to the runtime path.

If the web server is already running locally, you can also audit the live home page with:

```powershell
bun run audit:web:url:home
```

That live URL audit uses a repo-owned Puppeteer wrapper around Impeccable's browser detector so it works on Windows paths; it expects a local Chrome or Edge install.

Reference-integration design spikes are checked in for future subsystem work:

- `docs/agclaw-agency-agents-spike.md`
- `docs/agclaw-openviking-spike.md`
- `docs/agclaw-mirofish-spike.md`

## Governed Eval Assets

The `promptfoo` pack now includes an allowlisted Hugging Face ingestion path for evaluation assets.

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location (Join-Path $repoRoot "promptfoo")
npm install
npm run import:hf-assets -- --dataset rico-screen2words --limit 20
```

Imported samples are written under `promptfoo/cases/hf/` and include governance metadata from the allowlist manifest.

If Hugging Face traffic is intercepted by a corporate proxy, set `AGCLAW_HF_CA_FILE` to the proxy PEM bundle before running the importer. Use `AGCLAW_HF_ALLOW_INSECURE_TLS=1` only as a temporary fallback.

Build and run the multimodal promptfoo packs after importing both `rico-screen2words` and `ocr-vqa` samples:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -RunVisionGate
```

If you want the manual path instead, point caption and HMI to `qwen2.5vl:7b` on `127.0.0.1:11500`, and OCR to `gemma3:4b` on the same port.

## Local Benchmark Pass

To compare the small local assistant defaults from this slice:

```powershell
$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot
node .\scripts\benchmark-local-assistants.mjs --models qwen2.5:3b,gemma3:1b
```

Use `--api-base http://127.0.0.1:4000/v1/chat/completions` to run the same pass through LiteLLM instead of Ollama.

## Related Docs

- `backend/README.md` for backend endpoint and benchmark details
- `mcp-server/README.md` for MCP explorer usage
- `promptfoo/README.md` for the eval harness and routed multimodal gate
- `docs/agclaw-local-runbook.md` for the consolidated local startup path
- `docs/agclaw-pretext-spike.md` for the scoped Pretext integration note
- `docs/agclaw-vision-runbook.md` for screen interpretation validation
- `docs/agclaw-excluded-references.md` for what is mapped versus intentionally excluded
- `docs/agclaw-next-slice-status.md` for the current merged-state snapshot
- `docs/repo-status.md` for current migration status

[![Star History Chart](https://api.star-history.com/image?repos=codeaashu/claude-code&type=date&legend=bottom-right)](https://www.star-history.com/#codeaashu/claude-code&Date)

## Operating Rule

No new AG-Claw operator-facing surface should introduce Claude-branded product naming. Upstream provider identifiers such as `anthropic` or model ids such as `claude-sonnet-*` remain acceptable only where they describe compatibility with external APIs.
