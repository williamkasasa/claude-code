# AG-Claw Capability Gap Matrix

This matrix maps the current clean-room AG-Claw implementation against the AI engineer capability list discussed in April 2026.

## Status Key

- `implemented`: present in the clean-room product path today
- `partial`: present in limited or non-production form
- `missing`: not implemented in the clean-room product path

## Capability Matrix

| Capability | Status | Evidence | Notes |
| --- | --- | --- | --- |
| RAG / retrieval | partial | `backend/agclaw_backend/mes_services.py` | Retrieval exists and now uses hybrid lexical plus TF-IDF ranking, but it is still bounded to the bundled MES datasets. |
| Vector search | partial | `backend/agclaw_backend/mes_services.py` | In-memory TF-IDF vector similarity is now present; neural embeddings and external vector stores are still missing. |
| Hybrid search | implemented | `backend/agclaw_backend/mes_services.py` | Query ranking combines lexical overlap, metadata boosts, and vector similarity. |
| Chunking pipeline | missing | clean-room backend | No document chunking or long-document ingestion pipeline exists yet. |
| Metadata-aware retrieval | implemented | `backend/agclaw_backend/contracts.py`, `backend/agclaw_backend/mes_services.py` | Dataset ids, versions, tags, and matched terms/tags are surfaced in results. |
| GraphRAG | missing | clean-room backend | No graph store, graph traversal, or graph-aware retrieval path exists. |
| Grep / code search | implemented | `mcp-server/`, root `src/` research utilities | Present as a research utility, not as AG-Claw runtime retrieval. |
| MCP | implemented | `mcp-server/`, `README.md` | MCP explorer is available in-repo. |
| A2A | missing | clean-room runtime | No agent-to-agent protocol surface is implemented. |
| Agent graphs | partial | `backend/agclaw_backend/orchestrator.py` | Role-based orchestration exists, but not as a first-class graph execution engine. |
| Workflow engines | partial | `backend/agclaw_backend/orchestrator.py` | Workflow modes and staged orchestration exist, but not a general workflow runtime. |
| Model routing logic | partial | `web/components/research/ResearchWorkbench.tsx`, `backend/agclaw_backend/orchestrator.py` | Route resolution exists for orchestration lanes; broader task-based routing is still limited. |
| Fallback chains | partial | `backend/agclaw_backend/mes_services.py` | Vision fallback to heuristic mode exists; broader multi-model fallback policy does not. |
| Structured outputs | missing | clean-room backend | No schema-bound structured-output execution path is implemented yet. |
| Tool calling | missing | clean-room backend | No controlled tool-calling layer is implemented in the clean-room backend. |
| Real-time APIs | implemented | `backend/agclaw_backend/http_api.py` | Chat streaming uses SSE. |
| Python backend | implemented | `backend/` | Core clean-room services are Python. |
| JavaScript / TypeScript shell | implemented | `web/` | Main operator shell is Next.js plus TypeScript. |
| SDK surface | partial | repo root `src/entrypoints/sdk/` | Present in the wider repo, not yet a clean-room AG-Claw SDK surface. |
| Backend services | implemented | `backend/agclaw_backend/http_api.py` | Health, chat, orchestration, retrieval, and screen interpretation are live. |
| Eval pipelines | partial | `promptfoo/` | Promptfoo safety/eval harness exists locally; production eval automation is still missing. |
| Guardrails | implemented | `promptfoo/promptfooconfig.yaml`, `backend/agclaw_backend/orchestrator.py` | Advisory-only posture and human review gates are enforced in the product flow. |
| Monitoring | partial | `backend/TRACING.md` | Tracing bootstrap exists, but not full runtime monitoring. |
| Policy checks | partial | `promptfoo/` and orchestration review gates | Safety pack and review gates exist; policy engine breadth is still limited. |
| Quantization | missing | product path | Local model hosting may rely on quantized models externally, but AG-Claw does not manage quantization itself. |
| Caching | partial | `backend/agclaw_backend/mes_services.py` | Dataset, search index, and registry loading are cached in-process. |
| Token monitoring | missing | clean-room product path | No explicit token accounting surface in the clean-room runtime yet. |
| Cost monitoring | missing | clean-room product path | No provider cost dashboard or budgeting exists for AG-Claw today. |
| Logging and tracing | partial | `backend/agclaw_backend/tracing.py` | OpenTelemetry bootstrap exists as best-effort instrumentation. |
| Alerts | missing | clean-room product path | No alert routing, paging, or SLO alarms are implemented. |
| Runtime monitoring | missing | clean-room product path | No operational dashboard or metrics sink is wired. |
| Production evals | missing | clean-room product path | Eval harness is local and manual today. |
| Mobile web shell | partial | `web/components/mobile/`, `web/components/chat/ChatLayout.tsx` | Mobile shell is now wired for navigation, composer, and file viewing, but not fully productized. |
| Mobile-native app | missing | product path | No React Native, Capacitor, or native app exists. |

## Highest-Value Follow-Ups

1. Add chunked ingestion plus external embedding/vector storage for MES and operations corpora.
2. Add schema-bound structured outputs and a controlled tool-execution layer for orchestration.
3. Promote tracing into metrics, dashboards, and alerts for production operations.
4. Extend the mobile shell beyond chat basics into research, settings, and share flows.