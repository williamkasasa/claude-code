# AG-Claw Backend

This package is the clean-room backend seed for AG-Claw. It intentionally avoids depending on the leaked root runtime.

## Scope

- provider contracts
- orchestration role contracts
- MES research service contracts
- stdlib HTTP API for the temporary web shell boundary
- no direct industrial control actions

## Run

```powershell
$repoRoot = git rev-parse --show-toplevel
$env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend"))
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

## Endpoints

- `GET /health`
- `GET /api/provider-health?provider=ollama&apiUrl=http://127.0.0.1:11434`
- `POST /api/chat`
- `POST /api/orchestrate`
- `GET /api/orchestration/history?limit=10`
- `GET /api/orchestration/history/<id>`
- `GET /api/mes/datasets`
- `POST /api/mes/log-slim`
- `POST /api/mes/retrieve`
- `POST /api/mes/interpret-screen`

## Web shell integration

When `AGCLAW_BACKEND_URL` is set in the Next.js environment, the temporary `web` shell proxies:

- `/api/chat`
- `/api/provider-health`

to the clean backend service instead of using the in-process fallback logic.

## MES configuration

- Optional dataset registry path:
  - `AGCLAW_MES_REGISTRY_PATH`
- Orchestration history path:
  - `AGCLAW_HISTORY_PATH`
- Orchestration artifact directory:
  - `AGCLAW_ARTIFACT_DIR`
- Optional vision adapter for `/api/mes/interpret-screen`:
  - `AGCLAW_SCREEN_VISION_PROVIDER`
    - expected values: `github-models`, `openai`, `openai-compatible`, `ollama`, `vllm`
  - `AGCLAW_SCREEN_VISION_BASE_URL`
  - `AGCLAW_SCREEN_VISION_API_KEY`
  - `AGCLAW_SCREEN_VISION_MODEL`
  - optional per-route overrides using `_<ROUTE>` suffixes, for example:
    - `AGCLAW_SCREEN_VISION_PROVIDER_HMI`
    - `AGCLAW_SCREEN_VISION_BASE_URL_HMI`
    - `AGCLAW_SCREEN_VISION_API_KEY_HMI`
    - `AGCLAW_SCREEN_VISION_MODEL_HMI`
    - `AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS_HMI`

If no vision adapter is configured, screen review stays in heuristic fallback mode.

## Managed datasets

The bundled seed corpus is now split into a managed registry:

- `backend/agclaw_backend/data/mes_dataset_registry.json`
- `backend/agclaw_backend/data/datasets/*.json`

Each dataset has:

- stable dataset id
- version
- description
- file path
- tags

`POST /api/mes/retrieve` accepts optional `dataset_ids` to constrain retrieval.

The retrieval path now uses a cached hybrid ranker that combines:

- lexical term overlap
- metadata boosts from dataset and domain filters
- TF-IDF vector similarity across title, excerpt, tags, and dataset metadata

Response items include `retrieval_score`, `lexical_score`, `semantic_score`, `metadata_score`, plus matched query terms and tags so the ranking stays inspectable.

## Vision validation runbook

Validated local HMI vision configuration on this workstation:

```powershell
$env:AGCLAW_SCREEN_VISION_PROVIDER_HMI = "ollama"
$env:AGCLAW_SCREEN_VISION_BASE_URL_HMI = "http://127.0.0.1:11500"
$env:AGCLAW_SCREEN_VISION_MODEL_HMI = "qwen2.5vl:7b"
$env:AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS_HMI = "360"
```

Validated local promptfoo routing on this workstation:

```powershell
$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_CAPTION = "ollama"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_CAPTION = "http://127.0.0.1:11500"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_CAPTION = "qwen2.5vl:7b"

$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_HMI = "ollama"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_HMI = "http://127.0.0.1:11500"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_HMI = "qwen2.5vl:7b"

$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_OCR = "ollama"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_OCR = "http://127.0.0.1:11500"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_OCR = "gemma3:4b"
```

Hosted Hugging Face models can be reached through LiteLLM aliases from `litellm/agclaw-config.local.yaml` by setting `HF_TOKEN` and routing to:

- `vision-caption-hosted`
- `vision-hmi-hosted`
- `vision-ocr-hosted`

Then:

```powershell
$repoRoot = git rev-parse --show-toplevel
$env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend"))
python -m agclaw_backend.server --host 127.0.0.1 --port 8008
```

Use the web `HMI Review` tool or call `POST /api/mes/interpret-screen`. The response `adapter` field should switch from `heuristic` to your configured provider name when the endpoint is active.

This local Ollama path was validated against a synthetic HMI-style PNG on this workstation. The endpoint returned `adapter: "ollama"` and a non-empty vision summary. Promptfoo `gate:vision-all` also passed on the same machine when caption/HMI were routed to `qwen2.5vl:7b` and OCR was routed to `gemma3:4b`.

## Benchmark

Run the repeatable backend benchmark:

```powershell
$repoRoot = git rev-parse --show-toplevel
$env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend"))
python backend/scripts/benchmark_backend.py --self-host --iterations 10
```

This measures:

- health
- provider probe
- MES retrieval
- log slimming
- orchestration
- screen review

## Live provider checks

These tests are opt-in only. They are skipped unless `AGCLAW_LIVE_PROVIDER_TESTS=1`.

Required environment variables:

- GitHub Models:
  - `GITHUB_TOKEN` or `AGCLAW_LIVE_GITHUB_MODELS_API_KEY`
  - `AGCLAW_LIVE_GITHUB_MODELS_MODEL`
  - optional `AGCLAW_LIVE_GITHUB_MODELS_BASE_URL`
- OpenAI:
  - `OPENAI_API_KEY`
  - `AGCLAW_LIVE_OPENAI_HOSTED_MODEL`
  - optional `AGCLAW_LIVE_OPENAI_HOSTED_BASE_URL`
- OpenAI-compatible:
  - `AGCLAW_LIVE_OPENAI_BASE_URL`
  - `AGCLAW_LIVE_OPENAI_MODEL`
  - optional `AGCLAW_LIVE_OPENAI_API_KEY`
- Anthropic:
  - `ANTHROPIC_API_KEY`
  - `AGCLAW_LIVE_ANTHROPIC_MODEL`
  - optional `AGCLAW_LIVE_ANTHROPIC_BASE_URL`

Run:

```powershell
$repoRoot = git rev-parse --show-toplevel
$env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend"))
$env:AGCLAW_LIVE_PROVIDER_TESTS = "1"
python -m unittest backend.tests.test_live_providers
```

Example session-only hosted validation:

```powershell
$repoRoot = git rev-parse --show-toplevel
$env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend"))
$env:AGCLAW_LIVE_PROVIDER_TESTS = "1"
$env:GITHUB_TOKEN = "<token>"
$env:AGCLAW_LIVE_GITHUB_MODELS_MODEL = "openai/gpt-4.1-mini"
$env:OPENAI_API_KEY = "<token>"
$env:AGCLAW_LIVE_OPENAI_HOSTED_MODEL = "gpt-4.1-mini"
python -m unittest backend.tests.test_live_providers
```

## Validation

- `$repoRoot = git rev-parse --show-toplevel; $env:PYTHONPATH = (Resolve-Path (Join-Path $repoRoot "backend")); python -m unittest discover -s backend/tests`
- `Get-ChildItem backend\agclaw_backend\*.py | ForEach-Object { python -m py_compile $_.FullName }`
- `cd promptfoo && npm run gate:vision-all`

## Next steps

- add a single-command launcher for the validated routed local vision stack
- persist more MES research artifacts beyond orchestration summaries
- expand hosted validation coverage once a stable credential path is available
