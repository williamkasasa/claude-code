# AG-Claw Local Model Notes

## Laptop profile used

- RAM: 32 GB
- Discrete VRAM: about 4 GB
- Runtime: Ollama on Windows

## Coding models tested

### qwen2.5-coder:3b

- Pull size: about 1.9 GB
- Strength: lower latency and lighter memory pressure
- Weakness: more likely to ignore structured-output constraints

### qwen2.5-coder:7b

- Pull size: about 4.7 GB
- Strength: better coding quality and better operational summaries
- Weakness: slower on longer responses

## Practical recommendation

1. Use `qwen2.5-coder:7b` as the default local coding model.
2. Use `qwen2.5-coder:3b` when you want a faster fallback on this laptop.
3. Use `qwen2.5vl:3b` for local HMI and screenshot review.
4. Use `qwen2.5:3b`, `llama3.2:3b`, or `gemma3:1b` as smaller general-purpose local assistants.

## Gemma guidance

- Hugging Face currently exposes [google/gemma-4-E2B-it](https://hf.co/google/gemma-4-E2B-it) and related GGUF conversions.
- Gemma 4 is a valid hosted-compatible research target, but it is not the best local default for this workstation.
- For local Gemma-family usage on this machine, prefer `gemma3:1b` if you want a lightweight fallback through Ollama.

## Notes from local smoke tests

- Both coder models answered successfully through Ollama.
- The 3B model was materially faster on short and medium prompts.
- The 7B model gave more grounded MES-oriented summaries.
- Both models failed a strict structured-output prompt in different ways, so any JSON-heavy workflow should keep validation on the application side.
