# LLM Usage Guide for sprint-mcp MCP Tools
**Audience**: LLM Agents (Claude Desktop, other MCP-enabled LLMs)
**Purpose**: Effective usage of sprint-mcp MCP tools for Sprint Protocol execution
**Version**: 1.0
**Date**: 2026-08-12
**Sprint**: sprint-21-0oh8mw

---

## Overview

You are an LLM agent with access to sprint-mcp MCP tools. You are the **primary interface** between human users and the Sprint Protocol. Your effective use of these tools directly impacts the human user experience.

**Critical insight**: sprint-mcp operates in a dual-audience architecture:
1. **Human users** who request sprint work ("Start a sprint to add authentication")
2. **LLM agents (you)** who translate human requests into MCP tool invocations

**Your responsibility**: Choose the correct tools, invoke them in the right sequence, generate quality metadata, handle errors gracefully, and guide humans through the Sprint Protocol.

---

## Table of Contents

1. [Tool Overview](#1-tool-overview)
2. [Tool Selection Guidance](#2-tool-selection-guidance)
3. [Usage Patterns & Workflows](#3-usage-patterns--workflows)
4. [Parameter Best Practices](#4-parameter-best-practices)
5. [Sprint Protocol Integration](#5-sprint-protocol-integration)
6. [Error Handling](#6-error-handling)
7. [Response Interpretation](#7-response-interpretation)
8. [Complete Examples](#8-complete-examples)

---

## 1. Tool Overview

### 1.1 Available MCP Tools

| Tool | When to Use | Phase | Critical? |
|------|-------------|-------|-----------|
| `check-sprint-status` | **ALWAYS FIRST** before any sprint operation | §2.3 | ✅ YES |
| `start-sprint` | User says "Start a sprint" or similar | §2.4 | ✅ YES |
| `update-sprint-status` | Manually update sprint phase/status | §2.4-§2.9 | Rarely |
| `complete-sprint` | User says "Complete sprint" or sprint work done | §2.9 | ✅ YES |
| `cleanup-sprint` | Remove worktrees after sprint complete | §2.9 | Optional |
| `archive-sprint` | Move completed sprint to archive | §2.9.1 | Optional |
| `auto-archive-sprints` | Batch archive old sprints | §2.9.1 | Optional |
| `regenerate-sprint-index` | Recover from index corruption | §2.3.2 | Recovery only |

### 1.2 Tool Descriptions

#### `check-sprint-status`
**What it does**: Checks if any sprints are active, validates worktree consistency
**Required parameters**: None
**When to invoke**:
- ✅ **ALWAYS** before `start-sprint` (Protocol Rule S3)
- ✅ Before most sprint operations
- ✅ When user asks "What's my sprint status?"

**Example invocation**:
```
Invoke: check-sprint-status()
```

**Returns**: Active sprint info OR "No active sprints"

---

#### `start-sprint`
**What it does**: Creates new sprint with worktree, manifest, planning artifacts
**Required parameters**:
- `title` (string) - Concise sprint title
- `goal` (string) - Clear, measurable objective
- `owner` (string) - GitHub handle or name

**When to invoke**:
- ✅ User says "Start a sprint"
- ✅ User says "Start sprint to [goal]"
- ✅ **ONLY AFTER** checking sprint status (Rule S3)

**What it creates**:
- Git worktree at `.worktrees/sprint-{id}/`
- Feature branch `feature/sprint-{id}-{title}`
- Planning artifacts in worktree at `planning/sprint-{id}/`
- Sprint manifest with metadata

**Example invocation**:
```
Invoke: start-sprint(
  title="Add user authentication",
  goal="Implement JWT-based authentication with login and logout endpoints",
  owner="christophernavta"
)
```

---

#### `update-sprint-status`
**What it does**: Updates sprint status in manifest and index
**Required parameters**:
- `sprintId` (string) - Sprint ID (e.g., "sprint-12-abc123")

**Optional parameters**:
- `status` (string) - New status: planning | in-progress | validating | verifying | published | complete
- `completedAt` (ISO 8601 timestamp)
- `completionMode` - "normal" or "forced"
- `pr` (string) - GitHub PR URL

**When to invoke**:
- ⚠️ **Rarely needed** - status usually managed by workflow
- Use `complete-sprint` instead for completion
- Only use for manual status corrections

---

#### `complete-sprint`
**What it does**: Validates artifacts, updates status to complete, provides summary
**Required parameters**:
- `sprintId` (string) - Sprint ID
- `completionMode` (string) - "normal" or "forced"

**Optional parameters**:
- `pr` (string) - GitHub PR URL (if created)

**When to invoke**:
- ✅ User says "Complete sprint"
- ✅ User says "Sprint complete"
- ✅ Sprint work is finished and validated

**Completion modes**:
- **"normal"**: Requires all artifacts present (strict)
- **"forced"**: Allows completion despite missing artifacts (user must approve)

**Example invocation**:
```
Invoke: complete-sprint(
  sprintId="sprint-12-abc123",
  completionMode="normal",
  pr="https://github.com/owner/repo/pull/123"
)
```

---

#### `cleanup-sprint`
**What it does**: Removes git worktree for completed sprint, preserves planning artifacts
**Required parameters**: None (if omitted, shows all completed sprints)
**Optional parameters**:
- `sprintId` (string) - Specific sprint to cleanup
- `force` (boolean) - Force removal even with uncommitted changes

**When to invoke**:
- ✅ After sprint complete and PR merged
- ✅ To free disk space
- ✅ User says "Cleanup sprint worktree"

**Safety**: Only removes worktrees for **complete** sprints

---

#### `archive-sprint`
**What it does**: Moves completed sprint from `planning/active/` to `planning/archive/{year}/`, extracts knowledge
**Required parameters**:
- `sprintId` (string) - Sprint to archive

**Optional parameters**:
- `dryRun` (boolean) - Preview without making changes

**When to invoke**:
- ✅ User says "Archive sprint-X"
- ✅ Sprint is complete and no longer actively referenced
- ✅ To organize completed work

**Knowledge extraction**: Automatically extracts lessons, patterns, anti-patterns from retro and key-learnings

---

#### `auto-archive-sprints`
**What it does**: Batch archive completed sprints based on age/count criteria
**Optional parameters**:
- `criteria` (string) - "age" | "count" | "hybrid"
- `ageDays` (number) - Archive sprints older than N days
- `keepCount` (number) - Keep only N most recent sprints
- `dryRun` (boolean) - Preview without changes

**When to invoke**:
- ✅ User says "Archive old sprints"
- ✅ Periodic cleanup of completed sprints

---

#### `regenerate-sprint-index`
**What it does**: Rebuilds `planning/sprint-index.yaml` from all manifests
**Optional parameters**:
- `repair` (boolean) - Create minimal manifests for directories missing them

**When to invoke**:
- ⚠️ **Recovery only** - index corrupted or out of sync
- User says "Regenerate sprint index"
- After manual file system changes

---

## 2. Tool Selection Guidance

### 2.1 Decision Trees for Common User Requests

#### User: "Start a sprint"

```
START
  ↓
[1] Check sprint status FIRST (Rule S3)
  ↓
  Invoke: check-sprint-status()
  ↓
  ├─ Active sprint exists? → STOP
  │   └─ Tell user: "Sprint {id} is already active. Complete it first or continue working on it."
  │
  └─ No active sprint? → PROCEED
      ↓
  [2] Extract sprint metadata from user request
      - title: Concise (3-6 words)
      - goal: Specific, measurable
      - owner: From user context or ask
      ↓
  [3] Invoke: start-sprint(title, goal, owner)
      ↓
  [4] Tell user what was created, guide to next phase
```

---

#### User: "Complete sprint" or "Sprint complete"

```
START
  ↓
[1] Check if active sprint exists
  ↓
  Invoke: check-sprint-status()
  ↓
  ├─ No active sprint? → STOP
  │   └─ Tell user: "No active sprint found. Nothing to complete."
  │
  └─ Active sprint found? → PROCEED
      ↓
  [2] Determine completion mode
      ├─ User said "force complete" → completionMode="forced"
      └─ Normal completion → completionMode="normal"
      ↓
  [3] Check if PR was created (from previous context)
      ├─ PR exists → include PR URL
      └─ No PR → pr=null
      ↓
  [4] Invoke: complete-sprint(sprintId, completionMode, pr)
      ↓
  [5] Interpret result, guide user to next steps
```

---

#### User: "What's my sprint status?" or "Check sprint"

```
START
  ↓
[1] Invoke: check-sprint-status()
  ↓
[2] Interpret result
  ├─ Active sprint? → Report: ID, status, goal, phase
  │   └─ Suggest: "Would you like to continue working on it?"
  │
  └─ No active sprint? → Report: "No active sprints"
      └─ Suggest: "Ready to start a new sprint?"
```

---

#### User: "Archive sprint-12"

```
START
  ↓
[1] Check sprint status
  ↓
  Invoke: check-sprint-status()
  ↓
[2] Verify sprint-12 is complete
  ├─ Not complete? → STOP
  │   └─ Tell user: "Sprint must be complete before archiving"
  │
  └─ Complete? → PROCEED
      ↓
  [3] Invoke: archive-sprint(sprintId="sprint-12")
      ↓
  [4] Confirm archival, mention knowledge extraction
```

---

### 2.2 Tool Selection Rules

**Rule 1: ALWAYS check status first**
```
BEFORE invoking start-sprint → MUST invoke check-sprint-status
```

**Rule 2: Never bypass Protocol Rules**
```
S1: Sprint starts only on explicit "Start sprint"
S2: Sprint completes only on explicit "Complete sprint" or "Force complete"
S3: Only ONE active sprint at a time (check-sprint-status enforces this)
```

**Rule 3: Use complete-sprint, not update-sprint-status**
```
✅ User says "Complete sprint" → Use complete-sprint
❌ User says "Complete sprint" → Do NOT use update-sprint-status
```

**Rule 4: Provide recovery guidance**
```
If ANY tool returns an error:
  1. Read the error message
  2. Determine recovery procedure
  3. Guide user to resolution
  4. DO NOT silently fail
```

---

## 3. Usage Patterns & Workflows

### 3.1 Complete Sprint Lifecycle (Tool Sequence)

**Phase 1: Initialization**
```
User: "Start a sprint to add user profile page"

Sequence:
1. check-sprint-status()           // Rule S3 - verify no active sprint
2. start-sprint(
     title="Add user profile page",
     goal="Create user profile page with bio, avatar, and settings",
     owner="username"
   )
3. Guide user through implementation phases
```

**Phase 2: Development (in worktree)**
```
// NO MCP TOOLS during implementation
// Guide user through code changes, testing, validation
// All work happens in isolated worktree
```

**Phase 3: Completion**
```
User: "Complete sprint"

Sequence:
1. check-sprint-status()           // Verify sprint exists
2. complete-sprint(
     sprintId="sprint-12-abc123",
     completionMode="normal",
     pr="https://github.com/..."   // If PR created
   )
```

**Phase 4: Cleanup (optional)**
```
User: "Cleanup sprint worktree"

Sequence:
1. cleanup-sprint(sprintId="sprint-12-abc123")
```

**Phase 5: Archival (optional, later)**
```
User: "Archive sprint-12"

Sequence:
1. archive-sprint(sprintId="sprint-12-abc123")
```

---

### 3.2 Error Recovery Workflows

**Scenario: User tries to start sprint when one is active**

```
User: "Start a new sprint"

1. check-sprint-status()
   → Result: "sprint-11-abc123 is active (status: in-progress)"

2. Tell user:
   "Sprint sprint-11-abc123 is currently active. You have these options:
    1. Continue working on sprint-11
    2. Complete sprint-11 first, then start new sprint
    3. Force complete sprint-11 (use with caution)

    What would you like to do?"

3. Wait for user decision, proceed accordingly
```

**Scenario: complete-sprint fails due to missing artifacts**

```
User: "Complete sprint"

1. complete-sprint(sprintId="sprint-12-abc123", completionMode="normal")
   → Error: "Missing required artifact: verification-report.md"

2. Tell user:
   "Cannot complete sprint in normal mode. Missing: verification-report.md

    Options:
    1. Create verification-report.md now (I can help)
    2. Force complete sprint (artifacts missing will be documented)

    Which would you prefer?"

3. Wait for user choice, proceed accordingly
```

---

### 3.3 Common Task Patterns

**Pattern: Start → Work → Complete**
```
check-sprint-status() → start-sprint() → [work] → complete-sprint()
```

**Pattern: Start → Complete → Cleanup → Archive**
```
start-sprint() → [work] → complete-sprint() → cleanup-sprint() → archive-sprint()
```

**Pattern: Check before ANY operation**
```
check-sprint-status() → [decision based on result]
```

---

## 4. Parameter Best Practices

### 4.1 Generating Quality Sprint Titles

**Good titles** (concise, descriptive, 3-6 words):
- ✅ "Add user authentication"
- ✅ "Fix memory leak in parser"
- ✅ "Refactor database connection pool"
- ✅ "Add CSV export feature"

**Poor titles** (too vague, too long, or not descriptive):
- ❌ "Sprint 1" (not descriptive)
- ❌ "Fix bug" (too vague)
- ❌ "Add a new authentication system with JWT tokens and refresh token rotation" (too long)
- ❌ "Work on the project" (meaningless)

**Title generation algorithm**:
```
1. Identify the ACTION (Add, Fix, Refactor, Update, Remove, etc.)
2. Identify the TARGET (feature, bug, component)
3. Keep to 3-6 words
4. Use title case

Format: "[Action] [Target]"
Examples:
- User wants auth → "Add user authentication"
- User wants to fix crash → "Fix application crash on startup"
- User wants to improve performance → "Optimize database queries"
```

---

### 4.2 Generating Quality Sprint Goals

**Good goals** (specific, measurable, clear):
- ✅ "Implement JWT-based authentication with login, logout, and token refresh endpoints"
- ✅ "Fix memory leak in XML parser that causes heap overflow after 1000 documents"
- ✅ "Refactor database connection pool to use connection pooling library, reducing connection overhead by 50%"

**Poor goals** (vague, unmeasurable):
- ❌ "Make authentication work"
- ❌ "Fix the bug"
- ❌ "Improve things"

**Goal generation algorithm**:
```
1. What EXACTLY will be done?
2. What is the SUCCESS CRITERIA?
3. Are there specific REQUIREMENTS or CONSTRAINTS?

Template: "Implement [feature] that [does what] with [requirements]"
OR: "Fix [specific problem] by [solution approach]"

Examples:
- User: "Add authentication"
  → Goal: "Implement JWT authentication with login and logout endpoints, including token validation middleware"

- User: "The app crashes when loading large files"
  → Goal: "Fix application crash when loading files >10MB by implementing streaming file parser"
```

---

### 4.3 Owner Parameter

**Format options**:
- GitHub handle: `"christophernavta"`
- Full name: `"Christopher Navta"`
- Email: `"user@example.com"`

**How to determine owner**:
```
1. Check user context (if available)
2. Ask user if unclear: "What's your GitHub username or name for the sprint owner?"
3. Default to user's identity if known from conversation
```

---

### 4.4 Completion Mode Selection

**Use "normal" when**:
- All artifacts should be present
- Sprint followed standard workflow
- User did NOT say "force"

**Use "forced" when**:
- User explicitly says "force complete"
- Artifacts are missing but user accepts it
- Emergency completion needed
- User acknowledges incomplete state

**How to decide**:
```
IF user said "force complete" OR "force":
    completionMode = "forced"
ELSE IF user said "complete sprint":
    completionMode = "normal"
    IF tool returns artifact errors:
        Ask user: "Artifacts missing. Force complete?"
        IF user approves:
            Retry with completionMode = "forced"
```

---

## 5. Sprint Protocol Integration

### 5.1 Tool-to-Protocol-Phase Mapping

| Protocol Phase | MCP Tool | When Invoked |
|----------------|----------|--------------|
| §2.3 Verification | `check-sprint-status` | Before sprint start, status checks |
| §2.4 Sprint Initialization | `start-sprint` | User initiates sprint |
| §2.4-§2.9 Status Transitions | `update-sprint-status` | Manual status updates (rare) |
| §2.9 Sprint Completion | `complete-sprint` | Sprint work complete |
| §2.9 Cleanup | `cleanup-sprint` | After PR merge, free disk space |
| §2.9.1 Archival | `archive-sprint` | Long-term organization |
| §2.9.1 Batch Archival | `auto-archive-sprints` | Periodic cleanup |
| §2.3.2 Index Recovery | `regenerate-sprint-index` | Index corruption recovery |

### 5.2 Protocol Rules Enforced by Tools

**Rule S1: Sprint Start Gate**
- Enforced by: `start-sprint` tool
- Must be explicitly invoked by LLM in response to user saying "Start sprint"
- Tool does NOT auto-start sprints

**Rule S3: Single Active Sprint**
- Enforced by: `check-sprint-status` + `start-sprint`
- `start-sprint` fails if active sprint exists
- LLM MUST check status before starting

**Rule S11: Feature Branch Creation**
- Enforced by: `start-sprint` tool
- Automatically creates `feature/sprint-{id}-{title}` branch

**Rule S13: PR Requirement**
- Enforced by: `complete-sprint` tool
- PR URL logged in manifest
- Failed PR attempts must be documented

---

### 5.3 Phase Compliance Checklist

**Before invoking ANY tool**:
```
☐ Understand which protocol phase this supports
☐ Verify prerequisites met (e.g., check-sprint-status before start-sprint)
☐ Confirm user intent aligns with protocol rules
☐ Prepare to guide user through next phase
```

---

## 6. Error Handling

### 6.1 Common Errors and Recovery

#### Error: "Active sprint already exists (sprint-11-abc123)"

**Cause**: Tried to start sprint when one is active (violates Rule S3)

**Recovery**:
```
1. Tell user: "Sprint sprint-11-abc123 is already active"
2. Offer options:
   a. Continue working on sprint-11
   b. Complete sprint-11 first
   c. Check sprint-11 status
3. Wait for user decision
```

---

#### Error: "Missing required artifact: verification-report.md"

**Cause**: Tried to complete sprint in "normal" mode with missing artifacts

**Recovery**:
```
1. Tell user: "Cannot complete sprint. Missing: verification-report.md"
2. Offer options:
   a. Create missing artifact now (assist user)
   b. Force complete (document missing artifacts)
3. Wait for user decision
```

---

#### Error: "Sprint not found: sprint-12-abc123"

**Cause**: Referenced sprint doesn't exist

**Recovery**:
```
1. check-sprint-status() to see what sprints exist
2. Tell user: "Sprint sprint-12-abc123 not found"
3. If active sprint exists, ask if they meant that one
4. If no active sprint, ask user to clarify
```

---

#### Error: "Git worktree creation failed"

**Cause**: Git repository issue, disk space, or permissions

**Recovery**:
```
1. Tell user the specific error
2. Suggest:
   - Check git repository is initialized
   - Check disk space available
   - Check file permissions
3. Suggest: Check logs for details
```

---

### 6.2 Error Severity Levels

**Critical (stop immediately)**:
- ❌ Active sprint exists when trying to start new sprint (Rule S3 violation)
- ❌ Git repository not found
- ❌ Permissions denied

**High (user action required)**:
- ⚠️ Missing required artifacts on normal completion
- ⚠️ Worktree removal with uncommitted changes
- ⚠️ Sprint index corruption

**Medium (recoverable)**:
- ℹ️ Optional artifacts missing
- ℹ️ Non-blocking validation warnings

---

### 6.3 When to Ask User vs. Retry vs. Fail

**Ask user when**:
- Multiple valid options exist (continue or complete sprint)
- User approval needed (force complete, delete with uncommitted changes)
- Ambiguous intent ("sprint" could mean active sprint or specific ID)

**Retry when**:
- Transient error (network timeout, temporary lock)
- First attempt failed but second may succeed
- **Max 1 retry** - don't loop infinitely

**Fail gracefully when**:
- Unrecoverable error (file system full, permissions denied)
- Protocol violation (can't bypass Rule S3)
- Invalid state (corrupted manifest)

**Always**:
- Explain the error clearly
- Provide recovery guidance
- Never silently fail

---

## 7. Response Interpretation

### 7.1 How to Interpret Tool Outputs

#### `check-sprint-status` Response

**No active sprints**:
```json
{
  "status": "no_active_sprint",
  "message": "No active sprints found",
  "suggested_action": "ready_to_start"
}
```

**Interpretation**:
- ✅ Safe to start new sprint
- Tell user: "No active sprints. Ready to start a new sprint?"

---

**Active sprint exists**:
```json
{
  "status": "active_sprint_found",
  "sprint_id": "sprint-12-abc123",
  "sprint_status": "in-progress",
  "goal": "Add user authentication",
  "worktree_path": ".worktrees/sprint-12-abc123/",
  "suggested_action": "continue_or_complete"
}
```

**Interpretation**:
- ❌ Cannot start new sprint (Rule S3)
- Tell user: "Sprint sprint-12-abc123 is active (goal: Add user authentication). Continue working on it or complete it first."

---

#### `start-sprint` Response

**Success**:
```json
{
  "status": "success",
  "sprint_id": "sprint-13-xyz789",
  "worktree_path": ".worktrees/sprint-13-xyz789/",
  "branch": "feature/sprint-13-xyz789-add-authentication",
  "planning_path": ".worktrees/sprint-13-xyz789/planning/sprint-13-xyz789/",
  "next_steps": "Create implementation plan"
}
```

**Interpretation**:
- ✅ Sprint created successfully
- Tell user:
  ```
  Sprint sprint-13-xyz789 created successfully!

  Created:
  - Worktree: .worktrees/sprint-13-xyz789/
  - Branch: feature/sprint-13-xyz789-add-authentication
  - Planning artifacts: .worktrees/sprint-13-xyz789/planning/sprint-13-xyz789/

  Next step: Let's create your implementation plan. What approach would you like to take?
  ```

---

#### `complete-sprint` Response

**Success (normal mode)**:
```json
{
  "status": "success",
  "completion_mode": "normal",
  "artifacts_validated": true,
  "pr_url": "https://github.com/owner/repo/pull/123",
  "next_steps": "Merge PR, then cleanup worktree"
}
```

**Interpretation**:
- ✅ Sprint completed successfully
- Tell user:
  ```
  Sprint completed successfully! 🎉

  All artifacts validated.
  PR: https://github.com/owner/repo/pull/123

  Next steps:
  1. Review and merge the PR
  2. Run: `cleanup-sprint sprint-13-xyz789` to remove worktree
  3. Optionally archive: `archive-sprint sprint-13-xyz789`
  ```

---

**Success (forced mode)**:
```json
{
  "status": "success",
  "completion_mode": "forced",
  "artifacts_validated": false,
  "missing_artifacts": ["verification-report.md"],
  "pr_url": null
}
```

**Interpretation**:
- ⚠️ Sprint force completed (not ideal)
- Tell user:
  ```
  Sprint force completed.

  ⚠️ Missing artifacts:
  - verification-report.md

  Note: Sprint was completed despite missing artifacts. Consider creating them for future reference.
  ```

---

### 7.2 What to Present to Human Users

**Principle**: Translate technical MCP responses into human-friendly guidance

**Technical MCP output**:
```
{
  "status": "success",
  "sprint_id": "sprint-13-xyz789",
  "worktree_path": ".worktrees/sprint-13-xyz789/",
  ...
}
```

**Human-friendly presentation**:
```
Sprint sprint-13-xyz789 created successfully! 🎉

Here's what I created:
- Isolated workspace: .worktrees/sprint-13-xyz789/
- Feature branch: feature/sprint-13-xyz789-add-authentication
- Planning directory with your sprint manifest

Next, let's create your implementation plan...
```

**Guidelines**:
- ✅ Use friendly, encouraging language
- ✅ Explain WHAT was created and WHY
- ✅ Provide clear NEXT STEPS
- ✅ Use emojis sparingly for success/celebration
- ❌ Don't dump raw JSON
- ❌ Don't use jargon without explanation

---

### 7.3 Next-Step Guidance Extraction

**After each tool invocation, guide user to next phase**:

| Tool Invoked | Next Step Guidance |
|--------------|-------------------|
| `check-sprint-status` (no active) | "Ready to start a new sprint?" |
| `check-sprint-status` (active) | "Continue working on sprint-X or complete it?" |
| `start-sprint` | "Let's create your implementation plan. What's your approach?" |
| `complete-sprint` | "Sprint complete! Next: merge PR, then cleanup worktree" |
| `cleanup-sprint` | "Worktree removed. Optionally archive sprint for long-term storage" |
| `archive-sprint` | "Sprint archived with knowledge extraction. Check knowledge-base.yaml for lessons" |

---

## 8. Complete Examples

### Example 1: Start → Work → Complete (Happy Path)

**Conversation**:

```
User: "Start a sprint to add CSV export to the reports page"

LLM: [Internal: Check status first per Rule S3]
Invoke: check-sprint-status()
Response: { status: "no_active_sprint" }

[Internal: Safe to start sprint, extract parameters]
- title: "Add CSV export"
- goal: "Add CSV export functionality to reports page with download button"
- owner: "user123" [from context]

Invoke: start-sprint(
  title="Add CSV export",
  goal="Add CSV export functionality to reports page with download button",
  owner="user123"
)

Response: {
  status: "success",
  sprint_id: "sprint-14-abc456",
  worktree_path: ".worktrees/sprint-14-abc456/",
  branch: "feature/sprint-14-abc456-add-csv-export"
}

LLM to User:
"Sprint sprint-14-abc456 created successfully! 🎉

Created:
- Isolated workspace in .worktrees/sprint-14-abc456/
- Feature branch: feature/sprint-14-abc456-add-csv-export

Next step: Let's plan the implementation. What format should the CSV file have?"

[... work happens ...]

User: "Sprint complete"

LLM: [Internal: Complete the sprint]
Invoke: check-sprint-status()
Response: { status: "active", sprint_id: "sprint-14-abc456" }

Invoke: complete-sprint(
  sprintId="sprint-14-abc456",
  completionMode="normal",
  pr="https://github.com/owner/repo/pull/145"
)

Response: {
  status: "success",
  completion_mode: "normal",
  artifacts_validated: true
}

LLM to User:
"Sprint sprint-14-abc456 completed successfully! 🎉

All artifacts validated.
PR: https://github.com/owner/repo/pull/145

Next steps:
1. Review and merge the PR
2. Cleanup worktree: Just say 'cleanup sprint worktree'
3. Optionally archive for long-term storage"
```

---

### Example 2: Error Handling (Active Sprint Exists)

**Conversation**:

```
User: "Start a new sprint"

LLM: [Internal: Check status first]
Invoke: check-sprint-status()

Response: {
  status: "active_sprint_found",
  sprint_id: "sprint-13-xyz789",
  sprint_status: "in-progress",
  goal: "Add user authentication"
}

LLM to User:
"I can't start a new sprint right now because sprint-13-xyz789 is already active (goal: Add user authentication).

You have these options:
1. **Continue working** on sprint-13-xyz789
2. **Complete** sprint-13-xyz789 first, then start new sprint
3. **Force complete** sprint-13-xyz789 (use with caution)

What would you like to do?"

User: "Complete it"

LLM: [Internal: User wants to complete active sprint]
Invoke: complete-sprint(
  sprintId="sprint-13-xyz789",
  completionMode="normal"
)

Response: {
  status: "error",
  error: "Missing required artifact: verification-report.md"
}

LLM to User:
"Cannot complete sprint sprint-13-xyz789 in normal mode. Missing artifact:
- verification-report.md

Options:
1. **Create** verification-report.md now (I can help generate it)
2. **Force complete** the sprint (missing artifacts will be documented)

Which would you prefer?"

User: "Force complete"

LLM: [Internal: User approved force completion]
Invoke: complete-sprint(
  sprintId="sprint-13-xyz789",
  completionMode="forced"
)

Response: {
  status: "success",
  completion_mode: "forced",
  missing_artifacts: ["verification-report.md"]
}

LLM to User:
"Sprint sprint-13-xyz789 force completed.

⚠️ Note: Completed despite missing verification-report.md. This is documented in the sprint manifest.

Now ready to start your new sprint. What would you like to work on?"
```

---

### Example 3: Multi-Sprint Management

**Conversation**:

```
User: "What sprints do I have?"

LLM: [Internal: Check sprint status]
Invoke: check-sprint-status()

Response: {
  status: "active_sprint_found",
  sprint_id: "sprint-15-aaa111",
  all_sprints: [
    { id: "sprint-15-aaa111", status: "in-progress", goal: "Fix memory leak" },
    { id: "sprint-14-bbb222", status: "complete", goal: "Add CSV export" },
    { id: "sprint-13-ccc333", status: "complete", goal: "User authentication" }
  ]
}

LLM to User:
"Here are your sprints:

**Active**:
- sprint-15-aaa111 (in-progress): Fix memory leak

**Recent Completed**:
- sprint-14-bbb222 (complete): Add CSV export
- sprint-13-ccc333 (complete): User authentication

The active sprint is sprint-15-aaa111. Would you like to continue working on it?"

User: "Archive the old ones"

LLM: [Internal: User wants to archive completed sprints]

[Option 1: Archive specific sprints]
Invoke: archive-sprint(sprintId="sprint-14-bbb222")
Invoke: archive-sprint(sprintId="sprint-13-ccc333")

[Option 2: Batch archive - better]
Invoke: auto-archive-sprints(keepCount=1)

Response: {
  status: "success",
  archived: ["sprint-13-ccc333", "sprint-14-bbb222"],
  kept_active: ["sprint-15-aaa111"],
  knowledge_extracted: true
}

LLM to User:
"Archived 2 completed sprints:
- sprint-13-ccc333 → planning/archive/2026/
- sprint-14-bbb222 → planning/archive/2026/

Knowledge extracted: Lessons and patterns from these sprints have been added to planning/knowledge/knowledge-base.yaml.

Active sprint sprint-15-aaa111 remains in planning/active/. Ready to continue working on it?"
```

---

### Example 4: Recovery from Index Corruption

**Conversation**:

```
User: "The sprint status looks wrong"

LLM: [Internal: Check status]
Invoke: check-sprint-status()

Response: {
  status: "error",
  error: "Sprint index corrupted or out of sync"
}

LLM to User:
"It looks like the sprint index is corrupted. I can rebuild it from the sprint manifests.

This will:
- Scan all sprint directories
- Rebuild planning/sprint-index.yaml from manifests
- Verify consistency

Would you like me to regenerate the sprint index?"

User: "Yes"

LLM: [Internal: Regenerate index]
Invoke: regenerate-sprint-index(repair=false)

Response: {
  status: "success",
  sprints_found: 15,
  index_rebuilt: true
}

LLM to User:
"Sprint index successfully regenerated! ✅

Found 15 sprints and rebuilt the index. Try checking your sprint status again."

[User likely repeats original request]
```

---

## Summary: Key Takeaways for LLM Agents

### Critical Rules (MUST FOLLOW)

1. ✅ **ALWAYS** invoke `check-sprint-status()` before `start-sprint()` (Rule S3)
2. ✅ **NEVER** start sprint unless user explicitly says "Start sprint" (Rule S1)
3. ✅ **NEVER** bypass Protocol Rules S1-S14
4. ✅ **ALWAYS** generate quality metadata (concise title, specific goal)
5. ✅ **ALWAYS** handle errors gracefully and guide user to recovery
6. ✅ **ALWAYS** translate technical responses into human-friendly guidance
7. ✅ **ALWAYS** provide next-step guidance after tool invocations

### Best Practices

- 🎯 Understand user intent before tool selection
- 🎯 Use decision trees for common requests
- 🎯 Prefer `complete-sprint` over manual `update-sprint-status`
- 🎯 Explain tool outputs in human terms
- 🎯 Offer recovery options when errors occur
- 🎯 Keep users informed throughout sprint lifecycle

### Common Pitfalls to Avoid

- ❌ Starting sprint without checking status first
- ❌ Generating vague titles or goals
- ❌ Silently failing on errors
- ❌ Dumping raw JSON to users
- ❌ Bypassing protocol rules
- ❌ Not providing next-step guidance

---

**Remember**: You are the PRIMARY INTERFACE between humans and the Sprint Protocol. Your effective use of these tools directly determines user success. Use this guide as your operational reference for all sprint-mcp interactions.

---

**Document Version**: 1.0
**Sprint**: sprint-21-0oh8mw
**Task**: P1-T17
**Last Updated**: 2026-08-12
**Status**: Complete
