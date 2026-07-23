# AGENTS.md — Human–LLM Sprint Protocol v3.0

## 🧱 0. Precedence & Scope

These rules define how humans and LLM agents work as an accountable partnership in this repository. The human supplies intent, judgment, approvals, exception acceptance, and release authority. The LLM turns that direction into traceable plans, implementation, validation evidence, and reviewable Git history. Neither role substitutes for the other.

### **Precedence Order**
1. `architecture.yaml` — canonical source of truth for system behavior
2. `AGENTS.md` — operational and behavioral rules for agents
3. Everything else — examples, legacy docs, and supporting materials

If a conflict ever occurs:
> **`architecture.yaml` wins.**
Agents must surface the conflict, then align to it.

---

## 🧠 Partnership, Authority, and Capabilities

### Human authority

Humans MUST:

- Set or approve sprint intent and scope
- Approve the execution plan before implementation
- Decide whether documented exceptions are acceptable
- Declare a sprint complete or force-complete
- Make every release decision and execute every real release

### LLM responsibilities

Agents **ARE allowed** to:

- Execute shell commands
- Interact with git (checkout, branch creation, committing, pushing)
- Create and push feature branches
- Create a Pull Request only when the human explicitly assigns that responsibility
- Run non-mutating release dry runs when they are part of approved validation

Agents MUST:

- Record every sprint-relevant Human–LLM turn in `request-log.md`
- Record shell and Git operations only when they change state, provide validation or publication evidence, or fail materially
- Operate only within the repository provided
- Halt and request updated credentials if any authentication step fails
- Report command results transparently
- Preserve human decision points rather than inferring approval

Agents MUST NOT:

- Execute a real or mutating release command
- Create or push release tags
- Publish a package, deployment, or release unless a separate repository rule explicitly delegates deployment; version release authority remains human-only

---

# 🧱 1. Immutable Laws

1. **Treat the sprint as a Human–LLM partnership.** Ask for human judgment when authority or intent is required; proceed autonomously within approved scope when it is not.
2. **Never violate `architecture.yaml`.** Suggest changes only with justification.
3. **All sprint planning and output artifacts live in `./planning`.**
4. **Never use or depend on `./deprecated` in deliverables. You may read it for historical context, but MUST NOT import, execute, copy forward, or make deliverables depend on it.**
5. **Artifacts in `./preview` are directional only, not implementation-ready.**
6. **Release is always a human task.** The LLM may prepare evidence, recommend a command, and perform an approved dry run, but it MUST NOT perform the real release.
7. **This document is executable intent.** Everything must be:
   - Traceable
   - Reproducible
   - Reversible

---

# 🌀 2. Human–LLM Sprint Protocol

This protocol governs every sprint carried out through a Human–LLM partnership.

```
Frame Together → LLM Plans → Human Approves → LLM Implements + Commits
    ↳ Human Follow-Up: Stop → Clarify → Append → Continue
    ↳ Human-Defined PR Path: Human | LLM | Automation, at the approved time
    → LLM Validates + Verifies → LLM Produces Retro + Learnings
    → LLM Pushes Completion Handoff → Human Reviews + Completes
    → Human-Defined Release (optional)
```

The human owns intent and consequential decisions. The LLM owns faithful execution and evidence within the approved scope. The shared artifacts make the partnership reproducible, reviewable, reversible, and capable of improving over time.

---

## 🧭 2.1 Sprint Control Rules

| Rule | Description |
|------|-------------|
| **S1** | A sprint begins only when the human explicitly says **“Start sprint”**. |
| **S2** | A sprint ends only after the LLM has prepared completion evidence and the human says **“Sprint complete.”** Alternatively, the human may say **“Force complete sprint.”** A release is separate and is not required to complete a sprint. |
| **S3** | Only one sprint may be active at a time. |
| **S4** | Human prompts related to this repo are included in sprint scope unless the human specifies otherwise. |
| **S5** | If sprint state is unclear, ask once, then proceed with best judgment inside existing authority. Never bypass a human approval gate or infer a release decision. |
| **S6** | Human approval is specific to the plan or exception presented. It is not blanket approval for later scope, release, or destructive actions. |

---

# 🚀 2.2 Sprint Start

When a sprint starts, the LLM MUST:

1. **Check for active sprints.** Verify no `sprint-manifest.yaml` in `planning/` has a status other than `complete`. If an active sprint is found, do not proceed with a new sprint; notify the human that the active sprint must be completed or force-closed first (Rule S3).
2. **Generate a sprint ID**
   ```
   sprint-<number>-<short-hash>
   ```
3. **Create the sprint directory**
   ```
   planning/sprint-<id>/
   ```
4. **Create a new feature branch**
   ```
   git checkout -b feature/<sprint-id>-<short-description>
   ```
5. **Create `sprint-manifest.yaml`** with required metadata (see schema below)
6. **Log the action in `request-log.md`**
7. **Verify the branch before planning continues.** Record `git branch --show-current` and `git status --short --branch` results. Implementation MUST NOT begin on the default branch or in a detached HEAD state.

Branch creation is an initialization requirement, not deferred publication work. If the working tree is dirty, preserve unrelated human changes, disclose the state, and stage only files within the approved sprint scope. If the branch cannot be created, keep the sprint in `planning`, log the blocker, and pause implementation.

Example:
```
git checkout -b feature/sprint-7-a13b2f-user-profile-service
```

---

# 🧩 2.3 Sprint Directory Structure

```
planning/
  sprint-7-a13b2f/
    sprint-manifest.yaml
    execution-plan.md
    backlog.yaml
    request-log.md
    validate_deliverable.sh
    verification-report.md
    publication.yaml
    retro.md
    key-learnings.md
```

This directory is the single authoritative source of truth for every sprint.

---

## Sprint Manifest Schema

Each sprint directory MUST contain a `sprint-manifest.yaml` with the following fields:

```yaml
id: sprint-<number>-<short-hash>
title: "Concise sprint title"
goal: "Clear sprint objective"
owner: "@github-handle or name"
createdAt: "YYYY-MM-DDTHH:mm:ssZ"
status: "planning | in-progress | validating | verifying | blocked | ready-for-handoff | complete | cancelled"
completionMode: null # null | normal | forced
blockers: []
links:
  branch: "feature/<sprint-id>-<short-description>"
  pr: null # optional; populated only when a PR exists
notes: |
  Key assumptions, constraints, and context.
```

---

# 📝 2.4 Planning Phase — *Coding Forbidden Until Approved*

Before ANY implementation begins, the LLM prepares the plan and the human exercises the approval gate:

- The LLM generates `execution-plan.md` and `backlog.yaml`
- The human reviews and explicitly approves them
- The LLM records the approval in `request-log.md`

### Required contents:

```markdown
# Execution Plan – sprint-X-Y

## Objective
- Clear human-approved sprint goal.

## Scope
- What is in scope
- What is out of scope

## Deliverables
- Code changes
- Tests
- Deployment & CI artifacts
- Documentation

## Acceptance Criteria
- Verifiable, observable behavioral outcomes

## Testing Strategy
- Unit test and integration test approach

## Deployment Approach
- Cloud Build, Cloud Run, or other targets
- Referencing architecture.yaml where applicable

## Completion Handoff and PR Policy
- Required branch-push behavior
- Whether a PR is desired
- Who owns PR creation and when it may occur
- LLM PR creation requires explicit human assignment

## Release Decision
- Whether release guidance is defined for this sprint
- Reference to human-defined release policy, which may live in architecture.yaml
- Release is optional and executed only by the human

## Dependencies
- External systems, credentials, services

## Definition of Done
- MUST reference project-wide DoD unless explicitly overridden
```

## 2.4.1 Amending an Active Sprint (Handling Rule S4)

If the human provides follow-up tasks or scope changes while a sprint is active:

1. **Identify Scope Change:** The LLM determines whether the request adds deliverables or alters the approved goal and explains the impact.
2. **Update Execution Plan:** Add the new tasks to `execution-plan.md`.
3. **Update Manifest:** If the goal has evolved significantly, update the `goal` or `title` in `sprint-manifest.yaml`.
4. **Log Request:** Document the prompt and its interpretation in `request-log.md`.
5. **Approval Gate:** If the change is substantial, the LLM MUST pause and request human approval for the amended plan before proceeding.
6. **Maintain Branch Integrity:** Perform all amended work on the existing feature branch (Rule S11).

---

# ⚙️ 2.5 Execution Phase

Every sprint-relevant Human–LLM turn MUST be recorded in `request-log.md`. Each turn record should capture:

- Timestamp
- Human intent or request summary
- LLM interpretation and response summary
- Decisions, questions, approvals, or exceptions
- Resulting backlog, scope, or sprint-state changes
- Links to relevant request IDs, backlog items, commits, files, or validation evidence

Commands are supporting evidence, not the primary record. Record shell and Git operations when they:

- Change repository or external state
- Produce validation, verification, publication, or release-assistance evidence
- Fail materially or affect a sprint decision

Group related commands into one concise entry when practical. Prefer outcomes and affected files over raw terminal output. Routine read-only discovery, navigation, and repeated diagnostic checks may be summarized or omitted. Never record secrets or credentials.

Optional:
`code-summary.md` mapping files → request IDs.

The LLM implements only approved scope. When judgment materially affects behavior, trade-offs, or scope, it records the choice and either ties it to existing approval or returns the decision to the human.

## 2.5.1 Intentional Commit Protocol

The feature branch is a shared, reviewable narrative for both humans and future LLMs. The LLM MUST commit regularly after coherent work units rather than accumulating the entire sprint into one opaque commit.

Before every commit, the LLM MUST:

1. Inspect `git status` and the staged diff.
2. Stage only approved sprint files; never absorb unrelated human changes.
3. Run the validation appropriate to that work unit, or state why validation is deferred.
4. Log the staged scope, validation result, and commit command in `request-log.md`.

A coherent work unit is an independently explainable change such as one behavior plus tests, one schema migration, or one documentation policy revision. Do not create commits solely because time elapsed, and do not knowingly commit broken intermediate states unless the commit is an explicitly approved diagnostic checkpoint.

Commit messages MUST be optimized for human review and future LLM retrieval: describe intent, not merely filenames or mechanics. Use this shape:

```text
sprint(<sprint-id>): <imperative intent>

Intent: <why this change exists and the behavior it establishes>
Requests: <REQ-IDs>
Validation: <checks run and concise result>
```

Additional context or trade-offs may follow. Keep each commit semantically focused. Avoid vague subjects such as `updates`, `fix stuff`, or `LLM changes`.

The LLM MUST NOT push intermediate sprint commits by default. It pushes the branch when the approved work is complete, validated, verified, and prepared for human review under §2.8. A human may explicitly request an earlier backup or collaboration push.

## 2.5.2 Human Follow-Up Loop

After any LLM delivery turn, including the first turn that delivers backlog items, the human may add follow-up work. Use this compact protocol:

```text
Stop → Clarify → Append → Continue
```

1. **Stop:** Pause progression toward the next backlog item or sprint completion. Do not start the follow-up or silently change priorities.
2. **Clarify:** Ask only questions required to make the follow-up actionable or resolve a material ambiguity. If no question is necessary, proceed directly to Append.
3. **Append:** Log the request and add an atomic backlog item with an ID, acceptance criteria, status, and dependencies when applicable. Place it at the end of `backlog.yaml` unless the human specifies another position, priority, or dependency. Preserve the order of multiple follow-ups as received. Do not reorder existing items without human direction.
4. **Continue:** Apply the active-sprint amendment and approval rules in §2.4.1. After required answers and approvals are recorded, select the next ready backlog item in declared order, state which item is resuming, and continue execution.

Appending a follow-up does not imply that it runs next. Existing ready items retain their order unless the human explicitly reprioritizes them. A follow-up that substantially changes scope remains behind the human approval gate even when its desired behavior is otherwise clear.

---

# 🧪 2.6 Validation Phase — *Mandatory Real Build + Test*

Every sprint MUST include a **real, executable** `validate_deliverable.sh` script.

This script MUST:

1. Install dependencies
2. Build the project
3. Run the test suite
4. Start local runtime (if applicable)
5. Perform health checks (manual or scripted)
6. Shut down local runtime
7. Run Cloud Build/Cloud Run dry-run deployment (if defined)

Use stack-appropriate commands for your service. The example below is for Node/TypeScript projects; for other stacks, use equivalent commands (e.g., Python: pip/poetry, pytest; Go: go build, go test).

### Required script shape (Node/TypeScript example):

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Installing dependencies..."
npm ci

echo "🧱 Building project..."
npm run build   # MUST succeed

echo "🧪 Running tests..."
npm test        # MUST pass

echo "🏃 Starting local environment..."
npm run local || true

echo "📝 Healthcheck..."
# Script/test/endpoint-based check recommended

echo "🧹 Stopping local environment..."
npm run local:down || true

echo "🚀 Cloud dry-run deployment..."
npm run deploy:cloud -- --dry-run || true

echo "✅ Validation complete."
```

### Critical rule:
> A sprint should not be considered ready to close unless `validate_deliverable.sh` is **logically passable** (all referenced commands exist and are intended to succeed) and aligned with the project-wide DoD. If the script cannot currently succeed because of environment issues, the LLM must log the failure and include it in `verification-report.md`; closure then requires explicit human acceptance.

---

# 🔍 2.7 Verification Phase

`verification-report.md` must summarize:

- Completed items
- Partial implementations
- Deferred items
- Deviations from the execution plan

Example:

```markdown
# Deliverable Verification – sprint-X-Y

## Completed
- [x] Twitch event handler implemented
- [x] Tests created
- [x] Cloud Build config added

## Partial
- [ ] Observability integration (stubbed)

## Deferred
- [ ] Multi-region deployment

## Alignment Notes
- Added health endpoint not originally specified
```

---

# 🔀 2.8 Completion Handoff — *Push Required, PR Optional*

The completion handoff transfers validated sprint work from the LLM to the human. It occurs after approved implementation, validation, verification, and the sprint learning artifacts are complete.

### The LLM MUST:

1. Confirm the branch contains only approved sprint changes.
2. Update the sprint artifacts with final evidence.
3. Create a final intent-focused commit if completion artifacts changed after the last coherent commit.
4. Push the feature branch. This is the default first push unless the human approved another cadence.
5. Give the human the branch, head commit, validation result, known exceptions, and a concise completion recommendation.

Pushing means the LLM considers the approved sprint work ready for human review. It does not mark the sprint `complete`; only the human can do that.

### Pull Request Policy

The Sprint Protocol does not require a Pull Request and a PR is never an implicit completion gate. The human defines whether a PR is desired, who creates it, and when. That policy may be declared in `architecture.yaml`, the approved `execution-plan.md`, or an explicit Human–LLM turn.

- PR ownership may be human, LLM, automation, or another human-designated actor.
- The LLM MUST NOT create or modify a PR unless the human explicitly assigns that responsibility.
- A human-defined sprint may include a PR in its acceptance criteria, but the protocol itself does not impose one.
- When a PR exists, record its owner, status, and URL without treating its creation as release authority.

If an authorized push or PR action fails, stop that action, record the material failure, and ask the human for the missing access or decision. Do not treat an optional PR failure as a protocol-level completion failure unless the human made that PR part of the approved sprint criteria.

### Completion Handoff Rules

| Rule | Description |
|------|-------------|
| **S11** | A new feature branch MUST be created and verified at sprint initialization and used for all sprint changes. |
| **S12** | When sprint work is complete, the LLM MUST push the feature branch and record the result unless the human explicitly accepts a push exception. |
| **S13** | A sprint cannot close until either (a) the completion branch was pushed, or (b) the failed or omitted push was recorded and explicitly accepted by the human. |
| **S14** | PR and release decisions are human-defined and independent from the protocol's branch-push handoff. |

`publication.yaml` should contain:

```yaml
branch: feature/sprint-X-Y-...
headCommit: <commit-sha>
pushStatus: "pending | succeeded | failed | waived"
pr:
  desired: false
  owner: null # human | llm | automation | other
  timing: null
  status: "not-planned | planned | created | failed | waived"
  url: null
```

### Human-Defined Release (optional and separate from sprint completion)

The human decides whether a release should occur and, if so, defines its timing, criteria, approvals, versioning approach, and execution mechanism. Release policy may live in `architecture.yaml`, another human-approved project document, or the sprint's `execution-plan.md`.

- A release is optional and never required to complete a sprint unless the human explicitly adds it to approved sprint criteria.
- The human executes the release if the human decides to proceed.
- The LLM may prepare evidence, release notes, risk analysis, or non-mutating checks when explicitly approved.
- The LLM MUST NOT execute a mutating release command, create or push release tags, publish packages, or claim that a release occurred without human-provided evidence.
- The protocol does not prescribe a release tool, command, versioning scheme, or deployment workflow.

---

# 🏁 2.9 Sprint Completion

Before asking the human to complete the sprint, the LLM MUST present a completion packet containing:

- Validation and verification results
- Completed, partial, deferred, and deviated scope
- The pushed branch and head commit, or the exact handoff failure
- PR status only when the human-defined PR policy makes it relevant
- `retro.md` and `key-learnings.md`
- A recommendation to complete or force-complete, with exceptions called out explicitly

A sprint officially completes only when:

- `validate_deliverable.sh` is logically passable, or current failures are documented and explicitly accepted by the human
- The branch was pushed and recorded in `publication.yaml`, or the failed or omitted push was logged and explicitly accepted by the human
- `verification-report.md`, `retro.md`, and `key-learnings.md` exist
- The human says `Sprint complete` or `Force complete sprint`

After the human's declaration, the LLM records it, changes the manifest status to `complete`, and reports the final state. It does not perform a release.

- Use `completionMode: normal` when the human says `Sprint complete`.
- Use `completionMode: forced` when the human says `Force complete sprint`.
- Use `status: blocked` with explicit blockers when progress cannot continue.
- Use `status: cancelled` only when the human explicitly cancels the sprint.

## 2.9.1 Learning Artifacts for Future Extraction

The retrospective artifacts are both human-readable records and future inputs to semantic compaction or structured extraction. Write them for reuse outside the immediate conversation.

### Shared rules

- Use stable headings and IDs; never rely on document position as identity.
- Keep observations and learnings atomic: one claim, decision, or lesson per record.
- Link claims to concrete request IDs, commits, validation output, or file paths when available.
- Separate observed facts from interpretation and recommendation.
- Use explicit nouns rather than context-dependent pronouns such as "this" or "it".
- Preserve disagreements or uncertainty instead of manufacturing consensus.
- Use lowercase kebab-case tags and the confidence values `low`, `medium`, or `high`.
- Exclude secrets, credentials, personal data, and unnecessary transcript detail.
- Prefer concise repetition of essential context over references that require reconstructing the conversation.

### Required `retro.md` structure

```markdown
# Retrospective – <sprint-id>

## Outcome Summary
<goal, delivered outcome, completion state, and accepted exceptions>

## Observations
### OBS-001 – <short factual title>
- Type: worked | friction | surprise | failure
- Evidence: <REQ-ID, commit, validation result, or path>
- Observation: <fact>
- Interpretation: <meaning, explicitly labeled as interpretation>
- Impact: <effect on delivery or quality>

## Partnership Review
### PART-001 – <decision or interaction title>
- Human contribution: <intent, judgment, approval, or correction>
- LLM contribution: <plan, execution, evidence, or recommendation>
- Handoff quality: effective | mixed | ineffective
- Improvement: <specific change for a future sprint>

## Follow-up Candidates
### FOLLOW-001 – <action title>
- Rationale: <why it matters>
- Suggested owner: human | LLM | partnership
- Priority: low | medium | high
- Related evidence: <stable references>
```

### Required `key-learnings.md` structure

```markdown
# Key Learnings – <sprint-id>

## Learning Records
### LEARN-001 – <short reusable title>
- Statement: <one context-independent lesson>
- Kind: process | technical | architecture | collaboration | tooling
- Derived from: <OBS/PART/FOLLOW IDs and supporting evidence>
- Applies when: <boundary conditions>
- Does not apply when: <counter-boundaries or unknown>
- Recommended action: <specific future behavior>
- Confidence: low | medium | high
- Tags: [tag-one, tag-two]
- Supersedes: <learning IDs or none>
```

Do not copy the entire retrospective into `key-learnings.md`. Promote only lessons likely to change a future decision or action. If no durable lesson exists, say so explicitly rather than inventing one.

---

### 2.10 Force Completion Override

If the human says `Force complete sprint`, the LLM may close the sprint even if:

- `validate_deliverable.sh` would currently fail, or
- Tests are incomplete or failing, or
- The completion branch could not be pushed

…as long as:

1. All known failures and gaps are documented under **Partial** or **Deferred** in `verification-report.md`.
2. The issues are recorded as atomic observations in `retro.md` and, when reusable, as learning records in `key-learnings.md`.
3. Any failed or omitted push is recorded in `publication.yaml` and `request-log.md`.

Force completion never authorizes a release.

---

# 🧮 3. Project-Wide Definition of Done (DoD)

A deliverable is “Done” only if:

### ✅ Code Quality
- Adheres to project and architecture.yaml constraints
- No TODOs or placeholder logic in production paths
- Stubs are allowed only in non-production paths or behind feature flags

### ✅ Testing
- Tests for all new behavior (use Jest for Node/TypeScript services; use stack-appropriate frameworks for other stacks)
- Mocks for external dependencies
- `npm test` must pass
- Test deferral requires explicit human approval

### ✅ Deployment Artifacts
If applicable:
- Dockerfile
- Cloud Build YAML
- Cloud Run configs
- IaC
  These must integrate with `validate_deliverable.sh`

### ✅ Documentation
- Rationale, trade-offs, and notes
- LLM hints (`llm_prompt`) where beneficial

### ✅ Traceability
All code changes trace back to:
- A sprint
- A request ID in `request-log.md`
- One or more intent-focused commits

The human may explicitly accept missing or failing tests for this sprint; in that case, the gaps MUST be listed under **Deferred** in `verification-report.md` and recorded as evidence-backed observations in `retro.md`.

---

# 🧪 4. Testing Standards

- Tests required
- For Node/TypeScript services, use Jest; for other stacks, use language-appropriate frameworks (e.g., pytest, go test)
- Tests live beside code or in `__tests__/`
- High coverage encouraged
- External services mocked
- Tests must run as part of validation

---

# 📦 5. Deliverable Types

Every sprint must produce at least one:

- Code artifact
- Tests
- Deployment scripts
- Architecture documentation

And all outputs must:

- Build
- Test
- Integrate with the validation pipeline

Note: Planning/Discovery sprints may produce documentation-only deliverables; validation should then lint, link-check, and verify structure instead of building code.

---

# 🧱 6. Project Structure

```
deprecated/      # Historical reference only
examples/        # Useful templates
planning/        # Sprint artifacts (authoritative)
preview/         # Visionary, non-binding artifacts
infrastructure/  # IaC, Cloud Build, Terraform files
src/
  apps/          # Service entrypoints
  common/        # Shared utilities
  config/        # Configuration
  services/      # Core microservices
  types/         # Shared types
```

---

# 🎯 7. Code Style Rules

- Application/services code is in TypeScript by default. If a service explicitly specifies a different stack, follow that stack. Scripts and infrastructure files remain in their native formats.
- kebab-case filenames
- PascalCase classes and interfaces
- camelCase functions and variables
- UPPER_SNAKE_CASE constants

Logging:

- Always log through a logging facade if possible
- `info` for useful info
- `error` for errors
- `debug` for deep insight
- Log all network + filesystem operations with context

---

# 🧯 8. Error Handling & Events

- Strong try/catch discipline
- Graceful shutdown of services
- Validate environment variables
- Use Pub/Sub for service communication
- Normalize external events to internal schema

---

# 👥 9. Collaboration Roles

These are responsibility domains, not rigid job titles. A human or LLM may contribute in several domains, subject to the authority boundaries in §Capabilities.

- **Human Sponsor**
  - Frames desired outcomes and constraints.
  - Approves plans, scope changes, exceptions, completion, and releases.
  - Contributes contextual judgment the repository cannot supply.
- **LLM Implementor**
  - Produces execution plans and backlogs.
  - Implements approved work and maintains traceability.
  - Creates coherent commits, validation evidence, and the completion handoff.
- **Architecture Partner**
  - Analyzes cloud and platform design without silently overriding `architecture.yaml`.
  - Surfaces trade-offs and returns consequential architecture decisions to the human.
- **Quality Partner**
  - Defines and evaluates acceptance criteria.
  - Distinguishes verified facts, accepted exceptions, and unresolved risk.
- **Learning Partner**
  - Converts sprint evidence into atomic retrospective observations and reusable learnings.
  - Preserves uncertainty, applicability boundaries, and provenance for future extraction.

---

# 🧠 10. Sprint Lifecycle Summary

```
Frame Together → LLM Plan → Human Approve → LLM Implement + Commit
    ↳ Human-Defined PR Path: Human | LLM | Automation, at the approved time
    → Validate + Verify → Retro + Learn → Push Handoff
    → Human Complete → Human-Defined Release (optional)
```

The system is designed for:

- High traceability
- Rigor
- Iterative improvement
- Explicit human authority
- Effective Human–LLM handoffs
- Extraction-ready organizational learning

---

# End of AGENTS.md
