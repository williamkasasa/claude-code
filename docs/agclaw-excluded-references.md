# AG-Claw Excluded References

## Intentionally Excluded

### heretic

Status: rejected

Reason:

- focuses on refusal and censorship removal
- conflicts with AG-Claw safety gates and industrial advisory posture
- increases legal and operational risk for MES workflows
- directly cuts against prompt evaluation controls already added to this repo

Decision:

- do not integrate `p-e-w/heretic` into the clean-room shell, backend, or research workflows
- keep any mention of it in planning docs as a rejected reference, not an implementation target

### 666ghj/MiroFish, OpenViking, agency-agents, nanochat, impeccable

Status: upstream repos remain non-vendored reference inputs, except for the local `impeccable` audit hook

Reason:

- the repo uses the concepts, not the upstream codebases, for this implementation slice
- AG-Claw now exposes pack, memory, workflow, and nano-brief behavior directly in its own clean-room UI and orchestration layers
- the upstream repositories still should not be coupled into hosted providers or runtime boot paths without a separate subsystem fit review

Decision:

- do not install or vendor `666ghj/MiroFish`; use it only as a reference for graph, simulation, and reporting-agent patterns
- keep `volcengine/OpenViking` as the upstream memory/context design reference; AG-Claw maps its ideas into local memory namespaces, commit modes, and investigation bundles
- keep `msitarzewski/agency-agents` as the upstream agent-packaging reference; AG-Claw maps its ideas into local agent packs and orchestration roles
- keep `karpathy/nanochat` as the upstream minimal-chat reference; AG-Claw maps its ideas into the local `nano-chat` pack, nano briefs, and carry-forward summaries
- keep `666ghj/MiroFish` as the upstream workflow reference; AG-Claw maps its ideas into local staged workflow modes and research orchestration stages
- allow `pbakaus/impeccable` as a local web-shell audit tool via `bun run audit:web-ui` or `npm run audit:ui` in `web`, but do not wire it into production runtime paths
