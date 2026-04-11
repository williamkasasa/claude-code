# AG-Claw OpenViking Spike

## Source Reference

- `volcengine/OpenViking`

## Why It Fits

- offers a useful memory and context-namespace model rather than a generic vector-store pitch
- aligns with AG-Claw's need to distinguish user memory, operator-session context, and durable plant-facing knowledge
- suggests a clean separation between recall, commit, and session-scoped context state

## AG-Claw Integration Target

- future memory/context subsystem only
- no coupling to the current web runtime or promptfoo harness
- no replacement of the current repo memory system until a backend-owned abstraction exists

## Immediate Repository Use

- use the OpenViking model as the design reference for a future clean-room memory API
- map its namespace approach into AG-Claw concepts:
  - operator session context
  - task memory
  - durable plant knowledge
  - shareable investigation bundles

## Proposed First Slice

1. Define a backend memory contract with `recall`, `commit`, and `list namespaces` operations.
2. Add explicit namespace rules for operator session, orchestration history, and MES research context.
3. Keep storage implementation pluggable so local filesystem and future hosted stores can share one API.

## Non-Goals For This Repo State

- no direct adoption of `viking://` URIs in the current app
- no new runtime dependency on OpenViking
- no hidden memory writes from UI components
