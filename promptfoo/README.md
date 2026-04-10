# Promptfoo Safety Pack

Run from the `promptfoo` directory:

```powershell
cd promptfoo
npm install
npm run gate
```

To import governed sample assets from the allowlisted Hugging Face datasets:

```powershell
cd promptfoo
npm install
npm run import:hf-assets -- --dataset rico-screen2words --limit 20
```

Available allowlist keys are defined in `hf-eval-assets.manifest.json`. Imported samples are written to `cases/hf/` as JSONL so they can be reviewed before being wired into new promptfoo cases.

If your network injects a corporate TLS certificate, set `AGCLAW_HF_CA_FILE` to that PEM file. As a last resort for locked-down lab machines, you can set `AGCLAW_HF_ALLOW_INSECURE_TLS=1` for the import session.

The importer now snapshots referenced image assets into `cases/hf/assets/` and records `local_image_path` so multimodal eval suites do not depend on expiring Hugging Face asset URLs.

Build the multimodal eval packs after importing the datasets you want to use:

```powershell
cd promptfoo
npm install
npm run build:hf-evals
```

Run the suites against a real multimodal endpoint, for example local Ollama or LiteLLM in front of Ollama:

```powershell
$env:AGCLAW_PROMPTFOO_VISION_PROVIDER = "ollama"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL = "http://127.0.0.1:11500"
$env:AGCLAW_PROMPTFOO_VISION_MODEL = "qwen2.5vl:7b"
npm run gate:vision-all
```

Task-routed local setup on this workstation:

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

npm run gate:vision-all
```

Hosted Hugging Face setup through LiteLLM:

```powershell
$env:HF_TOKEN = "<token>"
$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_CAPTION = "openai-compatible"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_CAPTION = "http://127.0.0.1:4000"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_CAPTION = "vision-caption-hosted"

$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_HMI = "openai-compatible"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_HMI = "http://127.0.0.1:4000"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_HMI = "vision-hmi-hosted"

$env:AGCLAW_PROMPTFOO_VISION_PROVIDER_OCR = "openai-compatible"
$env:AGCLAW_PROMPTFOO_VISION_BASE_URL_OCR = "http://127.0.0.1:4000"
$env:AGCLAW_PROMPTFOO_VISION_MODEL_OCR = "vision-ocr-hosted"

npm run gate:vision-all
```

Those hosted aliases are defined in `litellm/agclaw-config.local.yaml` and expect LiteLLM to be running with `HF_TOKEN` available.

The promptfoo vision provider now honors per-task overrides via:

- `AGCLAW_PROMPTFOO_VISION_PROVIDER_CAPTION`, `..._BASE_URL_CAPTION`, `..._MODEL_CAPTION`, `..._API_KEY_CAPTION`
- `AGCLAW_PROMPTFOO_VISION_PROVIDER_HMI`, `..._BASE_URL_HMI`, `..._MODEL_HMI`, `..._API_KEY_HMI`
- `AGCLAW_PROMPTFOO_VISION_PROVIDER_OCR`, `..._BASE_URL_OCR`, `..._MODEL_OCR`, `..._API_KEY_OCR`

When `AGCLAW_PROMPTFOO_VISION_PROVIDER_*` is `ollama`, the provider now uses Ollama's native `/api/chat` route and defaults `AGCLAW_PROMPTFOO_VISION_KEEP_ALIVE_*` to `0s` so Qwen and Gemma do not stay resident between task packs on this workstation.

Packs included in this repo:

- `gate:vision-caption`: dataset-driven UI caption checks from `rico-screen2words`
- `gate:vision-ocr`: dataset-driven OCR visual QA checks from `ocr-vqa`
- `gate:vision-screen-review`: AG-Claw HMI review checks using the local HMI fixture

Validated local status on this workstation:

- `gate:vision-caption`: passes on `qwen2.5vl:7b` via the E-backed Ollama instance on `http://127.0.0.1:11500`
- `gate:vision-screen-review`: backend HMI interpretation and advisory review behave well on `qwen2.5vl:7b`
- `gate:vision-ocr`: passes on `gemma3:4b` via the same E-backed Ollama instance
- `gate:vision-all`: passes when task-based routing is enabled so caption/HMI use `qwen2.5vl:7b` and OCR uses `gemma3:4b`

Caption pack note:

- The generated caption pack now uses explicit UI-aware expectations for the current RICO fixtures instead of raw keyword extraction from upstream captions, which was too brittle for screenshot descriptions.

This pack is designed for AG-Claw research prompts. It checks for:

- unsafe industrial recommendations
- bypass of approvals or safety interlocks
- audit/log evasion
- traceability expectations for MES workflows

The gate runs in `--no-write` mode to avoid promptfoo database state on locked-down Windows machines.
