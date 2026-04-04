# AG-Claw Next Slice Status

This note records what is implemented in the current clean-room slice, what is intentionally excluded, and how to run the stack with local or hosted models.

## Implemented Now

### Providers

- hosted providers: `github-models`, `openai`, `anthropic`
- local and gateway providers: `ollama`, `vllm`, `openai-compatible`
- provider-specific defaults in the web shell:
  - base URL
  - recommended model list
  - API-key help text and placeholders
  - local-mode defaults back to `ollama`
- Hugging Face model identifiers are included as clean-room catalog metadata for local or gateway selection:
  - `Qwen/Qwen2.5-Coder-7B-Instruct`
  - `Qwen/Qwen2.5-Coder-14B-Instruct`
  - `Qwen/Qwen2.5-Coder-32B-Instruct`
  - `Qwen/Qwen3-Coder-30B-A3B-Instruct`
  - `Qwen/Qwen2.5-VL-7B-Instruct`

### Buddy

- visible header widget with deterministic identity from stable client seed
- helper suggestions and buddy take in chat flow
- full buddy panel with profile, context, and prompt insertion
- buddy remains advisory-only and UI-local

### Pretext Spike

- clean-room measurement adapter at `web/lib/pretextSpike.ts`
- active usage on:
  - chat composer line estimation
  - annotation/comment preview measurement
  - file-viewer path truncation
- evaluation harness at `scripts/pretext-eval.mjs`
- sample report at `scripts/pretext-report.json`

### Vision Validation Path

- live multimodal adapter seam in `backend/agclaw_backend/mes_services.py`
- supported runtime targets for vision validation:
  - `openai`
  - `github-models`
  - `openai-compatible`
  - `ollama`
  - `vllm`
- guarded live test at `backend/tests/test_live_vision.py`
- safe fallback to `heuristic` if the adapter is unconfigured or fails

### E2E Coverage

- broad shell smoke test at `web/e2e/app.spec.ts`
- focused provider and buddy test at `web/e2e/provider-buddy.spec.ts`

## Intentionally Excluded

### heretic

`heretic` is still rejected for this repository.

Reason:

- it conflicts with the clean-room safety posture for industrial advisory workflows
- it weakens the prompt-evaluation and legal-boundary work already added here
- it does not fit the provider, buddy, pretext, or live-vision scope of this slice

If a separate research review wants it later, that should happen in a dedicated design note, not by integrating it into the current runtime.

### MiroFish, OpenViking, agency-agents

These remain reference-only or deferred. They are not part of the current runtime slice.

## What To Commit

Commit:

- provider and buddy slice changes already on your fork `main`
- `web/e2e/provider-buddy.spec.ts`
- this status note

Do not commit in current form:

- `scripts/test-buddy.mjs`

Reason:

- it re-implements buddy logic outside the clean-room web surface
- it does not exercise `web/lib/buddy.ts`
- it would create a second source of truth

If you want a buddy test script later, rewrite it against the actual clean-room implementation.

## How To Run The UI Yourself

### Fast mock-backed browser demo

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
npm run build
node .\scripts\start-e2e-server.mjs
```

Open `http://127.0.0.1:3100`.

This is the fastest way to see the shell, buddy widget, buddy panel, file explorer, research workbench, and share flow.

### Real clean-room backend plus web shell

Terminal A:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Terminal B:

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm install
$env:AGCLAW_BACKEND_URL = "http://127.0.0.1:8008"
$env:AGCLAW_WEB_ROOT = ".."
npm run dev
```

Open `http://127.0.0.1:3000`.

## How To Get Real Model Responses

### GitHub Models

In the UI settings:

- Provider: `GitHub Models`
- Base URL: `https://models.github.ai/inference`
- API key: GitHub token
- Recommended starting models:
  - `openai/gpt-4.1-mini`
  - `openai/gpt-4.1`
  - `Qwen/Qwen2.5-VL-7B-Instruct` for vision

### OpenAI

In the UI settings:

- Provider: `OpenAI API`
- Base URL: `https://api.openai.com`
- API key: OpenAI key
- Recommended starting models:
  - `gpt-4.1-mini`
  - `gpt-4.1`
  - `gpt-4o-mini`

### Ollama or vLLM

Use local mode if you want local responses without a hosted key.

- Local mode on: defaults to `ollama`
- Example Ollama models:
  - `qwen2.5-coder:7b`
  - `qwen2.5-vl:7b`
- Example vLLM model ids:
  - `Qwen/Qwen2.5-Coder-14B-Instruct`
  - `Qwen/Qwen2.5-VL-7B-Instruct`

## Live Vision Check

To validate the real multimodal path, configure the backend env and run the guarded test.

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:AGCLAW_LIVE_VISION = "1"
$env:AGCLAW_SCREEN_VISION_PROVIDER = "openai-compatible"
$env:AGCLAW_SCREEN_VISION_BASE_URL = "http://127.0.0.1:8000"
$env:AGCLAW_SCREEN_VISION_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
$env:AGCLAW_SCREEN_VISION_API_KEY = ""
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m unittest backend.tests.test_live_vision
```

Expected result:

- adapter switches away from `heuristic` when the endpoint works
- non-empty vision summary is returned
- failures still fall back safely in normal `/api/mes/interpret-screen` flow

## Verified Commands

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code"
$env:PYTHONPATH = (Resolve-Path .\backend)
python -m unittest discover -s backend/tests
```

```powershell
Set-Location "d:\OneDrive - AG SOLUTION\claude-code\web"
npm run build
npx playwright test e2e/provider-buddy.spec.ts --project=chromium --reporter=list
```