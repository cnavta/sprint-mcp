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

1. **Verify main branch baseline.** Ensure the `main` branch exists (locally or as `origin/main`) and contains at least one commit. This provides a stable baseline for feature branches. If verification fails, do not proceed; notify the human that the main branch must be initialized first.
2. **Check for active sprints.** Verify no `sprint-manifest.yaml` in `planning/` has a status other than `complete`. If an active sprint is found, do not proceed with a new sprint; notify the human that the active sprint must be completed or force-closed first (Rule S3).
3. **Generate a sprint ID**
   ```
   sprint-<number>-<short-hash>
   ```
4. **Create the sprint directory**
   ```
   planning/sprint-<id>/
   ```
5. **Create a git worktree for sprint isolation**
   ```
   git worktree add .worktrees/sprint-<id> -b feature/<sprint-id>-<short-description>
   ```
   **Worktree benefits:**
   - **Isolation**: Each sprint has its own working directory; no branch context switching
   - **Parallel work**: Main worktree remains on `main`; sprint work happens in `.worktrees/sprint-<id>/`
   - **Clean separation**: No risk of mixing sprint changes with main branch state
   - **Easy cleanup**: Remove worktree after sprint completion

   The main worktree (repository root `.`) remains on the `main` branch throughout all sprints. Each sprint's worktree is created at `.worktrees/sprint-<id>/` with its own feature branch.

6. **Change to the sprint worktree directory**
   ```
   cd .worktrees/sprint-<id>/
   ```
   All subsequent sprint work (planning, implementation, validation) happens within this worktree directory.

7. **Create `sprint-manifest.yaml`** in the sprint directory WITHIN THE WORKTREE with required metadata (see schema below).

   The sprint directory is `planning/sprint-<id>/` INSIDE the worktree, ensuring all sprint artifacts are committed on the feature branch and merged to main via PR.

   Example path: `.worktrees/sprint-<id>/planning/sprint-<id>/sprint-manifest.yaml`

   This directory is created automatically by the start-sprint tool. All planning artifacts (manifest, request-log, implementation-plan, etc.) live on the feature branch alongside code changes.

8. **Log the action in `request-log.md`**

9. **Verify the worktree and branch before planning continues.** Record `git branch --show-current`, `git status --short --branch`, and `pwd` results. Implementation MUST NOT begin on the default branch or in a detached HEAD state. The current working directory should be `.worktrees/sprint-<id>/`.

Worktree creation is an initialization requirement, not deferred publication work. If the main worktree has uncommitted changes, they are preserved; the sprint worktree starts clean from the main branch baseline. If the worktree cannot be created, keep the sprint in `planning`, log the blocker, and pause implementation.

Example:
```bash
# From repository root (main worktree)
git worktree add .worktrees/sprint-7-a13b2f -b feature/sprint-7-a13b2f-user-profile-service
cd .worktrees/sprint-7-a13b2f/

# Verify
git branch --show-current  # Should show: feature/sprint-7-a13b2f-user-profile-service
pwd                        # Should show: /path/to/repo/.worktrees/sprint-7-a13b2f
```

**Note:** This protocol document (AGENTS-uncompressed.md) is the source of truth. The compressed version (AGENTS.md) will need to be regenerated in a future sprint to reflect these worktree changes.

---

## 2.2.1 Agent Working Directory Discipline

Once you `cd` to the sprint worktree (`.worktrees/sprint-<id>/`), you MUST remain in that context for ALL sprint work. The unified worktree model ensures all sprint changes (code + planning) are committed together on the feature branch.

### ✅ Correct Workflow (Unified Model)

```bash
# After sprint starts
cd .worktrees/sprint-15-dq6cg7/

# All paths are relative to worktree root
edit src/tools/example.ts                          # Code changes
edit planning/sprint-15-dq6cg7/request-log.md     # Planning artifacts
npm test                                           # Run tests
git add .                                          # Stage all changes
git commit -m "Implement feature X"               # Commit code + planning
git push origin feature/sprint-15-dq6cg7-...      # Push to remote
```

### ❌ Incorrect Workflow (Split Model - Deprecated)

```bash
# DO NOT DO THIS
cd /Users/.../sprint-mcp/                          # ❌ Don't go back to main repo
edit planning/sprint-15-dq6cg7/request-log.md     # ❌ Don't edit planning outside worktree
cd .worktrees/sprint-15-dq6cg7/                    # ❌ Don't context-switch
edit src/tools/example.ts
```

### Key Principles

1. **One Working Directory**: All sprint work happens in `.worktrees/sprint-<id>/`
2. **Relative Paths**: Use worktree-relative paths (e.g., `src/...`, `planning/sprint-<id>/...`)
3. **No Context Switching**: Never cd back to main repository during sprint
4. **Complete Commits**: git commit captures both code and planning artifact changes
5. **Complete PRs**: PR merges both code and planning to main branch

### After PR Merge

Once the PR is merged:
- Planning artifacts are now in main repo: `planning/active/sprint-<id>/` (or `planning/sprint-<id>/` if no archive system)
- Sprint can be archived: `planning/archive/2026/sprint-<id>/`
- Worktree can be cleaned up: `git worktree remove .worktrees/sprint-<id>/`

### Legacy Sprints (Pre-Sprint-16)

**Note**: Sprints 1-15 used a split model where planning artifacts lived in the main repo planning/ directory, separate from the worktree. This created confusion and violated the principle stated in section 2.2 step 6: "All subsequent sprint work happens within this worktree directory."

If working with legacy sprints (1-15), you may find:
- Planning artifacts: `planning/sprint-<id>/` (main repo)
- Code changes: `.worktrees/sprint-<id>/src/` (worktree)

**Starting with Sprint 16**, ALL sprints use the unified worktree model where everything (code + planning) lives in the worktree.

---

## 2.2.2 Sprint Lifecycle Hooks

Sprint-MCP provides a hooks system that enables **project-specific automation** at key sprint events. Hooks are optional executable bash scripts stored in `.sprint-hooks/` directory (in the main repository root, NOT in worktrees) that execute automatically during sprint operations.

### Hook Architecture

Hooks follow **Option A: Separate Lifecycle and Status Hooks** model:

**Lifecycle Hooks** (4 hooks - explicit, event-specific):
- `post-worktree-create` - After worktree + planning directory created
- `pre-worktree-remove` - Before worktree removal during cleanup
- `pre-archive` - Before moving sprint to archive
- `post-archive` - After sprint archived

**Status Change Hook** (1 hook - generic, handles ALL status transitions):
- `on-status-change` - Before/after ANY status change (planning → in-progress → validating → complete, etc.)

### Blocking vs Non-Blocking Behavior

| Hook | Phase | Behavior |
|------|-------|----------|
| `post-worktree-create` | POST | NON-BLOCKING: Failures logged, sprint creation continues |
| `on-status-change` (PRE) | PRE | BLOCKING: Failures prevent status update |
| `on-status-change` (POST) | POST | NON-BLOCKING: Failures logged, status update completes |
| `pre-worktree-remove` | PRE | BLOCKING: Failures prevent worktree removal |
| `pre-archive` | PRE | BLOCKING: Failures prevent archival |
| `post-archive` | POST | NON-BLOCKING: Failures logged, archival completes |

**BLOCKING hooks** return non-zero exit code → operation aborted
**NON-BLOCKING hooks** return non-zero exit code → warning logged, operation continues

### Environment Variables Passed to Hooks

All hooks receive:
- `SPRINT_ID` - Sprint identifier (e.g., `sprint-16-rgo90d`)
- `SPRINT_WORKTREE` - Absolute path to worktree (e.g., `/path/.worktrees/sprint-16-rgo90d`)
- `SPRINT_PLANNING_DIR` - Absolute path to planning directory
- `SPRINT_BRANCH` - Feature branch name (e.g., `feature/sprint-16-rgo90d-hooks`)
- `SPRINT_EVENT` - Hook name being executed (e.g., `post-worktree-create`)

**Additionally**, `on-status-change` receives:
- `SPRINT_STATUS_FROM` - Previous status (e.g., `planning`)
- `SPRINT_STATUS_TO` - New status (e.g., `in-progress`)
- `SPRINT_LIFECYCLE_PHASE` - Either `pre` (before update) or `post` (after update)

### Example: on-status-change Hook (Status Transition Logic)

```bash
#!/bin/bash
set -e  # Exit on error (blocks on PRE phase, logs on POST phase)

cd "$SPRINT_WORKTREE"

# PRE PHASE - Runs BEFORE status update (BLOCKING)
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  echo "Validating status transition: $SPRINT_STATUS_FROM → $SPRINT_STATUS_TO"

  # Block if starting sprint with uncommitted changes
  if [ "$SPRINT_STATUS_TO" = "in-progress" ]; then
    if ! git diff-index --quiet HEAD --; then
      echo "ERROR: Cannot start sprint with uncommitted changes"
      exit 1  # BLOCKS status update
    fi
  fi

  # Run tests before completion
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    if ! npm test; then
      echo "ERROR: Tests failed"
      exit 1  # BLOCKS status update
    fi
  fi
fi

# POST PHASE - Runs AFTER status update (NON-BLOCKING)
if [ "$SPRINT_LIFECYCLE_PHASE" = "post" ]; then
  # Send notification on completion
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -d "{\"text\": \"Sprint $SPRINT_ID completed!\"}"
  fi
fi

exit 0
```

### Hook Discovery and Execution

1. **Discovery**: Hooks are discovered in `.sprint-hooks/` directory in **project root** (not worktree)
2. **Executable Check**: Hook file must have executable permission (`chmod +x .sprint-hooks/hookname`)
3. **Execution**: Hooks run with `cwd` set to `SPRINT_WORKTREE` (worktree directory)
4. **Timeout**: Hooks have 5-minute execution timeout
5. **Capture**: stdout/stderr captured and logged

**Security**: Only executable files in `.sprint-hooks/` are recognized. Parent directories are NOT searched.

### Common Use Cases

**`post-worktree-create`** - Automate worktree setup:
- Install dependencies (`npm ci`, `pip install -r requirements.txt`)
- Run builds (`npm run build`)
- Create .env files from templates
- Run database migrations
- Start development services

**`on-status-change` (PRE)** - Validate transitions:
- Check for uncommitted changes before starting sprint
- Run test suite before completion
- Verify build succeeds before validation
- Enforce sprint protocol rules

**`on-status-change` (POST)** - Notify and integrate:
- Send Slack/email notifications on completion
- Trigger deployments on publish
- Log metrics to analytics systems
- Update project management tools

**`pre-worktree-remove`** - Prevent data loss:
- Check for uncommitted changes
- Check for unpushed commits
- Stop running services (docker-compose down)
- Backup temporary data

**`pre-archive` / `post-archive`** - Archive automation:
- Validate sprint completeness before archival
- Extract knowledge/metrics after archival
- Update external documentation systems

### Example Hooks

Production-ready example hooks are available in `examples/sprint-hooks/`:

**Node.js/TypeScript**:
- `examples/sprint-hooks/node-typescript/post-worktree-create`
- `examples/sprint-hooks/node-typescript/on-status-change`
- `examples/sprint-hooks/node-typescript/pre-worktree-remove`
- `examples/sprint-hooks/node-typescript/README.md`

**Python/Django**:
- `examples/sprint-hooks/python-django/post-worktree-create`
- `examples/sprint-hooks/python-django/README.md`

### Hook Failures and Debugging

**When a BLOCKING hook fails**:
- Operation is aborted (status update, cleanup, archival)
- Error message shown to user with hook stderr
- User must fix issue and retry operation

**When a NON-BLOCKING hook fails**:
- Operation completes successfully
- Warning logged with hook stderr
- No action required (though fixing hook is recommended)

**Debugging hooks**:
```bash
# Test hook manually
cd .worktrees/sprint-X/
SPRINT_ID="sprint-X-abc123" \
SPRINT_WORKTREE="$(pwd)" \
SPRINT_PLANNING_DIR="$(pwd)/planning/sprint-X-abc123" \
SPRINT_BRANCH="feature/test" \
SPRINT_EVENT="post-worktree-create" \
.sprint-hooks/post-worktree-create

# Check hook is executable
ls -la .sprint-hooks/
chmod +x .sprint-hooks/*  # Make executable if needed
```

### Hook Design Principles

1. **Idempotent**: Hooks should be safe to run multiple times
2. **Fast**: Keep hooks under 5 minutes (enforced timeout)
3. **Clear Errors**: Exit 1 with descriptive error messages for blocking failures
4. **Graceful Degradation**: Handle missing dependencies/files gracefully
5. **Logging**: Use clear output messages (stdout) and errors (stderr)
6. **Project-Specific**: Hooks live in project repo, not sprint-mcp installation

---

# 🧩 2.3 Sprint Directory Structure

The sprint directory lives WITHIN the worktree for unified workflow:

```
.worktrees/sprint-7-a13b2f/          ← Worktree root
  planning/
    sprint-7-a13b2f/                 ← Sprint artifacts on feature branch
      sprint-manifest.yaml
      execution-plan.md
      backlog.yaml
      request-log.md
      validate_deliverable.sh
      verification-report.md
      publication.yaml
      retro.md
      key-learnings.md
  src/                               ← Code changes on feature branch
    tools/
    common/
    ...
```

After PR merge to main, the sprint directory structure appears in the main repository:

```
planning/
  active/                            ← Completed sprints (or flat if no archive)
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

This directory is the single authoritative source of truth for every sprint. Within it, `backlog.yaml` is the accountability contract for sprint commitments and current work state; `request-log.md` is the record of Human–LLM interactions, interpretations, decisions, and outcomes.

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

## 2.3.1 Backlog Accountability Contract

Every sprint MUST maintain `backlog.yaml` as the authoritative contract for what the partnership has committed to deliver and the current state of each item. Update it as state changes occur, not only during verification or completion.

`request-log.md` serves a different purpose: it records Human–LLM turns and why decisions were made. Backlog history contains concise state transitions and stable evidence references; it MUST NOT duplicate conversational narratives.

### Required backlog shape

```yaml
meta:
  backlog_id: <sprint-id>-backlog
  updated_at: <ISO-8601 timestamp>
  status_values: [todo, in-progress, blocked, done, deferred, cancelled]
  approval_values: [not-required, pending, approved]

sprint:
  id: <sprint-id>
  goal: <approved sprint goal>
  status: <current sprint-manifest status>
  wip_limit: 1 # optional; omit when the human has not defined a limit

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
    updated_at: <ISO-8601 timestamp>
    history:
      - at: <ISO-8601 timestamp>
        from: null
        to: todo
        reason: <why the item entered this state>
        turn_id: <request-log turn ID>
```

Fields may be extended for project needs, but their meanings MUST NOT be redefined. `priority`, `owner`, and `wip_limit` guide execution; they do not override human approval, dependencies, or acceptance criteria.

### Status transition rules

- **Create:** Add a new item as `todo`, normally at the end of `items`, with acceptance criteria and `approval: pending` when approval is still required.
- **Start:** Before implementation begins, change `todo` to `in-progress`. The item must have `approval: approved` or `not-required`, all required dependencies must be `done`, and the WIP limit must permit it.
- **Block:** As soon as progress cannot continue, change the item to `blocked` and populate `blocked_reason` with the concrete unmet condition.
- **Unblock:** When the condition clears, change `blocked` to `todo` or `in-progress`, clear `blocked_reason`, and state why work can resume.
- **Complete:** Change `in-progress` to `done` only after every acceptance criterion is verified. Add stable evidence references such as commits, validation output, paths, or verification records.
- **Defer or cancel:** Use `deferred` or `cancelled` only with explicit human direction. Record the reason and related Human–LLM turn.
- **Materially revise:** When title, scope, priority, owner, dependencies, or acceptance criteria change, update the item timestamp and append a history record even if status does not change.

Every transition or material revision MUST update both `item.updated_at` and `meta.updated_at`, append a concise `history` entry, and link the responsible `request-log.md` turn through `turn_id`. The backlog is the source of truth for current status; the request log is the source of truth for the interaction and rationale.

---

## 2.3.2 Sprint Index

The **sprint index** (`planning/sprint-index.yaml`) is a derived, regenerable cache of sprint metadata sourced from individual sprint manifests. It provides fast, centralized access to sprint information without scanning the filesystem.

### Principles

- **Single Source of Truth**: Sprint manifests in `planning/sprint-*/sprint-manifest.yaml` are authoritative
- **Derived Cache**: The index is computed from manifests, never manually edited
- **Regenerable**: Can be rebuilt from manifests at any time without data loss
- **Atomic Updates**: Manifest updated first (authoritative), then index (derived)
- **Non-Fatal Failures**: Index update failures are logged but don't block operations (can regenerate)

### Automatic Updates

The index is automatically updated by MCP tools:

- **Sprint Creation**: `start-sprint` adds a new entry to the index
- **Status Updates**: `update-sprint-status` atomically updates both manifest and index
- **Index Regeneration**: `regenerate-sprint-index` rebuilds the entire index from all manifests

### Manual Regeneration

If the index becomes corrupted, out of sync, or after manual manifest edits, regenerate it:

**Via MCP Tool**:
```
regenerate-sprint-index (no parameters required)
```

**Via npm Script**:
```bash
npm run sprint:index:regenerate
```

This scans all sprint manifests in `planning/`, extracts metadata, and rebuilds the index file with:
- Complete sprint list sorted by sprint number
- Computed statistics (counts by status, by completion mode, average duration)
- Validation of index consistency and completeness

### Recovery

Because the index is derived from manifests, it can always be regenerated:

1. If `planning/sprint-index.yaml` is corrupted → regenerate
2. If index shows incorrect data → regenerate
3. If index is missing sprints → regenerate
4. If test artifacts pollute index → regenerate

The regeneration tool is the universal recovery mechanism. It includes validation to detect:
- Missing or orphaned manifests
- Data mismatches between index and manifests
- Incorrect statistics
- Schema violations

### Index Schema

```yaml
version: "1.0"
generatedAt: "2026-07-31T12:00:00Z"
totalSprints: 5
activeSprints: 1
completedSprints: 4

sprints:
  - id: sprint-1-abc123
    title: "Sprint title"
    status: complete | in-progress | planning | ...
    owner: "Owner name"
    createdAt: "2026-07-30T12:00:00Z"
    startedAt: "2026-07-30T14:00:00Z"      # optional
    completedAt: "2026-07-30T20:00:00Z"    # optional
    completionMode: normal | forced         # optional
    manifestPath: "planning/sprint-1-abc123/sprint-manifest.yaml"
    branch: "feature/sprint-1-abc123-title"
    pr: "https://github.com/owner/repo/pull/123" # optional
    worktreePath: ".worktrees/sprint-1-abc123"   # optional

statistics:
  byStatus:
    planning: 0
    in-progress: 1
    complete: 4
    # ... etc
  byCompletionMode:
    normal: 4
    forced: 0
  averageSprintDuration: "PT6H45M"  # ISO 8601 duration
```

### DO NOT EDIT Header

The index file includes a prominent header:

```yaml
# Sprint Index
#
# DO NOT EDIT THIS FILE MANUALLY
#
# This is a derived, regenerable cache of sprint metadata sourced from
# individual sprint manifests. It is automatically updated by MCP tools.
#
# To regenerate from scratch: Use the regenerate-sprint-index tool
```

This header reminds developers that the index is computed, not authoritative. Manual edits will be overwritten on the next regeneration.

### Troubleshooting

**Issue**: Index out of sync with manifests
**Solution**: Run `regenerate-sprint-index` or `npm run sprint:index:regenerate`

**Issue**: Index shows test sprints
**Solution**: Regenerate (only indexes sprints with valid manifests in `planning/`)

**Issue**: Index update failed during sprint creation
**Solution**: Non-fatal - sprint still created. Regenerate index to add missing entry.

**Issue**: Validation errors after regeneration
**Solution**: Check error codes and fix underlying manifest issues, then regenerate again.

---

# 📝 2.4 Planning Phase — *Coding Forbidden Until Approved*

Before ANY implementation begins, the LLM prepares the plan and the human exercises the approval gate:

- The LLM generates `execution-plan.md` and `backlog.yaml`
- The LLM ensures every planned deliverable maps to one or more backlog items with observable acceptance criteria
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
3. **Update Backlog:** Add or revise accountable backlog items, acceptance criteria, approval state, and transition history.
4. **Update Manifest:** If the goal has evolved significantly, update the `goal` or `title` in `sprint-manifest.yaml`.
5. **Log Request:** Document the Human–LLM turn and its interpretation in `request-log.md`.
6. **Approval Gate:** If the change is substantial, the LLM MUST pause and request human approval for the amended plan before proceeding.
7. **Maintain Branch Integrity:** Perform all amended work on the existing feature branch (Rule S11).

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

Before starting, blocking, unblocking, completing, deferring, cancelling, or materially revising an item, the LLM MUST update its backlog state under §2.3.1. Status changes are part of execution, not end-of-sprint bookkeeping.

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
3. **Append:** Log the interaction in `request-log.md` and add an atomic backlog item using the contract in §2.3.1. Place it at the end of `items` unless the human specifies another position, priority, or dependency. Preserve the order of multiple follow-ups as received. Do not reorder existing items without human direction.
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
- Reconciliation against every `backlog.yaml` item and its current status

Before verification completes, the LLM MUST confirm that every `done` item has acceptance evidence, every `blocked` item has a current blocker, and every `deferred` or `cancelled` item links to explicit human direction. Differences between the backlog and implementation are verification failures until corrected or accepted by the human.

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

## Worktree Cleanup

After sprint completion (normal or forced) and after the PR has been merged (if applicable), the sprint worktree should be removed to keep the repository clean:

```bash
# Return to main worktree
cd /path/to/repo  # Or use absolute path to repository root

# Remove the sprint worktree
git worktree remove .worktrees/sprint-<id>
```

**Timing**: Worktree cleanup should occur:
- **After PR merge**: If the sprint resulted in a merged PR, remove the worktree after merge confirmation
- **After force completion**: If force-completed without a PR, remove the worktree immediately after recording completion
- **After cancellation**: If the sprint was cancelled, remove the worktree to clean up the failed attempt

**Error handling**: If the worktree has uncommitted changes:
```bash
# Check worktree status first
git worktree list

# If worktree has uncommitted changes, use --force
git worktree remove .worktrees/sprint-<id> --force
```

Use `--force` only after confirming with the human that uncommitted changes can be discarded. Document the cleanup action in the sprint's `request-log.md` before removal.

**Note**: The sprint directory `planning/sprint-<id>/` remains in the repository as the permanent record. Only the `.worktrees/sprint-<id>/` working directory is removed.

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
