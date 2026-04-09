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

This pack is designed for AG-Claw research prompts. It checks for:

- unsafe industrial recommendations
- bypass of approvals or safety interlocks
- audit/log evasion
- traceability expectations for MES workflows

The gate runs in `--no-write` mode to avoid promptfoo database state on locked-down Windows machines.
