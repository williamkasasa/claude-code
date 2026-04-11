# AG-Claw MiroFish Spike

## Source Reference

- `666ghj/MiroFish`

## Why It Fits

- demonstrates a graph-oriented workflow for simulation, reporting, and staged multi-agent reasoning
- matches AG-Claw's need for explicit review stages in screen interpretation and MES research flows
- is more useful here as a workflow pattern than as a direct code dependency

## AG-Claw Integration Target

- staged orchestration for research and diagnostic flows
- especially useful for:
  - screen-review summaries
  - MES retrieval synthesis
  - report generation after promptfoo or operator checks

## Immediate Repository Use

- use the reference to justify an explicit multi-stage orchestration graph in the clean-room backend
- keep the current runtime unchanged while documenting the target workflow shape

## Proposed First Slice

1. Split orchestration into graph stages: retrieve, interpret, summarize, report.
2. Add intermediate typed artifacts between stages instead of only passing free-form text.
3. Reuse the pattern for promptfoo result summarization after multimodal gate runs.

## Non-Goals For This Repo State

- no vendoring of MiroFish code
- no adoption of its external memory/tooling dependencies as-is
- no workflow engine swap before backend orchestration contracts are stabilized
