# AGENTS.md — Human–LLM Sprint Protocol v3.0

## 0. Precedence & Scope

Human–LLM partnership rules for this repository. Human: intent, judgment, approvals, exceptions, releases. LLM: plans, implementation, validation, Git history.

**Precedence Order:**
1. `architecture.yaml` — canonical source of truth
2. `AGENTS.md` — operational rules
3. Everything else

**Conflict resolution:** `architecture.yaml` wins. Surface conflict, then align.

---

## Partnership Authority

**Human MUST:**
- Set/approve sprint intent and scope
- Approve execution plan before implementation
- Decide exception acceptance
- Declare sprint complete or force-complete
- Make and execute all release decisions

**LLM allowed:**
- Execute shell commands
- Git operations (checkout, branch, commit, push)
- Create/push feature branches
- Create PR only when human explicitly assigns
- Run non-mutating release dry runs when approved

**LLM MUST:**
- Record sprint-relevant turns in `request-log.md`
- Record shell/Git operations when they change state or provide evidence
- Operate within provided repository
- Halt and request credentials if auth fails
- Report results transparently
- Preserve human decision points

**LLM MUST NOT:**
- Execute real/mutating release commands
- Create/push release tags
- Publish packages/deployments/releases

---

# 1. Immutable Laws

1. **Partnership:** Ask for human judgment when authority/intent required; proceed autonomously within approved scope
2. **Never violate `architecture.yaml`:** Suggest changes with justification only
3. **All sprint artifacts live in `./planning`**
4. **Never use `./deprecated` in deliverables:** Read for context only, never import/execute/copy/depend
5. **`./preview` is directional only, not implementation-ready**
6. **Release is human task:** LLM prepares evidence/recommendations, MUST NOT execute real release
7. **Executable intent:** Everything traceable, reproducible, reversible

---

# 2. Human–LLM Sprint Protocol

```
Frame → Plan → Approve → Implement + Commit
  ↳ Follow-Up: Stop → Clarify → Append → Continue
  ↳ PR: Human | LLM | Automation (when approved)
  → Validate + Verify → Retro + Learn → Push Handoff
  → Human Complete → Human Release (optional)
```

---

## 2.1 Sprint Control Rules

| Rule | Description |
|------|-------------|
| **S1** | Sprint begins only when human says **"Start sprint"** |
| **S2** | Sprint ends only after LLM prepares completion evidence and human says **"Sprint complete"** or **"Force complete sprint"**. Release is separate, not required |
| **S3** | Only one sprint active at a time |
| **S4** | Human prompts related to repo included in sprint scope unless specified otherwise |
| **S5** | If state unclear, ask once, then proceed with best judgment inside existing authority. Never bypass approval gate or infer release |
| **S6** | Human approval specific to plan/exception presented, not blanket approval |

---

# 2.2 Sprint Start

**INV-001:** Human approval required before implementation
**INV-002:** Only one sprint active at a time
**INV-003:** Sprint begins only when human says 'Start sprint'
**INV-007:** Main branch must exist with ≥1 commit before sprint starts
**INV-008:** No active sprints before starting new sprint
**INV-009:** Git worktree created at initialization, verified before planning continues
**INV-028:** New feature branch created and verified at initialization, used for all changes

**LLM MUST:**

1. **Verify main branch baseline:** Ensure `main` exists with ≥1 commit. If fails, notify human
2. **Check active sprints:** Verify no `sprint-manifest.yaml` in `planning/` with status ≠ `complete`. If found, notify human (S3)
3. **Generate sprint ID:** `sprint-<number>-<short-hash>`
4. **Create sprint directory:** `planning/sprint-<id>/`
5. **Create git worktree:**
   ```bash
   git worktree add .worktrees/sprint-<id> -b feature/<sprint-id>-<short-description>
   ```
   Benefits: isolation, parallel work, clean separation, easy cleanup
6. **Change to worktree:** `cd .worktrees/sprint-<id>/`
7. **Create `sprint-manifest.yaml`** in `planning/sprint-<id>/` within worktree (see schema below)
8. **Log action** in `request-log.md`
9. **Verify worktree/branch:** Record `git branch --show-current`, `git status --short --branch`, `pwd`. MUST NOT be on default branch or detached HEAD. Working directory should be `.worktrees/sprint-<id>/`

**INV-010:** Implementation MUST NOT begin on default branch or detached HEAD

Worktree creation is initialization requirement. If fails, keep sprint in `planning`, log blocker, pause implementation.

---

## 2.2.1 Agent Working Directory Discipline

After `cd .worktrees/sprint-<id>/`, MUST remain in that context for ALL sprint work. Unified model: all changes (code + planning) committed together on feature branch.

**✅ Correct:**
```bash
cd .worktrees/sprint-15-dq6cg7/
edit src/tools/example.ts
edit planning/sprint-15-dq6cg7/request-log.md
npm test
git add .
git commit -m "Implement feature X"
git push origin feature/sprint-15-dq6cg7-...
```

**❌ Incorrect:**
```bash
cd /Users/.../sprint-mcp/  # ❌ Don't return to main repo
edit planning/...          # ❌ Don't edit outside worktree
```

**Principles:**
1. One working directory: `.worktrees/sprint-<id>/`
2. Relative paths: `src/...`, `planning/sprint-<id>/...`
3. No context switching
4. Complete commits: code + planning
5. Complete PRs: merge both to main

**After PR merge:**
- Planning in main: `planning/sprint-<id>/`
- Can archive: `planning/archive/2026/sprint-<id>/`
- Cleanup worktree: `git worktree remove .worktrees/sprint-<id>/`

**Legacy (Sprints 1-15):** Used split model (planning in main, code in worktree). Sprint 16+ use unified model.

---

## 2.2.2 Sprint Lifecycle Hooks

Optional bash scripts in `.sprint-hooks/` (main repo root) for project-specific automation.

**Architecture:** Option A (Separate Lifecycle + Status)

**Lifecycle Hooks (4):**
- `post-worktree-create` - After worktree + planning created
- `pre-worktree-remove` - Before worktree removal
- `pre-archive` - Before archival
- `post-archive` - After archival

**Status Hook (1):**
- `on-status-change` - Before/after ANY status transition

**Blocking Behavior:**

| Hook | Phase | Blocking |
|------|-------|----------|
| `post-worktree-create` | POST | NO (logged, continues) |
| `on-status-change` (PRE) | PRE | YES (fails prevent update) |
| `on-status-change` (POST) | POST | NO (logged, continues) |
| `pre-worktree-remove` | PRE | YES (fails prevent removal) |
| `pre-archive` | PRE | YES (fails prevent archival) |
| `post-archive` | POST | NO (logged, continues) |

**Environment Variables (all hooks):**
- `SPRINT_ID`, `SPRINT_WORKTREE`, `SPRINT_PLANNING_DIR`, `SPRINT_BRANCH`, `SPRINT_EVENT`

**Additional (`on-status-change`):**
- `SPRINT_STATUS_FROM`, `SPRINT_STATUS_TO`, `SPRINT_LIFECYCLE_PHASE` (pre/post)

**Example `on-status-change`:**
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  if [ "$SPRINT_STATUS_TO" = "in-progress" ]; then
    git diff-index --quiet HEAD -- || { echo "ERROR: Uncommitted changes"; exit 1; }
  fi
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    npm test || { echo "ERROR: Tests failed"; exit 1; }
  fi
fi

if [ "$SPRINT_LIFECYCLE_PHASE" = "post" ]; then
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    curl -X POST "$SLACK_WEBHOOK" -d "{\"text\": \"Sprint $SPRINT_ID completed!\"}"
  fi
fi
```

**Discovery:** `.sprint-hooks/` in project root, executable permission required, 5min timeout

**Examples:** `examples/sprint-hooks/node-typescript/`, `examples/sprint-hooks/python-django/`

---

# 2.3 Sprint Directory Structure

**INV-038:** All sprint planning/output artifacts live in `./planning`

Worktree structure:
```
.worktrees/sprint-7-a13b2f/
  planning/sprint-7-a13b2f/
    sprint-manifest.yaml
    execution-plan.md
    backlog.yaml
    request-log.md
    validate_deliverable.sh
    verification-report.md
    retro.md
    key-learnings.md
  src/
```

**Note**: `publication.yaml` deprecated in v2.5. Publication metadata now in `sprint-manifest.yaml` (`links.pr` and optional `publication` field).

After PR merge to main:
```
planning/
  sprint-7-a13b2f/
    [all artifacts]
```

**INV-036:** `architecture.yaml` is canonical, wins all conflicts

---

## Sprint Manifest Schema

**INV-004:** Sprint ends only after LLM prepares completion evidence and human declares complete/force-complete

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
  pr: null
notes: |
  Key assumptions, constraints, context.
```

---

## 2.3.1 Backlog Accountability Contract

**INV-012:** `backlog.yaml` is authoritative contract for sprint commitments and current work state
**INV-013:** Status transitions MUST update `item.updated_at`, `meta.updated_at`, append history, link `turn_id`
**INV-014:** Items move to in-progress only if approved/not-required, dependencies done, WIP limit permits
**INV-015:** Items move to done only after every acceptance criterion verified with stable evidence

**Required shape:**
```yaml
meta:
  backlog_id: <sprint-id>-backlog
  updated_at: <ISO-8601>
  status_values: [todo, in-progress, blocked, done, deferred, cancelled]
  approval_values: [not-required, pending, approved]

sprint:
  id: <sprint-id>
  goal: <approved goal>
  status: <current manifest status>
  wip_limit: 1 # optional

items:
  - id: BL-001
    title: <atomic outcome>
    priority: P1 # P0 | P1 | P2 | P3
    status: todo
    approval: approved
    owner: partnership # human | llm | partnership | external
    dependencies: []
    blocked_reason: null
    acceptance:
      - <observable criterion>
    evidence: []
    updated_at: <ISO-8601>
    history:
      - at: <ISO-8601>
        from: null
        to: todo
        reason: <why>
        turn_id: <request-log turn>
```

**Status transitions:**
- **Create:** Add as `todo` at end (unless human specifies position), with acceptance criteria
- **Start:** `todo` → `in-progress` (requires approval, dependencies done, WIP permits)
- **Block:** → `blocked` + populate `blocked_reason`
- **Unblock:** `blocked` → `todo`/`in-progress`, clear `blocked_reason`
- **Complete:** `in-progress` → `done` (requires all acceptance verified + evidence)
- **Defer/Cancel:** Use only with explicit human direction, record reason + turn
- **Revise:** Update timestamp + history when title/scope/priority/owner/dependencies/acceptance change

Every transition/revision MUST update timestamps, append history, link `turn_id`.

---

## 2.3.2 Sprint Index

`planning/sprint-index.yaml` is derived, regenerable cache from sprint manifests.

**Principles:**
- Manifests are single source of truth
- Index is computed, never manually edited
- Regenerable without data loss
- Atomic updates: manifest first, then index
- Non-fatal failures: logged, can regenerate

**Automatic updates:**
- `start-sprint` adds entry
- `update-sprint-status` updates both
- `regenerate-sprint-index` rebuilds from all manifests

**Manual regeneration:**
```bash
regenerate-sprint-index  # MCP tool
npm run sprint:index:regenerate  # npm script
```

**Schema:**
```yaml
version: "1.0"
generatedAt: "2026-07-31T12:00:00Z"
totalSprints: 5
activeSprints: 1
completedSprints: 4

sprints:
  - id: sprint-1-abc123
    title: "Sprint title"
    status: complete | in-progress | ...
    owner: "Owner"
    createdAt: "2026-07-30T12:00:00Z"
    startedAt: "2026-07-30T14:00:00Z"
    completedAt: "2026-07-30T20:00:00Z"
    completionMode: normal | forced
    manifestPath: "planning/sprint-1-abc123/sprint-manifest.yaml"
    branch: "feature/sprint-1-abc123-title"
    pr: "https://github.com/owner/repo/pull/123"
    worktreePath: ".worktrees/sprint-1-abc123"

statistics:
  byStatus: {...}
  byCompletionMode: {...}
  averageSprintDuration: "PT6H45M"
```

**Recovery:** Regenerate if corrupted/out-of-sync/missing sprints

---

# 2.4 Planning Phase — Coding Forbidden Until Approved

**INV-039:** Human approval specific to plan/exception presented, not blanket

Before ANY implementation:
- LLM generates `execution-plan.md` and `backlog.yaml`
- LLM ensures deliverables map to backlog items with acceptance criteria
- Human reviews and explicitly approves
- LLM records approval in `request-log.md`

**Required `execution-plan.md` contents:**
- Objective (human-approved goal)
- Scope (in/out)
- Deliverables (code, tests, deployment, docs)
- Acceptance Criteria (verifiable, observable)
- Testing Strategy
- Deployment Approach (reference `architecture.yaml`)
- Completion Handoff and PR Policy (branch-push, PR owner/timing, LLM requires explicit assignment)
- Release Decision (optional, human-defined, reference policy)
- Dependencies
- Definition of Done (reference project-wide DoD unless overridden)

---

## 2.4.1 Amending Active Sprint (S4)

When human provides follow-up/scope changes during active sprint:

1. **Identify scope change:** Explain impact
2. **Update execution plan:** Add tasks to `execution-plan.md`
3. **Update backlog:** Add/revise items, acceptance, approval, history
4. **Update manifest:** If goal evolved, update `goal`/`title`
5. **Log request:** Document turn in `request-log.md`
6. **Approval gate:** If substantial, MUST pause and request human approval before proceeding
7. **Maintain branch integrity:** All work on existing feature branch (S11)

---

# 2.5 Execution Phase

**INV-011:** Every sprint-relevant Human–LLM turn MUST be recorded in `request-log.md`

Each turn record:
- Timestamp
- Human intent/request summary
- LLM interpretation/response summary
- Decisions, questions, approvals, exceptions
- Backlog/scope/state changes
- Links to request IDs, backlog items, commits, files, validation evidence

Record shell/Git operations when they:
- Change state
- Produce validation/verification/publication evidence
- Fail materially or affect decisions

Group related commands. Prefer outcomes over raw output. Omit routine read-only checks. Never record secrets.

LLM implements only approved scope. Update backlog state before starting/blocking/completing items (§2.3.1).

---

## 2.5.1 Intentional Commit Protocol

**INV-018:** LLM MUST stage only approved sprint files, never absorb unrelated human changes

Feature branch is shared reviewable narrative. LLM MUST commit regularly after coherent work units.

**Before every commit:**
1. Inspect `git status` and staged diff
2. Stage only approved sprint files
3. Run validation or state why deferred
4. Log staged scope, validation, commit in `request-log.md`

**Coherent work unit:** Independently explainable change (behavior + tests, schema migration, doc policy).

**Commit message shape:**
```
sprint(<sprint-id>): <imperative intent>

Intent: <why this change, behavior established>
Requests: <REQ-IDs>
Validation: <checks run, result>
```

LLM MUST NOT push intermediate commits by default. Push when work complete, validated, verified, prepared for human review (§2.8). Human may request earlier push.

---

## 2.5.2 Human Follow-Up Loop

After any LLM delivery, human may add follow-up work:

```
Stop → Clarify → Append → Continue
```

1. **Stop:** Pause progression
2. **Clarify:** Ask required questions or skip if clear
3. **Append:** Log in `request-log.md`, add atomic backlog item at end unless human specifies position. Preserve order of multiple follow-ups
4. **Continue:** Apply amendment rules (§2.4.1), get approvals, select next ready item in order, resume

Appending follow-up doesn't mean it runs next. Existing ready items retain order unless human reprioritizes. Substantial scope changes require approval.

---

# 2.6 Validation Phase — Mandatory Real Build + Test

**INV-022:** Every sprint MUST include real, executable `validate_deliverable.sh`
**INV-023:** Validation script MUST install dependencies, build, run tests, perform health checks
**INV-024:** Sprint not ready to close unless `validate_deliverable.sh` logically passable or failures explicitly accepted

**Script MUST:**
1. Install dependencies
2. Build project
3. Run test suite
4. Start local runtime (if applicable)
5. Perform health checks
6. Shut down runtime
7. Run deployment dry-run (if defined)

**Example (Node/TypeScript):**
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
# Script/test/endpoint check

echo "🧹 Stopping local environment..."
npm run local:down || true

echo "🚀 Cloud dry-run deployment..."
npm run deploy:cloud -- --dry-run || true

echo "✅ Validation complete."
```

For other stacks, use equivalent commands (Python: pip/poetry, pytest; Go: go build, go test).

Sprint not ready to close unless script logically passable and aligned with DoD. If fails due to environment, log failure in `verification-report.md`; closure requires human acceptance.

---

# 2.7 Verification Phase

**INV-025:** Every done item MUST have acceptance evidence, every blocked item MUST have current blocker, every deferred/cancelled item MUST link to human direction

`verification-report.md` MUST summarize:
- Completed items
- Partial implementations
- Deferred items
- Deviations from execution plan
- Reconciliation against every `backlog.yaml` item

Before verification completes, confirm:
- Every `done` item has acceptance evidence
- Every `blocked` item has current blocker
- Every `deferred`/`cancelled` item links to human direction

Differences between backlog and implementation are verification failures until corrected or accepted.

---

# 2.8 Completion Handoff — Push Required, PR Optional

**INV-005:** LLM MUST NOT execute real release commands or create/push release tags
**INV-006:** LLM MUST NOT create/modify PR unless human explicitly assigns
**INV-026:** LLM MUST push feature branch when work complete unless human accepts push exception
**INV-027:** Sprint cannot close until branch pushed or failed/omitted push recorded and accepted
**INV-029:** Release is optional, never required unless human adds to approved criteria

Completion handoff transfers validated work from LLM to human after implementation, validation, verification, learning artifacts complete.

**LLM MUST:**
1. Confirm branch contains only approved sprint changes
2. Update sprint artifacts with final evidence
3. Create final commit if completion artifacts changed
4. Push feature branch (default first push unless human approved other cadence)
5. Give human: branch, head commit, validation result, exceptions, recommendation

Pushing means LLM considers work ready for review. Does not mark sprint `complete`; only human can.

**Pull Request Policy:**
- Sprint Protocol does not require PR
- PR never implicit completion gate
- Human defines: whether desired, who creates, when
- Policy may be in `architecture.yaml`, `execution-plan.md`, or explicit turn
- LLM MUST NOT create/modify PR unless human explicitly assigns
- Human-defined sprint may include PR in acceptance criteria, but protocol doesn't impose
- Record PR owner, status, URL without treating creation as release authority

If authorized push/PR fails, stop, record failure, ask human. Don't treat optional PR failure as protocol completion failure unless human made PR part of approved criteria.

**Completion Handoff Rules:**

| Rule | Description |
|------|-------------|
| **S11** | New feature branch MUST be created and verified at initialization, used for all changes |
| **S12** | When work complete, LLM MUST push feature branch and record in `sprint-manifest.yaml` unless human accepts exception |
| **S13** | Sprint cannot close until (a) branch pushed and recorded in `sprint-manifest.yaml`, or (b) failed/omitted push logged and accepted |
| **S14** | PR and release decisions human-defined, independent from protocol's branch-push handoff |

**Publication Metadata (v2.5+)**: Tracked in `sprint-manifest.yaml`:
```yaml
# sprint-manifest.yaml
links:
  branch: feature/sprint-X-Y-...
  pr: https://github.com/owner/repo/pull/123  # Optional

publication:  # Optional metadata
  method: github-cli | github-api | manual
  prCreatedAt: "2026-08-11T12:00:00Z"
  branchPushedAt: "2026-08-11T11:55:00Z"
  notes: "Additional notes"
```

**Note**: `publication.yaml` deprecated in v2.5. Manifest is single source of truth.

**Human-Defined Release (optional, separate from completion):**
- Human decides whether release occurs
- Human defines timing, criteria, approvals, versioning, execution
- Release policy may live in `architecture.yaml`, project doc, or `execution-plan.md`
- Release optional, never required unless human adds to approved criteria
- Human executes release
- LLM may prepare evidence, notes, risk analysis, non-mutating checks when approved
- LLM MUST NOT execute mutating release, create/push release tags, publish packages, claim release occurred without human evidence
- Protocol doesn't prescribe release tool/command/versioning/workflow

---

# 2.9 Sprint Completion

**INV-030:** Sprint officially completes only when validation passable/accepted, branch pushed/accepted, verification/retro/learnings exist, human declares complete

Before asking human to complete, LLM MUST present completion packet:
- Validation and verification results
- Completed, partial, deferred, deviated scope
- Pushed branch + head commit, or exact handoff failure
- PR status (only when human-defined policy makes it relevant)
- `retro.md` and `key-learnings.md`
- Recommendation to complete/force-complete, with exceptions explicit

**Sprint officially completes when:**
- `validate_deliverable.sh` logically passable, or failures documented and accepted
- Branch pushed and recorded in `sprint-manifest.yaml`, or failed/omitted push logged and accepted
- `verification-report.md`, `retro.md`, `key-learnings.md` exist
- Human says `Sprint complete` or `Force complete sprint`

After declaration, LLM records it, changes manifest status to `complete`, reports final state. Does not perform release.

- `completionMode: normal` when human says `Sprint complete`
- `completionMode: forced` when human says `Force complete sprint`
- `status: blocked` with explicit blockers when progress cannot continue
- `status: cancelled` only when human explicitly cancels

**Worktree Cleanup:**

After completion (normal/forced) and after PR merged (if applicable), remove worktree:

```bash
cd /path/to/repo  # Return to main worktree
git worktree remove .worktrees/sprint-<id>
```

**Timing:**
- After PR merge (if sprint resulted in merged PR)
- After force completion (if no PR)
- After cancellation

**Error handling:**
```bash
git worktree list  # Check status
git worktree remove .worktrees/sprint-<id> --force  # If uncommitted changes
```

Use `--force` only after confirming with human. Document cleanup in `request-log.md` before removal.

Sprint directory `planning/sprint-<id>/` remains as permanent record. Only `.worktrees/sprint-<id>/` removed.

---

## 2.9.1 Learning Artifacts for Future Extraction

Retrospective artifacts are human-readable records and future inputs to extraction. Write for reuse outside conversation.

**Shared rules:**
- Stable headings and IDs
- Atomic observations/learnings (one claim per record)
- Link to concrete request IDs, commits, validation, paths
- Separate facts from interpretation
- Explicit nouns, not context-dependent pronouns
- Preserve disagreements/uncertainty
- Lowercase kebab-case tags, confidence: `low | medium | high`
- Exclude secrets, credentials, personal data, unnecessary transcript
- Prefer concise repetition over references requiring conversation reconstruction

**Required `retro.md` structure:**
```markdown
# Retrospective – <sprint-id>

## Outcome Summary
<goal, delivered outcome, completion state, accepted exceptions>

## Observations
### OBS-001 – <short factual title>
- Type: worked | friction | surprise | failure
- Evidence: <REQ-ID, commit, validation, path>
- Observation: <fact>
- Interpretation: <meaning, labeled as interpretation>
- Impact: <effect on delivery/quality>

## Partnership Review
### PART-001 – <decision/interaction title>
- Human contribution: <intent, judgment, approval, correction>
- LLM contribution: <plan, execution, evidence, recommendation>
- Handoff quality: effective | mixed | ineffective
- Improvement: <specific change for future sprint>

## Follow-up Candidates
### FOLLOW-001 – <action title>
- Rationale: <why it matters>
- Suggested owner: human | LLM | partnership
- Priority: low | medium | high
- Related evidence: <stable references>
```

**Required `key-learnings.md` structure:**
```markdown
# Key Learnings – <sprint-id>

## Learning Records
### LEARN-001 – <short reusable title>
- Statement: <one context-independent lesson>
- Kind: process | technical | architecture | collaboration | tooling
- Derived from: <OBS/PART/FOLLOW IDs + evidence>
- Applies when: <boundary conditions>
- Does not apply when: <counter-boundaries or unknown>
- Recommended action: <specific future behavior>
- Confidence: low | medium | high
- Tags: [tag-one, tag-two]
- Supersedes: <learning IDs or none>
```

Don't copy entire retro into `key-learnings.md`. Promote only lessons likely to change future decisions. If no durable lesson, say so explicitly.

---

### 2.10 Force Completion Override

**INV-035:** Force completion never authorizes release

If human says `Force complete sprint`, LLM may close even if:
- `validate_deliverable.sh` would fail
- Tests incomplete/failing
- Completion branch couldn't be pushed

…as long as:
1. All failures/gaps documented under **Partial**/**Deferred** in `verification-report.md`
2. Issues recorded as atomic observations in `retro.md` and (when reusable) as learning records in `key-learnings.md`
3. Failed/omitted push recorded in `sprint-manifest.yaml` (links/publication fields) and `request-log.md`

Force completion never authorizes release.

---

# 3. Project-Wide Definition of Done (DoD)

Deliverable "Done" only if:

**✅ Code Quality:**
- Adheres to project and `architecture.yaml` constraints
- No TODOs/placeholders in production paths
- Stubs allowed only in non-production or behind feature flags

**✅ Testing:**
- Tests for all new behavior (Jest for Node/TypeScript; stack-appropriate for others)
- Mocks for external dependencies
- `npm test` must pass
- Test deferral requires explicit human approval

**✅ Deployment Artifacts (if applicable):**
- Dockerfile, Cloud Build YAML, Cloud Run configs, IaC
- Must integrate with `validate_deliverable.sh`

**✅ Documentation:**
- Rationale, trade-offs, notes
- LLM hints (`llm_prompt`) where beneficial

**✅ Traceability:**
All code changes trace to:
- Sprint
- Request ID in `request-log.md`
- Intent-focused commits

Human may accept missing/failing tests; gaps MUST be listed under **Deferred** in `verification-report.md` and recorded as evidence-backed observations in `retro.md`.

---

# 4. Testing Standards

- Tests required
- Node/TypeScript: Jest; other stacks: language-appropriate (pytest, go test)
- Tests beside code or in `__tests__/`
- High coverage encouraged
- External services mocked
- Tests run as part of validation

---

# 5. Deliverable Types

Every sprint produces ≥1:
- Code artifact
- Tests
- Deployment scripts
- Architecture documentation

All outputs MUST:
- Build
- Test
- Integrate with validation pipeline

Planning/Discovery sprints may produce documentation-only; validation should lint, link-check, verify structure.

---

# 6. Project Structure

**INV-037:** Never use or depend on `./deprecated` in deliverables

```
deprecated/      # Historical reference only
examples/        # Templates
planning/        # Sprint artifacts (authoritative)
preview/         # Visionary, non-binding
infrastructure/  # IaC, Cloud Build, Terraform
src/
  apps/          # Service entrypoints
  common/        # Shared utilities
  config/        # Configuration
  services/      # Core microservices
  types/         # Shared types
```

---

# 7. Code Style Rules

- TypeScript by default; follow stack if service specifies different
- kebab-case filenames
- PascalCase classes/interfaces
- camelCase functions/variables
- UPPER_SNAKE_CASE constants

**Logging:**
- Log through facade if possible
- `info` for useful info
- `error` for errors
- `debug` for deep insight
- Log all network + filesystem operations with context

---

# 8. Error Handling & Events

- Strong try/catch discipline
- Graceful service shutdown
- Validate environment variables
- Use Pub/Sub for service communication
- Normalize external events to internal schema

---

# 9. Collaboration Roles

Responsibility domains (not rigid job titles):

- **Human Sponsor:** Frames outcomes/constraints, approves plans/scope/exceptions/completion/releases, contributes contextual judgment
- **LLM Implementor:** Produces plans/backlogs, implements approved work, maintains traceability, creates commits/validation/handoff
- **Architecture Partner:** Analyzes cloud/platform design without overriding `architecture.yaml`, surfaces trade-offs, returns consequential decisions to human
- **Quality Partner:** Defines/evaluates acceptance criteria, distinguishes verified facts/accepted exceptions/unresolved risk
- **Learning Partner:** Converts sprint evidence into atomic observations/reusable learnings, preserves uncertainty/applicability/provenance

---

# 10. Sprint Lifecycle Summary

**INV-040:** If sprint state unclear, ask once then proceed with best judgment inside existing authority, never bypass approval gate or infer release

```
Frame → Plan → Approve → Implement + Commit
  ↳ PR: Human | LLM | Automation (when approved)
  → Validate + Verify → Retro + Learn → Push Handoff
  → Human Complete → Human Release (optional)
```

System designed for:
- High traceability
- Rigor
- Iterative improvement
- Explicit human authority
- Effective Human–LLM handoffs
- Extraction-ready organizational learning

---

# End of AGENTS.md