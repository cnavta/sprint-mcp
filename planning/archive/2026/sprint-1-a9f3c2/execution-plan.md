# Execution Plan – sprint-1-a9f3c2

## Objective

Revise `AGENTS.md` so the Sprint Protocol is explicitly a Human-LLM partnership with clear decision rights, intentional Git practices, human-owned releases, and retrospective artifacts designed for future semantic compaction and extraction.

## Scope

### In scope

- Reframe the protocol's purpose, lifecycle, rules, and roles around collaboration between a human and an LLM.
- Define the human as the authority for approvals, exceptions, sprint completion, and releases.
- Define the LLM as responsible for traceable planning, implementation, validation, verification, Git hygiene, and recommendations.
- Require creation of a dedicated feature branch during sprint initialization.
- Require regular commits at coherent checkpoints, with messages that communicate intent and include sprint/request traceability.
- Define pushing as the final default LLM completion handoff after validation and verification and before the human's official sprint-completion decision.
- Make PR ownership and timing explicit sprint decisions rather than mandatory LLM behavior; retain PR tooling as an optional capability.
- Make real releases exclusively human-decided and human-executed without prescribing a project-specific release tool or workflow.
- Extend the sprint manifest to represent blocked, cancelled, ready-for-handoff, normal-completion, and forced-completion states.
- Replace the remaining `implementation plan` terminology with `execution plan` and repair section numbering.
- Give `retro.md` and `key-learnings.md` stable, extraction-friendly structures using discrete evidence, outcomes, reusable lessons, applicability, confidence, and tags.
- Add a compact follow-up loop for human-requested tasks after an LLM delivery turn: stop, clarify, append to the backlog by default, then continue in backlog order.
- Make Human–LLM turns the primary traceability unit; retain only state-changing, evidentiary, or materially failed command records as supporting evidence.
- Define `backlog.yaml` as the sprint accountability contract using a compact trackable schema derived from `documentation/reference/backlog-example.yaml`, while keeping Human–LLM interaction narratives in `request-log.md`.
- Reduce `AGENTS.md` token size through reference extraction and rule consolidation without weakening authority, approval, safety, accountability, or completion gates.
- Resolve internal terminology and artifact-name inconsistencies encountered in the edited sections.

### Out of scope

- Implementing semantic compaction, embeddings, indexing, or extraction tooling.
- Changing runtime code, MCP tool behavior, or `architecture.yaml`.
- Performing a real release or changing the project version.
- Removing optional PR tooling from `architecture.yaml`; capability does not imply mandatory use.
- Redesigning unrelated code-style and platform-architecture rules.

## Deliverables

- Revised `AGENTS.md`.
- Sprint planning and traceability artifacts under `planning/sprint-1-a9f3c2/`.
- Documentation-oriented validation script.
- Verification, publication, retrospective, and learning artifacts produced in later phases.

## Acceptance Criteria

- The document consistently describes the process as a Human-LLM partnership rather than an LLM-led process.
- Human and LLM responsibilities and decision rights are explicit and non-overlapping where authority matters.
- Sprint initialization requires a new feature branch before implementation.
- The protocol requires commits after coherent work units and provides an intent-focused, machine-readable commit convention tied to sprint and request IDs.
- The LLM pushes the completed branch only after validation and verification unless the human approved another push cadence.
- The execution plan states whether a PR is required, who may create it, and when; sprint completion does not implicitly require a PR.
- No instruction authorizes an LLM to execute a mutating release command, create a release tag, or publish a release.
- The protocol contains no BitBrat- or project-specific release instructions.
- The human decides whether, when, and how to release; the LLM may assist only within an explicitly approved, non-mutating scope.
- The manifest represents blockers and distinguishes normal completion from force completion without treating PR state as a lifecycle status.
- Verification consistently refers to `execution-plan.md`, and top-level section numbers are sequential.
- `retro.md` and `key-learnings.md` have stable headings and atomic records suitable for future semantic extraction without requiring an extraction implementation now.
- When the human adds follow-up work after an LLM delivery turn, the LLM stops progression, asks only necessary questions, adds the task at the end of `backlog.yaml` unless another position is specified, applies any required approval gate, and resumes with the next ready backlog item.
- Every sprint-relevant Human–LLM turn captures intent, interpretation, decisions, and resulting state changes without requiring a transcript of routine read-only commands.
- State-changing operations, validation/publication evidence, and material command failures remain traceable; routine discovery may be summarized or omitted.
- Backlog items include identity, priority, status, ownership, dependencies, acceptance criteria, blocker state, timestamps, and concise transition history.
- The protocol defines when item status and timestamps MUST change, including start, block, unblock, completion, deferral, cancellation, and material scope change.
- An item reaches `done` only after its acceptance criteria are verified and evidence is referenced.
- Backlog transition history links to Human–LLM turn IDs without duplicating the interaction narrative.
- The revision does not conflict with `architecture.yaml`.

## Proposed Compression Work

- Baseline: 783 lines, 4,825 words, and 33,257 bytes.
- Target: no more than 500 lines and approximately 3,000–3,400 words, subject to preserving executable meaning.
- Preserve inline: precedence, human authority, approval gates, sprint start, follow-up loop, backlog transition duties, Git safety, optional-PR boundaries, human release authority, and force-completion requirements.
- Prefer progressive disclosure: keep normative requirements in `AGENTS.md`; place full templates and examples in stable files under `documentation/reference/` and require phase-specific loading.
- Execute the proposed backlog in declared order with one item in progress at a time.

## Testing Strategy

- Review the final diff for contradictory lifecycle, Git, release, and ownership language.
- Search for legacy language that describes releases as an LLM responsibility or calls the process solely LLM-led.
- Verify all referenced sprint artifacts use consistent filenames.
- Assert that the compact follow-up loop and default append-order rule are present.
- Assert that turn-centered logging replaces the requirement to log every meaningful shell and Git operation.
- Assert the backlog accountability schema, status vocabulary, transition rules, and backlog/request-log separation.
- Measure final line, word, byte, and approximate-token reduction against the recorded baseline.
- Verify that every externalized reference exists and that all normative cross-references resolve.
- Run semantic regression checks for authority, approvals, backlog state, Git safety, PR/release policy, completion, and extraction-ready learning records.
- Run the repository's existing test and build commands to detect unintended regressions.
- Provide an executable documentation-oriented `validate_deliverable.sh` that performs the applicable checks.

## Deployment Approach

This is a governance-document revision. No deployment is planned. Completion handoff consists of pushing the sprint branch. PR ownership and timing are declared per sprint and may be human-owned, LLM-owned with approval, automated, deferred, or omitted.

## Dependencies

- Human approval of this execution plan and backlog.
- A valid Git working tree at `/Users/christophernavta/IdeaProjects/sprint-mcp` before implementation begins, so the required sprint branch can be created.
- Working GitHub credentials at publication time.

## Definition of Done

The project-wide Definition of Done in `AGENTS.md` applies. For this documentation-focused sprint, completion additionally requires the acceptance criteria above, a logically passable documentation validation script, a verification report, publication evidence or an explicitly accepted publication exception, and the human's explicit `Sprint complete` or `Force complete sprint` instruction.
