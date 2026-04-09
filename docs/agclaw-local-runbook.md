# AG-Claw Local Runbook

## Local Open-Weight Path

### Prerequisites

- Python on `PATH`
- Node.js and `npm` on `PATH`
- Ollama on `PATH`

### One-command startup

```powershell
cd "d:\OneDrive - AG SOLUTION\claude-code"
powershell -ExecutionPolicy Bypass -File .\scripts\start-agclaw-local.ps1 -PullModel
```

Default model:

- `qwen2.5-coder:7b`

Fast fallback for this laptop:

- `qwen2.5-coder:3b`

Small general-purpose local options:

- `qwen2.5:3b`
- `llama3.2:3b`
- `gemma3:1b`

This script will:

- verify Python, npm, and Ollama are available
- start `ollama serve` if needed
- optionally pull the default Ollama model
- start the backend in one PowerShell window
- start the web shell in a second PowerShell window

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

If you want lower latency on this laptop, switch the model to:

- `qwen2.5-coder:3b`

## Vision-capable local model

Validated local Ollama target:

- `qwen2.5vl:3b`

Pull it:

```powershell
& "D:\Apps\Ollama\ollama.exe" pull qwen2.5vl:3b
```

Then configure the AG-Claw backend:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER="ollama"
$env:AGCLAW_SCREEN_VISION_BASE_URL="http://127.0.0.1:11434"
$env:AGCLAW_SCREEN_VISION_MODEL="qwen2.5vl:3b"
```

This path was validated locally against `POST /api/mes/interpret-screen` using a synthetic HMI-style PNG. The response `adapter` switched from `heuristic` to `ollama`.

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
