from __future__ import annotations

from dataclasses import dataclass

from .contracts import InvestigationBundle, OrchestratorRole, ResearchRequest, ResearchResponse, RoleArtifact, RolePlan


@dataclass(slots=True)
class RoleAssignment:
    role: str
    objective: str


DEFAULT_ROLE_OBJECTIVES: dict[str, str] = {
    OrchestratorRole.PLC_ANALYST.value: "Analyze industrial logic, logs, and MES workflows without issuing control actions.",
    OrchestratorRole.DEVOPS.value: "Validate integration, automation, and deployment concerns for research infrastructure.",
    OrchestratorRole.SAFETY.value: "Review prompts and outputs for unsafe or non-compliant industrial recommendations.",
    "screen-reviewer": "Interpret HMI state, visible labels, and screen hierarchy without implying operational control.",
    "alarm-triage": "Assess alarm urgency, operator ambiguity, and evidence gaps before any action is considered.",
    "operator-handoff": "Write the shortest safe operator-facing carry-forward note for the next responder.",
    "eval-analyst": "Summarize multimodal evaluation signals, regressions, and confidence levels.",
    "artifact-reviewer": "Compare expected evidence against generated artifacts and note mismatches.",
    "remediation-owner": "Translate findings into a repair backlog with clear checks and owners.",
    "nano-brief": "Compress the active investigation into a one-screen brief with minimal narrative overhead.",
    "context-keeper": "Retain only the context required for the next step and discard low-signal detail.",
    "reply-editor": "Shape the final response for brevity, sequencing, and operator readability.",
}

PACK_LABELS = {
    "operator-swarm": "Operator swarm",
    "screen-review": "Screen review pack",
    "promptfoo-audit": "Promptfoo audit pack",
    "nano-chat": "Nano chat pack",
}

WORKFLOW_LABELS = {
    "staged-report": "staged report",
    "fast-pass": "fast pass",
    "review-heavy": "review heavy",
}

WORKFLOW_SECTION_LABELS = {
    "retrieve": "Evidence snapshot",
    "interpret": "Interpretation notes",
    "report": "Review report",
    "triage": "Triage brief",
    "nano-brief": "Nano brief",
    "handoff": "Handoff note",
    "challenge": "Contradiction check",
    "human-review": "Human review gate",
}

COMMIT_STATUS = {
    "manual-review": "draft-review",
    "session-handoff": "handoff-ready",
    "investigation-summary": "finalized",
}


def _normalize_role_id(role: str | OrchestratorRole) -> str:
    return role.value if isinstance(role, OrchestratorRole) else str(role)


def _metadata_string(request: ResearchRequest, key: str, default: str = "") -> str:
    value = request.context.metadata.get(key, default)
    return value.strip() if isinstance(value, str) else str(value).strip()


def _metadata_list(request: ResearchRequest, key: str) -> list[str]:
    value = request.context.metadata.get(key, [])
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _fallback_objective(role: str, request: ResearchRequest) -> str:
    pack_label = PACK_LABELS.get(_metadata_string(request, "agent_pack", "operator-swarm"), "research pack")
    return f"Contribute a concise {pack_label.lower()} review for: {request.prompt}"


def build_role_assignments(request: ResearchRequest) -> list[RoleAssignment]:
    assignments: list[RoleAssignment] = []
    for role in request.roles:
        role_id = _normalize_role_id(role)
        assignments.append(
            RoleAssignment(
                role=role_id,
                objective=DEFAULT_ROLE_OBJECTIVES.get(role_id, _fallback_objective(role_id, request)),
            )
        )
    return assignments


def _build_role_plan(role: str, objective: str, prompt: str, workflow_mode: str) -> RolePlan:
    if role == OrchestratorRole.PLC_ANALYST.value:
        findings = [
            f"Review control sequence implications for: {prompt}",
            "Check batch genealogy, state transitions, and operator acknowledgement steps.",
        ]
        next_actions = [
            "Identify affected ISA-95 production states.",
            "Verify no recommendation bypasses interlocks or release holds.",
        ]
        artifacts = [
            RoleArtifact(
                kind="checklist",
                title="PLC workflow review checklist",
                body="Validate sequence state transitions, genealogy capture points, alarm preconditions, and operator acknowledgement gates.",
            ),
            RoleArtifact(
                kind="traceability-note",
                title="Batch traceability focus",
                body="Capture batch id, lot lineage, recipe id, and hold/release transitions before proposing workflow changes.",
            ),
        ]
    elif role == OrchestratorRole.DEVOPS.value:
        findings = [
            "Confirm environment, API routing, and local-model prerequisites.",
            "Assess whether the workflow can be reproduced in the research harness.",
        ]
        next_actions = [
            "Validate provider health and model availability.",
            "Record required test coverage before rollout to other engineers.",
        ]
        artifacts = [
            RoleArtifact(
                kind="runbook",
                title="Research environment validation runbook",
                body="Verify backend health, provider routing, fixture availability, and browser test preconditions before sharing outputs.",
            ),
            RoleArtifact(
                kind="test-matrix",
                title="Change verification matrix",
                body="Run backend unit tests, web type-check/lint/build, Playwright E2E, and buddy determinism checks for each platform change.",
            ),
        ]
    elif role == OrchestratorRole.SAFETY.value:
        findings = [
            "Inspect the prompt and resulting advice for unsafe operational shortcuts.",
            "Flag any recommendation that weakens auditability, approvals, or traceability.",
        ]
        next_actions = [
            "Require human review before operational use.",
            "Run the promptfoo safety pack if the output will be reused.",
        ]
        artifacts = [
            RoleArtifact(
                kind="risk-register",
                title="Industrial safety review points",
                body="Document approval steps, interlocks, manual override exposure, and any traceability gaps before operational use.",
            ),
            RoleArtifact(
                kind="approval-gate",
                title="Required review gate",
                body="Treat all outputs as advisory-only until a qualified engineer confirms safety, data integrity, and plant impact.",
            ),
        ]
    elif role == "screen-reviewer":
        findings = [
            f"Interpret visible operator state and screen hierarchy for: {prompt}",
            "Highlight any label, banner, or mode ambiguity before the output is shared.",
        ]
        next_actions = [
            "Confirm the screen title, active batch, and release/hold indicators.",
            "Attach the screenshot or OCR excerpt to the investigation bundle.",
        ]
        artifacts = [
            RoleArtifact(
                kind="screen-note",
                title="Screen interpretation note",
                body="Capture the visible labels, page context, operating mode, and any blocked actions as advisory findings only.",
            ),
            RoleArtifact(
                kind="annotation-plan",
                title="HMI annotation plan",
                body="Mark the highest-signal labels and any conflicting banners so the next reviewer can verify them quickly.",
            ),
        ]
    elif role == "alarm-triage":
        findings = [
            "Separate alarm symptoms from confirmed causes before proposing follow-up.",
            "Treat missing context as a safety blocker rather than an invitation to speculate.",
        ]
        next_actions = [
            "Verify the alarm source, severity, and acknowledgement path.",
            "Escalate unresolved ambiguity to human review before any procedural recommendation.",
        ]
        artifacts = [
            RoleArtifact(
                kind="risk-register",
                title="Alarm triage risk register",
                body="Track alarm severity, missing evidence, acknowledgement status, and any operator-mode ambiguity.",
            )
        ]
    elif role == "operator-handoff":
        findings = [
            "Reduce the current state into a shift-safe handoff note.",
            "Keep only facts, review gates, and pending checks in the operator message.",
        ]
        next_actions = [
            "Write the carry-forward note in plain language.",
            "Point the next responder to the persisted investigation bundle.",
        ]
        artifacts = [
            RoleArtifact(
                kind="handoff-note",
                title="Operator handoff draft",
                body="Summarize the current state, unresolved risks, and exact evidence still needed before proceeding.",
            )
        ]
    elif role == "eval-analyst":
        findings = [
            "Compare the active run against the expected promptfoo gate behavior.",
            "Call out regressions, false positives, and confidence gaps explicitly.",
        ]
        next_actions = [
            "Record the failing case, expected evidence, and likely regression surface.",
            "Attach screenshots or prompts that support the evaluation claim.",
        ]
        artifacts = [
            RoleArtifact(
                kind="eval-summary",
                title="Promptfoo gate summary",
                body="Capture the observed pass/fail shape, confidence, and any anomalies that need engineering review.",
            )
        ]
    elif role == "artifact-reviewer":
        findings = [
            "Cross-check screenshots, OCR, and role outputs against the investigation objective.",
            "Note where the evidence bundle is incomplete or contradictory.",
        ]
        next_actions = [
            "Add missing evidence pointers to the bundle.",
            "List artifacts that need a second reviewer before sharing broadly.",
        ]
        artifacts = [
            RoleArtifact(
                kind="artifact-check",
                title="Artifact review checklist",
                body="Verify every screenshot, prompt, and excerpt in the run supports the stated conclusion.",
            )
        ]
    elif role == "remediation-owner":
        findings = [
            "Translate research findings into concrete fixes instead of generic recommendations.",
            f"Keep the backlog aligned to the {WORKFLOW_LABELS.get(workflow_mode, workflow_mode or 'active')} review path.",
        ]
        next_actions = [
            "Break the fix set into smallest verifiable changes.",
            "Attach the verification command or test expectation to each backlog item.",
        ]
        artifacts = [
            RoleArtifact(
                kind="remediation-backlog",
                title="Remediation backlog slice",
                body="List the repair steps, validation checks, and dependencies required to close the research finding.",
            )
        ]
    elif role == "nano-brief":
        findings = [
            "Condense the current investigation into the shortest possible useful brief.",
            "Keep only the deciding fact, the review gate, and the next action.",
        ]
        next_actions = [
            "Emit a one-screen summary before the longer report.",
            "Keep the wording short enough for rapid operator scanning.",
        ]
        artifacts = [
            RoleArtifact(
                kind="nano-brief",
                title="Nano brief",
                body="One-screen summary with the deciding fact, open risk, and next reviewer action.",
            )
        ]
    elif role == "context-keeper":
        findings = [
            "Preserve only the context required for the next step or handoff.",
            "Remove details that do not change the decision path.",
        ]
        next_actions = [
            "Select the evidence that must survive into the next response.",
            "Prune repetitive history from the carry-forward note.",
        ]
        artifacts = [
            RoleArtifact(
                kind="context-window",
                title="Carry-forward context window",
                body="Compact set of facts that the next turn needs without replaying the full transcript.",
            )
        ]
    else:
        findings = [
            f"Support the active investigation for: {prompt}",
            "Keep outputs concise, evidence-backed, and review-gated.",
        ]
        next_actions = [
            "Attach the result to the persisted bundle.",
            "Escalate unresolved ambiguity to a human reviewer.",
        ]
        artifacts = [
            RoleArtifact(
                kind="review-note",
                title="Role review note",
                body="Compact role-specific findings and the evidence needed before the recommendation is reused.",
            )
        ]
    return RolePlan(role=role, objective=objective, findings=findings, next_actions=next_actions, artifacts=artifacts)


def _build_nano_summary(request: ResearchRequest, role_plans: list[RolePlan], workflow_stages: list[str]) -> str:
    lead_role = role_plans[0].role.replace("-", " ") if role_plans else "research"
    deciding_fact = role_plans[0].findings[0] if role_plans and role_plans[0].findings else "Review context collected."
    next_stage = WORKFLOW_SECTION_LABELS.get(workflow_stages[1], workflow_stages[1].replace("-", " ")) if len(workflow_stages) > 1 else "human review"
    return f"{lead_role.title()}: {deciding_fact} Next focus: {next_stage}."


def _build_bundle(request: ResearchRequest, role_plans: list[RolePlan], nano_summary: str) -> InvestigationBundle:
    agent_pack = _metadata_string(request, "agent_pack", "operator-swarm")
    memory_namespace = _metadata_string(request, "memory_namespace", "task-memory")
    memory_commit_mode = _metadata_string(request, "memory_commit_mode", "manual-review")
    workflow_mode = _metadata_string(request, "workflow_mode", "staged-report")
    workflow_stages = _metadata_list(request, "workflow_stages") or ["retrieve", "interpret", "report"]
    artifact_titles = [artifact.title for plan in role_plans for artifact in plan.artifacts]
    return InvestigationBundle(
        label="Investigation bundle",
        status=COMMIT_STATUS.get(memory_commit_mode, "draft-review"),
        agent_pack=agent_pack,
        memory_namespace=memory_namespace,
        memory_commit_mode=memory_commit_mode,
        workflow_mode=workflow_mode,
        workflow_stages=workflow_stages,
        report_sections=[WORKFLOW_SECTION_LABELS.get(stage, stage.replace("-", " ").title()) for stage in workflow_stages],
        artifact_titles=artifact_titles,
        nano_summary=nano_summary,
        carry_forward="Promote the nano brief, flagged artifacts, and follow-up checks into the next responder handoff.",
    )


def run_research_orchestration(request: ResearchRequest) -> ResearchResponse:
    assignments = build_role_assignments(request)
    workflow_mode = _metadata_string(request, "workflow_mode", "staged-report")
    workflow_stages = _metadata_list(request, "workflow_stages") or ["retrieve", "interpret", "report"]
    agent_pack = _metadata_string(request, "agent_pack", "operator-swarm")
    memory_namespace = _metadata_string(request, "memory_namespace", "task-memory")
    memory_commit_mode = _metadata_string(request, "memory_commit_mode", "manual-review")
    role_plans = [_build_role_plan(assignment.role, assignment.objective, request.prompt, workflow_mode) for assignment in assignments]
    findings = [f"Assigned {assignment.role}: {assignment.objective}" for assignment in assignments]
    findings.append(f"Active agent pack: {PACK_LABELS.get(agent_pack, agent_pack or 'operator swarm')}.")
    findings.append(
        "Workflow stages: " + " -> ".join(WORKFLOW_SECTION_LABELS.get(stage, stage.replace("-", " ")) for stage in workflow_stages)
    )
    findings.append(f"Memory namespace: {memory_namespace} ({memory_commit_mode}).")
    findings.append("Research mode remains advisory-only. No direct plant-floor commands are executed.")
    nano_summary = _build_nano_summary(request, role_plans, workflow_stages)
    bundle = _build_bundle(request, role_plans, nano_summary)
    return ResearchResponse(
        summary=f"Prepared {len(assignments)} research roles for model {request.model} using {PACK_LABELS.get(agent_pack, agent_pack or 'the active pack')}.",
        findings=findings,
        follow_up_actions=[
            "Select provider adapter implementation.",
            f"Attach MES retrieval sources before the {WORKFLOW_LABELS.get(workflow_mode, workflow_mode or 'active')} handoff.",
            "Run prompt safety evaluation pack before exposing output to users.",
            bundle.carry_forward,
        ],
        role_plans=role_plans,
        agent_pack=agent_pack,
        memory_namespace=memory_namespace,
        memory_commit_mode=memory_commit_mode,
        workflow_mode=workflow_mode,
        workflow_stages=workflow_stages,
        nano_summary=nano_summary,
        bundle=bundle,
    )
