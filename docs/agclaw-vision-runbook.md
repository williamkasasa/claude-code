# AG-Claw Vision Runbook

## Purpose

Validate that `/api/mes/interpret-screen` is using a real vision-capable endpoint instead of heuristic fallback mode.

## Supported Adapter Types

- `openai-compatible`
- `ollama`
- `vllm`
- `github-models`

## Required Environment

```powershell
$env:PYTHONPATH = "d:\OneDrive - AG SOLUTION\claude-code\backend"
$env:AGCLAW_SCREEN_VISION_PROVIDER = "openai-compatible"
$env:AGCLAW_SCREEN_VISION_BASE_URL = "http://127.0.0.1:8000"
$env:AGCLAW_SCREEN_VISION_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
```

Task-routed local HMI setup on this workstation:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER_HMI = "ollama"
$env:AGCLAW_SCREEN_VISION_BASE_URL_HMI = "http://127.0.0.1:11500"
$env:AGCLAW_SCREEN_VISION_MODEL_HMI = "qwen2.5vl:7b"
$env:AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS_HMI = "360"
```

Optional:

```powershell
$env:AGCLAW_SCREEN_VISION_API_KEY = "..."
```

## Startup

One-command routed local stack from the repo root:

```powershell
Set-Location (git rev-parse --show-toplevel)
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -StartLiteLLM
```

To launch the same stack and immediately rerun the promptfoo multimodal gate:

```powershell
Set-Location (git rev-parse --show-toplevel)
.\scripts\start-agclaw-local.ps1 -EnableRoutedVision -PullVisionModels -RunVisionGate
```

```powershell
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

## Validation

1. Open the `web` shell with `AGCLAW_BACKEND_URL` pointing to `http://127.0.0.1:8008`.
2. Open `Research tools`.
3. Switch to `HMI Review`.
4. Upload a representative screenshot and include OCR/notes.
5. Run `Interpret screen`.

## Expected Result

- The response header shows `Adapter: openai-compatible` or the configured provider.
- `observations` includes a `Vision summary: ...` line.
- If the endpoint is unavailable or rejects the image, the response falls back to `Adapter: heuristic` and adds a fallback risk note.

## Safety Constraint

- Treat all output as advisory-only.
- Do not allow the vision path to generate control commands or bypass approval gates.

## Verified Local Result

This repository has now been validated against real local multimodal endpoints using:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER = "ollama"
$env:AGCLAW_SCREEN_VISION_BASE_URL = "http://127.0.0.1:11500"
$env:AGCLAW_SCREEN_VISION_MODEL = "qwen2.5vl:7b"
```

The validated path covers:

- backend live vision unit test against `backend/tests/fixtures/hmi-sample.png`
- browser E2E upload flow through `Research Workbench -> HMI Review`
- promptfoo `gate:vision-caption`

Expected verified outcome:

- `Adapter: ollama`
- visible `Vision summary:` content
- batch or recipe context called out without control-action instructions

Observed local limitation:

- `qwen2.5vl:3b` on the default local Ollama port fell back to `Adapter: heuristic` on the HMI fixture because the request exceeded available system memory on this workstation.
- `qwen2.5vl:7b` on the alternate E-backed Ollama instance handled backend HMI interpretation and the promptfoo caption pack successfully.
- `gemma3:4b` on the alternate E-backed Ollama instance handled the sampled OCR workload successfully.
- A single local model still does not pass every pack on this workstation, so the most reliable local split is `qwen2.5vl:7b` for screenshot captioning and HMI review, and `gemma3:4b` for the sampled OCR suite.

## Routed LiteLLM Option

If you want a single OpenAI-compatible endpoint with task aliases, use the starter LiteLLM config and route these model names through it:

- `vision-caption-local` -> `qwen2.5vl:7b`
- `vision-hmi-local` -> `qwen2.5vl:7b`
- `vision-ocr-local` -> `gemma3:4b`
