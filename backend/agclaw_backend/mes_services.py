from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import json
import math
import os
from functools import lru_cache
from pathlib import Path
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .contracts import (
    LogSlimRequest,
    LogSlimResponse,
    MesDataset,
    MesDocument,
    MesRetrieveRequest,
    MesRetrieveResponse,
    ScreenInterpretRequest,
    ScreenInterpretResponse,
)


TOKEN_RE = re.compile(r"[a-z0-9]+(?:[-_/][a-z0-9]+)*")
STOP_TERMS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}


@dataclass(frozen=True, slots=True)
class _IndexedMesDocument:
    document: MesDocument
    vector: dict[str, float]
    norm: float
    title_terms: frozenset[str]
    tag_terms: frozenset[str]
    searchable_text: str


@dataclass(frozen=True, slots=True)
class _MesSearchIndex:
    documents: tuple[_IndexedMesDocument, ...]
    idf: dict[str, float]


def _route_suffix(route_key: str) -> str:
    normalized = "_".join(part for part in str(route_key or "").strip().upper().split("-") if part)
    return f"_{normalized}" if normalized else ""


def _route_env(base_name: str, route_key: str = "") -> str:
    routed = os.getenv(f"{base_name}{_route_suffix(route_key)}", "").strip()
    if routed:
        return routed
    return os.getenv(base_name, "").strip()


def _request_json(
    url: str,
    payload: dict[str, object],
    headers: dict[str, str],
    timeout_seconds: float = 30.0,
) -> dict[str, object]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8")
        raise RuntimeError(body or f"Vision endpoint returned HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(str(error.reason)) from error


def _data_dir() -> Path:
    return Path(__file__).resolve().parent / "data"


def _registry_path() -> Path:
    configured = os.getenv("AGCLAW_MES_REGISTRY_PATH", "").strip()
    if configured:
        return Path(configured)
    return _data_dir() / "mes_dataset_registry.json"


def _resolve_dataset_file(file_name: str) -> Path:
    return _registry_path().parent / file_name


@lru_cache(maxsize=1)
def _load_dataset_registry() -> list[MesDataset]:
    payload = json.loads(_registry_path().read_text(encoding="utf-8"))
    return [MesDataset(**item) for item in payload]


@lru_cache(maxsize=1)
def _load_reference_documents() -> list[MesDocument]:
    documents: list[MesDocument] = []
    for dataset in _load_dataset_registry():
        dataset_path = _resolve_dataset_file(dataset.file)
        payload = json.loads(dataset_path.read_text(encoding="utf-8"))
        for document in payload:
            documents.append(
                MesDocument(
                    source=document.get("source", dataset.name),
                    title=document.get("title", ""),
                    excerpt=document.get("excerpt", ""),
                    tags=document.get("tags", []),
                    dataset_id=dataset.id,
                    dataset_version=dataset.version,
                )
            )
    return documents


def _expanded_terms(text: str) -> list[str]:
    terms: list[str] = []
    for raw_token in TOKEN_RE.findall(text.lower()):
        if raw_token in STOP_TERMS:
            continue
        terms.append(raw_token)
        for fragment in re.split(r"[-_/]", raw_token):
            if len(fragment) > 1 and fragment not in STOP_TERMS and fragment != raw_token:
                terms.append(fragment)
    return terms


def _add_weighted_terms(counter: Counter[str], text: str, weight: float) -> None:
    for term in _expanded_terms(text):
        counter[term] += weight


def _document_term_counter(document: MesDocument) -> Counter[str]:
    counter: Counter[str] = Counter()
    _add_weighted_terms(counter, document.title, 3.0)
    _add_weighted_terms(counter, document.excerpt, 2.0)
    _add_weighted_terms(counter, " ".join(document.tags), 2.5)
    _add_weighted_terms(counter, document.source, 1.0)
    _add_weighted_terms(counter, document.dataset_id, 1.5)
    _add_weighted_terms(counter, document.dataset_version, 0.5)
    return counter


def _build_query_vector(query_terms: list[str], domain_terms: set[str], idf: dict[str, float]) -> tuple[dict[str, float], float]:
    weighted_terms: Counter[str] = Counter(query_terms)
    for term in domain_terms:
        weighted_terms[term] += 0.75
    vector = {term: weight * idf.get(term, 1.0) for term, weight in weighted_terms.items()}
    norm = math.sqrt(sum(weight * weight for weight in vector.values()))
    return vector, norm


def _cosine_similarity(query_vector: dict[str, float], query_norm: float, document_vector: dict[str, float], document_norm: float) -> float:
    if query_norm == 0 or document_norm == 0:
        return 0.0
    dot_product = sum(query_vector.get(term, 0.0) * document_vector.get(term, 0.0) for term in query_vector)
    if dot_product <= 0:
        return 0.0
    return dot_product / (query_norm * document_norm)


def _annotated_document(
    document: MesDocument,
    *,
    retrieval_score: float,
    lexical_score: float,
    semantic_score: float,
    metadata_score: float,
    matched_terms: list[str],
    matched_tags: list[str],
) -> MesDocument:
    return MesDocument(
        source=document.source,
        title=document.title,
        excerpt=document.excerpt,
        tags=list(document.tags),
        dataset_id=document.dataset_id,
        dataset_version=document.dataset_version,
        retrieval_score=round(retrieval_score, 4),
        lexical_score=round(lexical_score, 4),
        semantic_score=round(semantic_score, 4),
        metadata_score=round(metadata_score, 4),
        matched_terms=matched_terms,
        matched_tags=matched_tags,
    )


@lru_cache(maxsize=1)
def _load_search_index() -> _MesSearchIndex:
    documents = _load_reference_documents()
    document_frequencies: Counter[str] = Counter()
    document_counters = [_document_term_counter(document) for document in documents]
    for counter in document_counters:
        document_frequencies.update(counter.keys())

    total_documents = max(1, len(documents))
    idf = {
        term: 1.0 + math.log((1 + total_documents) / (1 + frequency))
        for term, frequency in document_frequencies.items()
    }

    indexed_documents: list[_IndexedMesDocument] = []
    for document, counter in zip(documents, document_counters, strict=True):
        vector = {term: weight * idf.get(term, 1.0) for term, weight in counter.items()}
        norm = math.sqrt(sum(weight * weight for weight in vector.values()))
        indexed_documents.append(
            _IndexedMesDocument(
                document=document,
                vector=vector,
                norm=norm,
                title_terms=frozenset(_expanded_terms(document.title)),
                tag_terms=frozenset(_expanded_terms(" ".join(document.tags))),
                searchable_text=" ".join(
                    [
                        document.title,
                        document.excerpt,
                        " ".join(document.tags),
                        document.dataset_id,
                        document.dataset_version,
                    ]
                ).lower(),
            )
        )

    return _MesSearchIndex(documents=tuple(indexed_documents), idf=idf)


def list_mes_datasets() -> list[MesDataset]:
    return list(_load_dataset_registry())


def _extract_vision_summary(response: dict[str, object]) -> str:
    choices = response.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    message = choices[0].get("message", {}) if isinstance(choices[0], dict) else {}
    content = message.get("content", "") if isinstance(message, dict) else ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
        )
    return ""


def _vision_adapter(route_key: str = "") -> tuple[str, str, str, str]:
    provider = _route_env("AGCLAW_SCREEN_VISION_PROVIDER", route_key).lower()
    base_url = _route_env("AGCLAW_SCREEN_VISION_BASE_URL", route_key)
    api_key = _route_env("AGCLAW_SCREEN_VISION_API_KEY", route_key)
    model = _route_env("AGCLAW_SCREEN_VISION_MODEL", route_key)
    return provider, base_url, api_key, model


def _vision_timeout_seconds(route_key: str = "") -> float:
    raw_value = _route_env("AGCLAW_SCREEN_VISION_TIMEOUT_SECONDS", route_key) or "180"
    try:
        return max(30.0, float(raw_value))
    except ValueError:
        return 180.0


def _run_openai_vision(prompt: str, image_data_url: str, route_key: str = "") -> tuple[str, str]:
    provider, base_url, api_key, model = _vision_adapter(route_key)
    if provider not in {"github-models", "openai", "openai-compatible", "ollama", "vllm"} or not base_url or not model or not image_data_url:
        return "heuristic", ""

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        "temperature": 0.1,
        "max_tokens": 500,
        "stream": False,
    }
    headers = {
        "Content-Type": "application/json",
        **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
    }
    if provider == "github-models":
        headers["X-GitHub-Api-Version"] = "2022-11-28"
        target = f"{base_url.rstrip('/')}/chat/completions"
    else:
        target = f"{base_url.rstrip('/')}/v1/chat/completions"
    response = _request_json(target, payload, headers, timeout_seconds=_vision_timeout_seconds(route_key))
    return provider, _extract_vision_summary(response)


def slim_log(request: LogSlimRequest) -> LogSlimResponse:
    lines = [line.rstrip() for line in request.text.splitlines() if line.strip()]
    preserved: list[str] = []
    seen = Counter[str]()

    for line in lines:
        normalized = " ".join(line.split())
        should_keep = any(token and token.lower() in normalized.lower() for token in request.preserve_tokens)
        if should_keep or seen[normalized] == 0:
            preserved.append(line)
        seen[normalized] += 1
        if len(preserved) >= request.max_lines:
            break

    return LogSlimResponse(
        original_lines=len(lines),
        kept_lines=len(preserved),
        text="\n".join(preserved),
    )


def retrieve_mes_context(request: MesRetrieveRequest) -> MesRetrieveResponse:
    query_terms = _expanded_terms(request.query)
    query_term_set = set(query_terms)
    domain_terms = {term for domain in request.domains for term in _expanded_terms(domain)}
    dataset_filter = {dataset_id.lower() for dataset_id in request.dataset_ids}
    datasets = list_mes_datasets()
    search_index = _load_search_index()
    query_vector, query_norm = _build_query_vector(query_terms, domain_terms, search_index.idf)

    scored: list[MesDocument] = []
    for indexed_document in search_index.documents:
        document = indexed_document.document
        if dataset_filter and document.dataset_id.lower() not in dataset_filter:
            continue

        matched_terms = sorted(term for term in query_term_set if term in indexed_document.vector)
        matched_tags = sorted(domain_terms.intersection(indexed_document.tag_terms))

        lexical_coverage = len(matched_terms) / max(1, len(query_term_set)) if query_term_set else 0.0
        title_overlap = len(query_term_set.intersection(indexed_document.title_terms)) / max(1, len(query_term_set)) if query_term_set else 0.0
        phrase_boost = 0.35 if request.query.strip() and request.query.lower() in indexed_document.searchable_text else 0.0
        lexical_score = lexical_coverage + (0.25 * title_overlap) + phrase_boost

        semantic_score = _cosine_similarity(query_vector, query_norm, indexed_document.vector, indexed_document.norm)

        metadata_score = 0.0
        if dataset_filter and document.dataset_id.lower() in dataset_filter:
            metadata_score += 0.25
        if domain_terms:
            if matched_tags:
                metadata_score += 0.2 + (0.05 * min(3, len(matched_tags)))
            else:
                metadata_score -= 0.05

        retrieval_score = (lexical_score * 0.45) + (semantic_score * 0.40) + (metadata_score * 0.15)

        if retrieval_score > 0 or not query_term_set:
            scored.append(
                _annotated_document(
                    document,
                    retrieval_score=retrieval_score,
                    lexical_score=lexical_score,
                    semantic_score=semantic_score,
                    metadata_score=metadata_score,
                    matched_terms=matched_terms,
                    matched_tags=matched_tags,
                )
            )

    if not scored and dataset_filter:
        for indexed_document in search_index.documents:
            document = indexed_document.document
            if document.dataset_id.lower() in dataset_filter:
                scored.append(
                    _annotated_document(
                        document,
                        retrieval_score=0.25,
                        lexical_score=0.0,
                        semantic_score=0.0,
                        metadata_score=0.25,
                        matched_terms=[],
                        matched_tags=[],
                    )
                )

    scored.sort(
        key=lambda document: (
            document.retrieval_score,
            document.semantic_score,
            document.lexical_score,
            document.title.lower(),
        ),
        reverse=True,
    )
    results = scored[: max(1, request.limit)]
    visible_dataset_ids = {document.dataset_id for document in results}
    visible_datasets = [dataset for dataset in datasets if dataset.id in visible_dataset_ids or dataset.id in request.dataset_ids]
    return MesRetrieveResponse(
        query=request.query,
        results=results,
        datasets=visible_datasets,
        strategy="hybrid-tfidf",
        total_candidates=len(scored),
        applied_dataset_ids=sorted(dataset_filter),
    )


def interpret_screen(request: ScreenInterpretRequest) -> ScreenInterpretResponse:
    haystack = " ".join([request.title, request.notes, *request.visible_labels]).lower()
    observations: list[str] = []
    risks: list[str] = []
    recommended_follow_up: list[str] = []
    adapter = "heuristic"

    if request.image_name:
        observations.append(f"Attached screenshot received: {request.image_name}.")
        recommended_follow_up.append("Compare the uploaded screen against OCR notes so visible state and typed notes do not diverge.")
    if request.image_data_url.startswith("data:image/"):
        image_kind = request.image_data_url.split(";", 1)[0].replace("data:", "")
        observations.append(f"Screenshot payload type detected: {image_kind}.")
        vision_prompt = (
            "Review this industrial HMI or SCADA screenshot in advisory mode. "
            "Summarize visible alarms, operating mode, batch or recipe context, quality hold or release state, "
            "and any operator prompts. Do not suggest control actions."
        )
        try:
            adapter, vision_summary = _run_openai_vision(vision_prompt, request.image_data_url, route_key="hmi")
            if vision_summary.strip():
                observations.append(f"Vision summary: {vision_summary.strip()}")
        except RuntimeError as error:
            risks.append(f"Vision adapter fallback triggered: {error}")
            adapter = "heuristic"

    if any(term in haystack for term in ["alarm", "fault", "trip"]):
        observations.append("The screen indicates an alarmed or faulted condition that should be reviewed before any operational changes.")
        risks.append("Do not recommend overrides or forced run actions while alarm context is incomplete.")
    if any(term in haystack for term in ["batch", "lot", "recipe"]):
        observations.append("The screen appears tied to active batch or recipe execution, so genealogy and release impact should be considered.")
        recommended_follow_up.append("Capture batch id, recipe id, and operator acknowledgement state for traceability.")
    if any(term in haystack for term in ["manual", "override", "hand"]):
        observations.append("The interface suggests a manual or override-capable operating mode.")
        risks.append("Manual override recommendations require explicit human review and safety confirmation.")
    if any(term in haystack for term in ["hold", "quality", "release"]):
        observations.append("Quality or release controls are visible on the screen.")
        risks.append("Recommendations must preserve hold/release approval steps and reason-code traceability.")

    if not observations:
        observations.append("The screen can be used for descriptive review, but the visible state is not specific enough for operational recommendations.")
    if not risks:
        risks.append("Maintain advisory-only guidance until machine state, alarm context, and approval workflow are verified.")
    if not recommended_follow_up:
        recommended_follow_up.extend(
            [
                "Collect operator-visible labels and active status indicators.",
                "Pair the screenshot with event logs before proposing any workflow change.",
            ]
        )

    return ScreenInterpretResponse(
        summary=f"Reviewed screen '{request.title or 'unnamed screen'}' in research mode.",
        adapter=adapter,
        observations=observations,
        risks=risks,
        recommended_follow_up=recommended_follow_up,
    )
