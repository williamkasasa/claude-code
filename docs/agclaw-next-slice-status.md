# AG-Claw Next Slice Status

## Current State

The clean-room next slice is substantially implemented already.

Implemented now:

- hosted providers in the web shell and backend for `github-models` and `openai`
- existing providers retained for `anthropic`, `openai-compatible`, `ollama`, and `vllm`
- visible buddy widget, helper suggestions, and full panel in the web shell
- `pretext`-style measurement adapter used only for:
  - chat input height estimation
  - annotation/comment preview measurement
  - file-viewer path truncation
- guarded live vision validation path and runbook for a real multimodal endpoint
- Playwright e2e coverage for provider switching and buddy interaction

Still pending or environment-dependent:

- routed promptfoo multimodal gate rerun once the split-model Ollama runtime on `127.0.0.1:11500` is available again
- broader e2e expansion beyond the focused provider, buddy, and HMI review coverage
- hosted multimodal validation once a stable credential path is available for this machine

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

`pretext` fits only as a narrow frontend measurement spike here.

Keep it for:

- reducing repeated DOM measurement in chat input sizing
- comment preview sizing and truncation
- file title/path truncation heuristics

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

## How To Run It

Real clean-room backend plus web shell:

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
