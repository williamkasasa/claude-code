# AG-Claw Subsystem Migration Matrix

| Subsystem | Status | Decision | Target |
| --- | --- | --- | --- |
| Root CLI/runtime (`src/` core loop, commands, tools) | Broken/transformed | reference only | replace with clean Python backend contracts |
| Web app (`web/`) | Runnable | temporary shell | retain, then replace backend dependencies behind clean APIs |
| `mcp-server/` explorer | Runnable | temporary shell | keep as research utility, harden independently |
| Provider routing | partially replaced | replace now | clean server route plus backend provider adapters |
| File APIs | runnable | temporary shell | keep behind explicit workspace-safe APIs |
| Session/share APIs | runnable | temporary shell | keep, then extract if platform boundary moves |
| Buddy logic | deterministic and local | keep temporarily | preserve as research fixture and deterministic test target |
| Root SDK/generated surfaces | missing | replace now | define clean contracts in new backend package |
| Agent orchestration | missing/incomplete | replace now | Python orchestration services |
| Prompt safety evaluation | missing | replace now | promptfoo pack and clean backend gates |
| MES retrieval/preprocessing | not present | replace now | original research services |
| Plant connectivity/write actions | out of scope | defer | no direct implementation in research phase |
| Rust host services | not present | defer | only after performance measurements justify extraction |

## External Reference Map

| Repository | Use In AG-Claw |
| --- | --- |
| `openclaw/openclaw` | control-plane and open architecture reference |
| `ultraworkers/claw-code` | parity and rewrite reference |
| `karpathy/nanochat` | minimal chat loop reference for Python backend |
| `msitarzewski/agency-agents` | role-based orchestration reference with checked-in spike doc |
| `promptfoo/promptfoo` | active evaluation dependency and latest-CLI verification target |
| `pbakaus/impeccable` | local web-shell audit hook plus UI quality workflow reference |
| `volcengine/OpenViking` | memory/context reference only after fit validation, with checked-in spike doc |
| `666ghj/MiroFish` | graph/simulation/reporting reference only after fit validation, with checked-in spike doc |
| `chenglou/pretext` | general pattern reference only; not a log pre-parser |
| `p-e-w/heretic` | excluded from current core design |

## Immediate Replace-Now Targets

- provider abstraction and local-mode UX
- root orchestration/runtime dependencies
- clean backend contracts
- prompt evaluation gates
- MES retrieval service interfaces
