from __future__ import annotations

import json
import os
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from uuid import UUID, uuid4

from .contracts import (
    InvestigationBundle,
    OrchestrationArtifactBundle,
    OrchestrationHistoryEntry,
    ResearchRequest,
    ResearchResponse,
    RoleArtifact,
    RolePlan,
)

_LOCK = Lock()


def _normalize_role_id(role: str) -> str:
    return role.value if hasattr(role, "value") else str(role)


def _history_path() -> Path:
    configured = os.getenv("AGCLAW_HISTORY_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "orchestration-history.jsonl"


def _artifact_dir() -> Path:
    configured = os.getenv("AGCLAW_ARTIFACT_DIR", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "orchestration-artifacts"


def _serialize_role_plan(plan: RolePlan) -> dict[str, object]:
    return {
        "role": plan.role,
        "objective": plan.objective,
        "findings": list(plan.findings),
        "next_actions": list(plan.next_actions),
        "artifacts": [
            {
                "kind": artifact.kind,
                "title": artifact.title,
                "body": artifact.body,
                "review_gate": artifact.review_gate,
            }
            for artifact in plan.artifacts
        ],
    }


def _deserialize_role_plan(payload: dict[str, object]) -> RolePlan:
    artifact_payloads = payload.get("artifacts", [])
    artifacts = [
        RoleArtifact(
            kind=str(item.get("kind", "")),
            title=str(item.get("title", "")),
            body=str(item.get("body", "")),
            review_gate=str(item.get("review_gate", "human-review")),
        )
        for item in artifact_payloads
        if isinstance(item, dict)
    ]
    return RolePlan(
        role=str(payload.get("role", "")),
        objective=str(payload.get("objective", "")),
        findings=[str(item) for item in payload.get("findings", []) if isinstance(item, str)],
        next_actions=[str(item) for item in payload.get("next_actions", []) if isinstance(item, str)],
        artifacts=artifacts,
    )


def _serialize_bundle(bundle: InvestigationBundle | None) -> dict[str, object] | None:
    if bundle is None:
        return None
    return {
        "label": bundle.label,
        "status": bundle.status,
        "agent_pack": bundle.agent_pack,
        "memory_namespace": bundle.memory_namespace,
        "memory_commit_mode": bundle.memory_commit_mode,
        "workflow_mode": bundle.workflow_mode,
        "workflow_stages": list(bundle.workflow_stages),
        "report_sections": list(bundle.report_sections),
        "artifact_titles": list(bundle.artifact_titles),
        "nano_summary": bundle.nano_summary,
        "carry_forward": bundle.carry_forward,
    }


def _deserialize_bundle(payload: dict[str, object] | None) -> InvestigationBundle | None:
    if not isinstance(payload, dict):
        return None
    return InvestigationBundle(
        label=str(payload.get("label", "Investigation bundle")),
        status=str(payload.get("status", "draft-review")),
        agent_pack=str(payload.get("agent_pack", "")),
        memory_namespace=str(payload.get("memory_namespace", "")),
        memory_commit_mode=str(payload.get("memory_commit_mode", "")),
        workflow_mode=str(payload.get("workflow_mode", "")),
        workflow_stages=[str(item) for item in payload.get("workflow_stages", []) if isinstance(item, str)],
        report_sections=[str(item) for item in payload.get("report_sections", []) if isinstance(item, str)],
        artifact_titles=[str(item) for item in payload.get("artifact_titles", []) if isinstance(item, str)],
        nano_summary=str(payload.get("nano_summary", "")),
        carry_forward=str(payload.get("carry_forward", "")),
    )


def _metadata_string(metadata: dict[str, object], key: str, default: str = "") -> str:
    value = metadata.get(key, default)
    return value.strip() if isinstance(value, str) else str(value).strip()


def _metadata_list(metadata: dict[str, object], key: str) -> list[str]:
    value = metadata.get(key, [])
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def append_orchestration_history(request: ResearchRequest, response: ResearchResponse) -> OrchestrationHistoryEntry:
    record_id = str(uuid4())
    created_at = datetime.now(UTC).isoformat()
    metadata = request.context.metadata if isinstance(request.context.metadata, dict) else {}
    detail = OrchestrationArtifactBundle(
        id=record_id,
        created_at=created_at,
        prompt=request.prompt,
        provider=request.provider.value,
        model=request.model,
        roles=[_normalize_role_id(role) for role in request.roles],
        context={
            "workspace_root": request.context.workspace_root,
            "project_name": request.context.project_name,
            "safety_mode": request.context.safety_mode,
            "metadata": request.context.metadata,
        },
        attachments=list(request.attachments),
        summary=response.summary,
        findings=list(response.findings),
        follow_up_actions=list(response.follow_up_actions),
        role_plans=response.role_plans,
        requires_human_review=response.requires_human_review,
        agent_pack=response.agent_pack or _metadata_string(metadata, "agent_pack"),
        memory_namespace=response.memory_namespace or _metadata_string(metadata, "memory_namespace"),
        memory_commit_mode=response.memory_commit_mode or _metadata_string(metadata, "memory_commit_mode"),
        workflow_mode=response.workflow_mode or _metadata_string(metadata, "workflow_mode"),
        workflow_stages=response.workflow_stages or _metadata_list(metadata, "workflow_stages"),
        nano_summary=response.nano_summary,
        bundle=response.bundle,
    )
    entry = OrchestrationHistoryEntry(
        id=record_id,
        created_at=created_at,
        prompt=request.prompt,
        provider=request.provider.value,
        model=request.model,
        roles=[_normalize_role_id(role) for role in request.roles],
        summary=response.summary,
        findings=response.findings,
        artifact_count=sum(len(plan.artifacts) for plan in response.role_plans),
        requires_human_review=response.requires_human_review,
        agent_pack=detail.agent_pack,
        memory_namespace=detail.memory_namespace,
        memory_commit_mode=detail.memory_commit_mode,
        workflow_mode=detail.workflow_mode,
        bundle_label=detail.bundle.label if detail.bundle else "",
        bundle_status=detail.bundle.status if detail.bundle else "",
        nano_summary=response.nano_summary,
        detail_id=record_id,
    )

    history_path = _history_path()
    artifact_dir = _artifact_dir()
    history_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    detail_payload = {
        "id": detail.id,
        "created_at": detail.created_at,
        "prompt": detail.prompt,
        "provider": detail.provider,
        "model": detail.model,
        "roles": detail.roles,
        "context": detail.context,
        "attachments": detail.attachments,
        "summary": detail.summary,
        "findings": detail.findings,
        "follow_up_actions": detail.follow_up_actions,
        "role_plans": [_serialize_role_plan(plan) for plan in detail.role_plans],
        "requires_human_review": detail.requires_human_review,
        "agent_pack": detail.agent_pack,
        "memory_namespace": detail.memory_namespace,
        "memory_commit_mode": detail.memory_commit_mode,
        "workflow_mode": detail.workflow_mode,
        "workflow_stages": detail.workflow_stages,
        "nano_summary": detail.nano_summary,
        "bundle": _serialize_bundle(detail.bundle),
    }

    artifact_path = artifact_dir / f"{record_id}.json"
    temp_path = artifact_dir / f"{record_id}.tmp"
    temp_path.write_text(
        json.dumps(detail_payload, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )
    temp_path.replace(artifact_path)

    with _LOCK:
        with history_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(entry), ensure_ascii=True) + "\n")
    return entry


def list_orchestration_history(limit: int = 20) -> list[OrchestrationHistoryEntry]:
    path = _history_path()
    if not path.exists():
        return []

    with _LOCK:
        lines = path.read_text(encoding="utf-8").splitlines()

    entries: list[OrchestrationHistoryEntry] = []
    for raw in reversed(lines[-max(1, limit):]):
        if not raw.strip():
            continue
        payload = json.loads(raw)
        entries.append(OrchestrationHistoryEntry(**payload))
    return entries


def get_orchestration_detail(detail_id: str) -> OrchestrationArtifactBundle | None:
    try:
        safe_id = str(UUID(detail_id))
    except ValueError:
        return None

    path = _artifact_dir() / f"{safe_id}.json"
    if not path.exists():
        return None

    with _LOCK:
        payload = json.loads(path.read_text(encoding="utf-8"))

    role_plan_payloads = payload.get("role_plans", [])
    return OrchestrationArtifactBundle(
        id=str(payload.get("id", safe_id)),
        created_at=str(payload.get("created_at", "")),
        prompt=str(payload.get("prompt", "")),
        provider=str(payload.get("provider", "")),
        model=str(payload.get("model", "")),
        roles=[str(item) for item in payload.get("roles", []) if isinstance(item, str)],
        context=payload.get("context", {}) if isinstance(payload.get("context", {}), dict) else {},
        attachments=[str(item) for item in payload.get("attachments", []) if isinstance(item, str)],
        summary=str(payload.get("summary", "")),
        findings=[str(item) for item in payload.get("findings", []) if isinstance(item, str)],
        follow_up_actions=[str(item) for item in payload.get("follow_up_actions", []) if isinstance(item, str)],
        role_plans=[
            _deserialize_role_plan(item)
            for item in role_plan_payloads
            if isinstance(item, dict)
        ],
        requires_human_review=bool(payload.get("requires_human_review", True)),
        agent_pack=str(payload.get("agent_pack", "")),
        memory_namespace=str(payload.get("memory_namespace", "")),
        memory_commit_mode=str(payload.get("memory_commit_mode", "")),
        workflow_mode=str(payload.get("workflow_mode", "")),
        workflow_stages=[str(item) for item in payload.get("workflow_stages", []) if isinstance(item, str)],
        nano_summary=str(payload.get("nano_summary", "")),
        bundle=_deserialize_bundle(payload.get("bundle") if isinstance(payload.get("bundle"), dict) else None),
    )
