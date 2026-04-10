#!/usr/bin/env bash
# LiteLLM launcher for the AG-Claw multimodal gateway.
#
# Usage:
#   ./litellm/start.sh [--config <path>] [--port <port>]
#
# Environment:
#   HF_TOKEN          HuggingFace token for hosted-model routes (required for
#                     vision-caption-hosted, vision-hmi-hosted, vision-ocr-hosted).
#   LITELLM_PORT      Listening port (default: 4000).
#   LITELLM_CONFIG    Path to the LiteLLM config file
#                     (default: <this script's directory>/agclaw-config.local.yaml).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CONFIG="${LITELLM_CONFIG:-${SCRIPT_DIR}/agclaw-config.local.yaml}"
PORT="${LITELLM_PORT:-4000}"

# Parse optional CLI overrides.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      CONFIG="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "${CONFIG}" ]]; then
  echo "LiteLLM config not found: ${CONFIG}" >&2
  exit 1
fi

if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "Warning: HF_TOKEN is not set — hosted HuggingFace routes will be unavailable." >&2
fi

echo "Starting LiteLLM proxy  config=${CONFIG}  port=${PORT}"
exec litellm --config "${CONFIG}" --port "${PORT}"
