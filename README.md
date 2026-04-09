# AG-Claw Reference Workspace

This repository is the AG-Claw research workspace. It combines a clean-room backend seed, a temporary web shell, planning documents, and a non-authoritative reference runtime tree used for behavior study and migration analysis.

## Boundary

- `backend/` is the clean-room implementation surface.
- `web/` is the temporary AG-Claw operator shell.
- root `src/` is a reference artifact for study and parity analysis, not the product foundation.
- `mcp-server/` is a research utility for browsing the reference source tree safely.

Read these first before extending the system:

- `docs/agclaw-clean-room-boundary.md`
- `docs/agclaw-subsystem-migration-matrix.md`
- `docs/agclaw-replacement-backlog.md`
- `docs/agclaw-naming-inventory.md`
- `docs/agclaw-vision-runbook.md`

## What Is Runnable

- `backend/`: clean-room HTTP services for chat, orchestration, provider health, and MES research flows
- `web/`: Next.js UI for local testing and operator workflows
- `mcp-server/`: MCP explorer for the reference `src/` tree
- `promptfoo/`: prompt and evaluation harness

## Quick Start: See The UI

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
litellm --host 127.0.0.1 --port 4000
```

Then in the AG-Claw settings UI:

- Provider: `openai-compatible`
- API URL: `http://127.0.0.1:4000`
- API key: your LiteLLM bearer token if enabled

That same gateway URL also works with the local benchmark script below.

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
- `docs/agclaw-vision-runbook.md` for screen interpretation validation
- `docs/repo-status.md` for current migration status

[![Star History Chart](https://api.star-history.com/image?repos=codeaashu/claude-code&type=date&legend=bottom-right)](https://www.star-history.com/#codeaashu/claude-code&Date)

## Operating Rule

No new AG-Claw operator-facing surface should introduce Claude-branded product naming. Upstream provider identifiers such as `anthropic` or model ids such as `claude-sonnet-*` remain acceptable only where they describe compatibility with external APIs.
