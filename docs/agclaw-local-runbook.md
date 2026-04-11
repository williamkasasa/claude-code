# AG-Claw Local Runbook

## Local Open-Weight Path

### Prerequisites

- Python on `PATH`, with the repo `.venv` preferred when present
- Node.js and `npm` on `PATH`
- Ollama on `PATH`

### One-command startup

```powershell
cd "d:\OneDrive - AG SOLUTION\claude-code"
powershell -ExecutionPolicy Bypass -File .\scripts\start-agclaw-local.ps1 -EnableRoutedVision -StartLiteLLM
```

First-time setup on a new machine:

```powershell
cd "d:\OneDrive - AG SOLUTION\claude-code"
powershell -ExecutionPolicy Bypass -File .\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -StartLiteLLM -RunVisionGate
```

Default chat model:

- `qwen2.5-coder:7b`

Default routed vision models:

- caption and HMI: `qwen2.5vl:7b`
- OCR: `gemma3:4b`

Fast fallback for this laptop:

- `qwen2.5-coder:3b`

Small general-purpose local options:

- `qwen2.5:3b`
- `llama3.2:3b`
- `gemma3:1b`

This script will:

- verify Python, npm, and Ollama are available
- resolve the repo `.venv` Python and LiteLLM executables first when available
- start the default Ollama host if needed
- start the routed vision Ollama host on `127.0.0.1:11500` when requested
- optionally pull the active chat or routed vision models
- optionally start LiteLLM on `127.0.0.1:4000`
- start the backend in one PowerShell window
- start the web shell in a second PowerShell window
- optionally run the promptfoo routed multimodal gate

Then open:

- `http://localhost:3000`

### Manual startup

```powershell
ollama serve
ollama pull qwen2.5-coder:7b

cd "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH="d:\OneDrive - AG SOLUTION\claude-code\backend"
python -m agclaw_backend.server --host 127.0.0.1 --port 8008

cd "d:\OneDrive - AG SOLUTION\claude-code\web"
$env:AGCLAW_BACKEND_URL="http://127.0.0.1:8008"
npm run dev
```

### UI path

- open `Settings`
- enable `Local mode`
- provider `ollama`
- model `qwen2.5-coder:7b`
- click `Check`
- chat

### Integration path in the UI

- open `Settings -> Integrations`
- keep `Pretext measurement` enabled if you want the live measurement path active
- choose an `Agent pack` such as `operator-swarm`, `screen-review`, `promptfoo-audit`, or `nano-chat`
- choose the `Memory namespace` and `Memory commit mode`
- choose the `Workflow mode`
- open the buddy panel to see pack-aware prompt suggestions
- open `Research tools -> Orchestrate` to see the resolved route, bundle surface, and share/export actions

If you want lower latency on this laptop, switch the model to:

- `qwen2.5-coder:3b`

## Vision-capable local models

Validated routed local Ollama targets:

- `qwen2.5vl:7b`
- `gemma3:4b`

Pull them manually if you are not using the one-command startup:

```powershell
$env:OLLAMA_HOST="127.0.0.1:11500"
ollama serve
ollama pull qwen2.5vl:7b
ollama pull gemma3:4b
```

Then configure the AG-Claw backend:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER_HMI="ollama"
$env:AGCLAW_SCREEN_VISION_BASE_URL_HMI="http://127.0.0.1:11500"
$env:AGCLAW_SCREEN_VISION_MODEL_HMI="qwen2.5vl:7b"
```

This path was validated locally against `POST /api/mes/interpret-screen` using a synthetic HMI-style PNG. Promptfoo `gate:vision-all` also passed on the same workstation when caption and HMI were routed to `qwen2.5vl:7b` and OCR was routed to `gemma3:4b` on `127.0.0.1:11500`.

Backend validation command:

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
$env:AGCLAW_LIVE_VISION_TESTS = "1"
python -m unittest backend.tests.test_live_vision
```

Optional browser validation:

```powershell
cd "d:\OneDrive - AG SOLUTION\claude-code\web"
$env:AGCLAW_E2E_LIVE_VISION = "1"
npm run e2e -- --grep "live local vision adapter"
```

## Promptfoo and audit helpers

From the repo root:

```powershell
bun run promptfoo:latest
bun run audit:web:common
bun run audit:web:chat-shell
bun run audit:web:buddy
bun run audit:web:settings
bun run audit:web:url:home
```

These let you check the pinned `promptfoo` line, run local Impeccable audits against common AG-Claw UI surfaces, and audit a live running page through the Windows-safe Puppeteer wrapper.

## Gemma note

Gemma 4 is available on Hugging Face and already represented in the hosted-compatible model catalog, but it is not the first local recommendation for this laptop. The practical Gemma-family local fallback here is still a smaller Ollama model such as `gemma3:1b`.

## Hosted provider envs for current session only

```powershell
cd "d:\OneDrive - AG SOLUTION\claude-code"
. .\scripts\set-session-provider-env.ps1 -Provider both
```

This sets only:

- `OPENAI_API_KEY`
- `GITHUB_TOKEN`

for the current PowerShell session.
