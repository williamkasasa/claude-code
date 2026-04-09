from __future__ import annotations

import argparse
import json
import statistics
import threading
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from agclaw_backend.http_api import create_server
from agclaw_backend.test_fixtures import create_openai_fixture_server


def _post_json(url: str, payload: dict[str, object], *, timeout_seconds: float) -> None:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    _read_response(request, timeout_seconds=timeout_seconds)


def _get(url: str, *, timeout_seconds: float) -> None:
    request = Request(url, method="GET")
    _read_response(request, timeout_seconds=timeout_seconds)


def _read_response(request: Request, *, timeout_seconds: float) -> None:
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"HTTP {error.code}: {detail or error.reason}") from error
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


def _measure(label: str, iterations: int, fn) -> dict[str, object]:
    samples_ms: list[float] = []
    errors: list[str] = []
    for _ in range(iterations):
        start = time.perf_counter()
        try:
            fn()
            samples_ms.append((time.perf_counter() - start) * 1000)
        except Exception as error:  # noqa: BLE001
            errors.append(str(error))
    if not samples_ms:
        return {
            "label": label,
            "iterations": iterations,
            "failures": len(errors),
            "error": errors[0] if errors else "No successful samples captured",
        }
    samples_ms.sort()
    p95_index = max(0, min(len(samples_ms) - 1, int(round((len(samples_ms) - 1) * 0.95))))
    result = {
        "label": label,
        "iterations": iterations,
        "successful_iterations": len(samples_ms),
        "avg_ms": round(statistics.mean(samples_ms), 2),
        "median_ms": round(statistics.median(samples_ms), 2),
        "p95_ms": round(samples_ms[p95_index], 2),
        "max_ms": round(max(samples_ms), 2),
    }
    if errors:
        result["failures"] = len(errors)
        result["last_error"] = errors[-1]
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark AG-Claw clean-room backend endpoints.")
    parser.add_argument("--iterations", type=int, default=10)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8018)
    parser.add_argument("--timeout-seconds", type=float, default=5.0)
    parser.add_argument("--self-host", action="store_true", help="Start a temporary backend server for the benchmark run.")
    args = parser.parse_args()

    if args.iterations < 1:
        raise SystemExit("--iterations must be at least 1")
    if args.timeout_seconds <= 0:
        raise SystemExit("--timeout-seconds must be greater than 0")

    fixture = None
    fixture_thread = None
    server = None
    server_thread = None

    try:
        fixture = create_openai_fixture_server(port=0)
        fixture_thread = threading.Thread(target=fixture.serve_forever, daemon=True)
        fixture_thread.start()
        fixture_url = f"http://127.0.0.1:{fixture.server_address[1]}"

        if args.self_host:
            server = create_server(host=args.host, port=args.port)
            server_thread = threading.Thread(target=server.serve_forever, daemon=True)
            server_thread.start()
            time.sleep(0.1)

        base_url = f"http://{args.host}:{args.port}"
        measurements = [
            _measure("health", args.iterations, lambda: _get(f"{base_url}/health", timeout_seconds=args.timeout_seconds)),
            _measure(
                "provider-health",
                args.iterations,
                lambda: _get(
                    f"{base_url}/api/provider-health?provider=openai-compatible&apiUrl={fixture_url}",
                    timeout_seconds=args.timeout_seconds,
                ),
            ),
            _measure(
                "mes-retrieve",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/retrieve",
                    {"query": "genealogy traceability", "domains": ["isa-95"], "dataset_ids": ["isa95-core"], "limit": 3},
                    timeout_seconds=args.timeout_seconds,
                ),
            ),
            _measure(
                "mes-log-slim",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/log-slim",
                    {
                        "text": "\n".join(
                            [
                                "2026-04-03T08:00:01Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:02Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:03Z Batch=42 started by operator=anne",
                                "2026-04-03T08:00:04Z LINE1 ALARM 42 ACTIVE",
                                "2026-04-03T08:00:05Z Batch=42 started by operator=anne",
                            ]
                        ),
                        "preserve_tokens": ["Batch=42", "operator"],
                        "max_lines": 4,
                    },
                    timeout_seconds=args.timeout_seconds,
                ),
            ),
            _measure(
                "orchestrate",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/orchestrate",
                    {
                        "prompt": "Review MES release flow for operator approvals and genealogy capture.",
                        "provider": "ollama",
                        "model": "qwen2.5-coder:7b",
                        "roles": ["plc-analyst", "devops", "safety"],
                        "context": {"workspace_root": str(Path.cwd())},
                    },
                    timeout_seconds=args.timeout_seconds,
                ),
            ),
            _measure(
                "screen-review",
                args.iterations,
                lambda: _post_json(
                    f"{base_url}/api/mes/interpret-screen",
                    {
                        "title": "Mixer release screen",
                        "notes": "Alarm banner visible. Manual mode lit. Batch 42 recipe screen open with release hold indicator.",
                        "visible_labels": ["ALARM 42", "MANUAL MODE", "Batch 42", "Release Hold"],
                    },
                    timeout_seconds=args.timeout_seconds,
                ),
            ),
        ]

        print(json.dumps({"base_url": base_url, "results": measurements}, indent=2))
        return 0
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if server_thread is not None:
            server_thread.join(timeout=2)
        if fixture is not None:
            fixture.shutdown()
            fixture.server_close()
        if fixture_thread is not None:
            fixture_thread.join(timeout=2)


if __name__ == "__main__":
    raise SystemExit(main())
