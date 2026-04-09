# AG-Claw Scouting Notes

## Hugging Face model shortlist

### Best local fits for this laptop

1. `Qwen/Qwen2.5-Coder-7B-Instruct`
2. `Qwen/Qwen2.5-Coder-3B-Instruct`
3. `Qwen/Qwen2.5-VL-3B-Instruct`
4. `Qwen/Qwen2.5-3B-Instruct`
5. `meta-llama/Llama-3.2-3B-Instruct`

### Gemma note

- `google/gemma-4-E2B-it` is a real current option for hosted-compatible or quantized experiments.
- It is not the first local recommendation for this workstation because the laptop is better served by smaller Qwen and Llama-family models.
- For Gemma-family local fallback, keep the runtime target small.

## Hugging Face dataset shortlist

Use these as evaluation or feature-prototyping inputs, not as drop-in MES truth sources.

### Document and screenshot understanding

1. `lmms-lab/DocVQA`
2. `howard-hou/OCR-VQA`
3. `lmms-lab/ChartQA`
4. `aharley/rvl_cdip`

### Why these matter

- `DocVQA`: document-question answering for screenshot and scanned screen review patterns.
- `OCR-VQA`: OCR-plus-question answering for text-heavy screenshots and operator panels.
- `ChartQA`: chart and trend interpretation for KPI and historian screens.
- `RVL-CDIP`: document classification for routing scanned forms, SOPs, and reports.

## GitHub integration shortlist

### Good candidates

1. `BerriAI/litellm`
   - Use as a possible future provider gateway if AG-Claw needs one adapter surface for many hosted and self-hosted models.
2. `modelcontextprotocol/servers`
   - Use as reference material for MCP server patterns and tool boundary design.
3. `docling-project/docling`
   - Use for future document extraction and OCR-heavy ingestion work.

### Not in this slice

- `heretic`
  - intentionally excluded because it conflicts with AG-Claw safety and industrial-control posture
