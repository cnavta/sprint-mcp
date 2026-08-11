# Technical Architecture: MCP Tool Response Optimization Analysis

**Sprint**: sprint-18-y4v2xi
**Date**: 2026-08-11
**Author**: Architect Role (LLM Agent)
**Purpose**: Evaluate sprint-mcp tool responses and provide optimization recommendations to aid agents in navigating the Sprint Protocol

---

## Executive Summary

This document analyzes the response formats of all 8 sprint-mcp MCP tools, evaluating how effectively they guide LLM agents through the Sprint Protocol defined in AGENTS-uncompressed.md. The analysis identifies strengths, weaknesses, and provides specific recommendations for improving agent guidance at each protocol step.

**Key Findings:**
- Tools provide comprehensive information but vary significantly in clarity of next-step guidance
- Protocol rule references (S1, S3, §2.9) are inconsistently applied across tools
- Visual hierarchy (emojis, markdown) aids agent parsing but creates potential token overhead
- Critical path guidance is strong in start-sprint and complete-sprint, weaker in intermediate tools
- Hook system feedback is well-structured but could benefit from clearer failure recovery paths

---

## 1. Tool-by-Tool Analysis

### 1.1 check-sprint-status

**Protocol Phase**: Pre-Sprint Initialization (Rule S3 verification)

**Current Response Structure:**
```
⚠️  Found N active sprint(s):
- **sprint-id**: Title
  Status: status
  Goal: goal
  Owner: owner
  Branch: branch
  Location: 📦 worktree (unified model)
  Manifest: path
  Worktree: path/status

ℹ️  Cannot start a new sprint while sprint X is active. Complete it first or force-complete it.

📊 Completed sprints: N

⚠️  Orphaned worktrees detected (N): ...

---
**Configuration Diagnostics**:
- SPRINT_ROOT environment variable: ✅ SET
- SPRINT_ROOT value: path
- Resolved project root: path
- Planning directory: path
- Sprint index path: path
```

**Strengths:**
- Clearly identifies active sprint conflicts (Rule S3)
- Provides explicit next-step guidance ("Complete it first or force-complete it")
- Includes SPRINT_ROOT diagnostics for troubleshooting
- Distinguishes between worktree and main-repo locations
- Warns about orphaned worktrees

**Weaknesses:**
- Orphaned worktree guidance is informational but doesn't prompt action
- No direct link to cleanup-sprint tool for orphaned worktrees
- Configuration diagnostics always shown (high token cost for clean systems)
- Missing protocol rule reference (should cite S3 explicitly in conflict message)

**Protocol Intent Coverage:**
- ✅ Rule S3: "Only one sprint may be active at a time" - GOOD
- ✅ Pre-start validation - GOOD
- ⚠️ Post-completion cleanup guidance - WEAK

**Recommendations:**

1. **Add explicit protocol rule citations:**
   ```
   ⚠️  Cannot start a new sprint while sprint-17-kpc4ki is active.

   **Sprint Protocol Rule S3**: Only one sprint may be active at a time.

   **Next Actions**:
   1. Complete sprint-17-kpc4ki: Use complete-sprint tool with completionMode: 'normal'
   2. Force-complete if needed: Use complete-sprint tool with completionMode: 'forced'
   3. Then retry start-sprint
   ```

2. **Optimize configuration diagnostics visibility:**
   - Only show diagnostics when SPRINT_ROOT is not set or issues detected
   - Add `--verbose` flag concept for full diagnostics
   - Reduces token overhead for 90% of successful checks

3. **Convert orphaned worktree warnings to actionable guidance:**
   ```
   ⚠️  Orphaned worktrees detected (9):
   [list]

   **Recommended Action**:
   Clean up orphaned worktrees to free disk space:
   `cleanup-sprint` (shows candidates and disk usage)
   ```

4. **Add success path clarity:**
   ```
   ✅ No active sprints. Ready to start a new sprint.

   **Next Step**: Use start-sprint tool with title, goal, and owner.
   ```

---

### 1.2 start-sprint

**Protocol Phase**: Sprint Initialization (§2.2)

**Current Response Structure:**
```
✅ Sprint sprint-18-y4v2xi initialized successfully (unified worktree model)!

**Sprint Details**: [id, title, goal, owner, status, worktree, branch]
[Hook output if applicable]

**Sprint Artifacts Location** (in worktree, on feature branch): [paths]

**Next Steps**:
1. ⚠️  **IMPORTANT**: Change to sprint worktree: `cd .worktrees/sprint-18-y4v2xi/`
2. [Setup step with hook status]
3. Verify branch: `git branch --show-current`
4. Create implementation-plan.md in `planning/sprint-18-y4v2xi/`
5. Get user approval for the plan before implementing
6. Update sprint status to 'in-progress' when ready

**CRITICAL - Unified Worktree Model**:
⚠️  **DO NOT leave the worktree directory during sprint work**
✅ All code changes AND planning artifacts are created in .worktrees/sprint-18-y4v2xi/
✅ Use relative paths: `src/...` for code, `planning/sprint-18-y4v2xi/...` for planning
✅ Commit captures both code and planning together
✅ PR will merge both code and planning artifacts to main

After PR merge, planning artifacts will be in main repo at: planning/active/sprint-18-y4v2xi/

[Validation status]
**Index**: planning/sprint-index.yaml updated

Sprint Protocol rule S1 satisfied: Sprint started on explicit user request.
```

**Strengths:**
- Extremely comprehensive next-step guidance
- Clear protocol rule citation (S1)
- Emphasizes critical unified worktree model with visual hierarchy
- Hook execution feedback integrated
- Distinguishes between automated and manual setup paths
- Provides both immediate and future context (post-PR-merge)

**Weaknesses:**
- Extremely verbose (high token cost)
- Repeats unified worktree model guidance that could be in protocol docs
- No clear transition to next protocol phase (Planning §2.4)
- Missing link to backlog.yaml creation requirement
- Hook failure guidance is present but could be more actionable

**Protocol Intent Coverage:**
- ✅ §2.2: Sprint Start - EXCELLENT
- ✅ Rule S1: Explicit user request - GOOD
- ✅ §2.2.1: Agent Working Directory Discipline - EXCELLENT
- ⚠️ §2.4: Planning Phase gate - WEAK
- ❌ §2.3.1: Backlog requirement - MISSING

**Recommendations:**

1. **Add Planning Phase gate guidance:**
   ```
   **Next Protocol Phase**: Planning (§2.4)

   **CRITICAL**: NO coding until implementation-plan.md is explicitly approved by user.

   Required artifacts before implementation:
   1. implementation-plan.md (detailed execution plan)
   2. backlog.yaml (accountability contract with acceptance criteria)
   3. User approval of both artifacts

   **Planning Phase Gate**: After creating these artifacts, request explicit user approval
   before proceeding to implementation.
   ```

2. **Condense unified worktree model guidance:**
   - Move detailed explanation to protocol docs
   - Keep only critical reminders in tool response
   - Reduces token cost by ~30%

3. **Stratify response detail levels:**
   - **Essential**: Next immediate action, protocol phase, critical warnings
   - **Standard**: Current state, setup status, artifact locations
   - **Detailed**: Full worktree model explanation, post-merge context
   - Allow agents to request detail level or auto-select based on context

4. **Improve hook failure actionability:**
   ```
   ⚠️  post-worktree-create hook failed (non-blocking)

   **Error**: [stderr]

   **Impact**: Dependencies may not be installed, build may not have run

   **Recovery Action**: Manually run setup in worktree:
   ```bash
   cd .worktrees/sprint-18-y4v2xi
   npm ci && npm run build
   ```

   **Note**: Hook failure does not prevent sprint creation. Fix hook for future sprints.
   ```

---

### 1.3 update-sprint-status

**Protocol Phase**: Status Transition (multiple phases)

**Current Response Structure:**
```
✅ Sprint sprint-18-y4v2xi status updated successfully!

**Updated Fields**:
- Status: in-progress
- [Other fields if updated]

**Files Updated**:
- path/sprint-manifest.yaml (authoritative)
- planning/sprint-index.yaml (derived cache)

**Index Validation**:
✅ All checks passed
```

**Strengths:**
- Clear distinction between authoritative and derived files
- Validation feedback included
- Atomic update model communicated
- Hook execution happens transparently (blocking/non-blocking)

**Weaknesses:**
- No protocol phase context for status transitions
- Missing guidance on what comes next for each status
- No indication of which protocol gates have been satisfied/remain
- Hook failures communicated but recovery guidance minimal
- No backlog alignment reminder

**Protocol Intent Coverage:**
- ✅ Atomic update model - GOOD
- ⚠️ Protocol phase transitions - WEAK
- ❌ Gate satisfaction indicators - MISSING
- ❌ Next-step guidance per status - MISSING

**Recommendations:**

1. **Add protocol phase context per status:**
   ```
   ✅ Sprint sprint-18-y4v2xi status updated: planning → in-progress

   **Protocol Phase**: Execution (§2.5)

   **What this means**:
   - Planning phase complete (implementation-plan.md approved)
   - Active implementation authorized
   - Intentional commit protocol now applies (§2.5.1)

   **Gates Satisfied**:
   ✅ Human approval of execution plan (§2.4)
   ✅ Backlog.yaml created with acceptance criteria (§2.3.1)

   **Next Phase**: Validation (§2.6)
   **Next Gates**:
   - Create validate_deliverable.sh (real, executable)
   - Ensure tests pass
   - Update backlog items to 'done' with evidence
   ```

2. **Add status-specific next actions:**
   ```
   **Recommended Next Actions** (status: in-progress):
   1. Implement approved backlog items
   2. Commit after each coherent work unit (§2.5.1)
   3. Update backlog.yaml as items progress
   4. Run validation script periodically
   ```

3. **Improve hook failure guidance:**
   ```
   ⚠️  on-status-change hook (PRE phase) blocked status update

   **Status Transition Blocked**: planning → in-progress

   **Hook Error**:
   [stderr]

   **Why This Blocked**:
   PRE-phase hooks are BLOCKING (§2.2.2). The hook detected issues that must
   be resolved before transitioning to in-progress status.

   **Resolution Path**:
   1. Review hook error above
   2. Fix reported issues
   3. Retry update-sprint-status

   **Hook Location**: .sprint-hooks/on-status-change
   ```

4. **Add backlog alignment reminder:**
   ```
   **Backlog Reminder** (§2.3.1):
   Remember to update backlog.yaml item status as work progresses.
   Backlog is the accountability contract and must reflect current state.
   ```

---

### 1.4 complete-sprint

**Protocol Phase**: Sprint Completion (§2.9)

**Current Response Structure:**
```
✅ Sprint sprint-18-y4v2xi completed successfully!

**Completion Details**:
- Completion Mode: normal
- Completed At: timestamp
- Pull Request: url (if provided)

**Validated Artifacts**:
✅ verification-report.md
✅ retro.md
✅ key-learnings.md
✅ publication.yaml

**Warnings**: [if forced mode]

**Next Steps**:
1. Review completion artifacts in planning/sprint-18-y4v2xi/
2. Create Pull Request if desired (human-owned per Protocol S14)
3. Optionally clean up worktree: `git worktree remove .worktrees/sprint-18-y4v2xi`
4. Start next sprint when ready

**Sprint Protocol Compliance**:
✅ Rule S2: Sprint completion with required artifacts validated
✅ §2.9: Sprint completion packet requirements satisfied
```

**Strengths:**
- Clear artifact validation feedback
- Explicit protocol rule citations (S2, S14, §2.9)
- Distinguishes normal vs forced completion modes
- Provides post-completion workflow guidance
- Emphasizes human ownership of PR creation

**Weaknesses:**
- No explicit learning artifacts reminder (retro/key-learnings purpose)
- Missing knowledge extraction system mention (if archive enabled)
- Worktree cleanup is "optional" but doesn't explain when/why
- No guidance on archive workflow (completed → active → archive)
- Publication.yaml validation but no content validation

**Protocol Intent Coverage:**
- ✅ Rule S2: Sprint completion - EXCELLENT
- ✅ §2.9: Completion artifacts - EXCELLENT
- ✅ Rule S14: PR ownership - GOOD
- ⚠️ §2.9.1: Learning artifacts purpose - WEAK
- ❌ Archive system workflow - MISSING

**Recommendations:**

1. **Add learning artifacts purpose guidance:**
   ```
   **Validated Artifacts**:
   ✅ verification-report.md - Backlog reconciliation (completed/partial/deferred)
   ✅ retro.md - Observations, partnership review, follow-up candidates (§2.9.1)
   ✅ key-learnings.md - Reusable lessons for future sprints (§2.9.1)
   ✅ publication.yaml - PR and branch metadata

   **Purpose of Learning Artifacts**:
   These artifacts enable knowledge extraction when sprints are archived.
   They feed the knowledge base (planning/knowledge/knowledge-base.yaml) to
   improve future sprint execution.
   ```

2. **Add archive workflow context:**
   ```
   **Post-Completion Workflow**:

   Sprint is now in 'complete' status. After PR merge, sprint artifacts will move
   to planning/active/sprint-18-y4v2xi/ (if archive system enabled).

   **Optional Future Actions**:
   1. After PR merge: Archive sprint to free active/ space
      - `archive-sprint sprint-18-y4v2xi` (moves to planning/archive/2026/)
      - Triggers knowledge extraction if configured
   2. After archival: Clean up worktree
      - `cleanup-sprint sprint-18-y4v2xi` (removes .worktrees/sprint-18-y4v2xi/)
   ```

3. **Improve worktree cleanup guidance:**
   ```
   **Worktree Cleanup**:

   When to clean up:
   - **Now**: If sprint was force-completed or cancelled (no PR)
   - **After PR merge**: If PR was created and merged to main
   - **Never**: If you need to reference code in worktree

   Command: `git worktree remove .worktrees/sprint-18-y4v2xi`
   or use: `cleanup-sprint sprint-18-y4v2xi` (checks for uncommitted changes)
   ```

4. **Add forced completion context:**
   ```
   **Completion Mode**: forced

   **What 'forced' means**:
   Sprint was completed despite missing/failing artifacts or validation errors.
   Per §2.10, forced completion is allowed when failures are documented in
   verification-report.md and retro.md.

   **Missing Artifacts**:
   ❌ verification-report.md

   **Impact**:
   This sprint's outcomes are not fully validated. Gaps should be addressed in
   follow-up sprints.
   ```

---

### 1.5 cleanup-sprint

**Protocol Phase**: Post-Completion Maintenance

**Current Response Structure:**
```
🧹 Sprint Cleanup

Found N completed sprint(s) with worktrees:
[List with size, status, uncommitted changes warnings]

**Total disk space to be freed:** ~size

⚠️  **WARNING:** This will permanently remove the worktrees listed above.
Sprint planning artifacts in planning/sprint-X/ will be **preserved**.

**What will be deleted**:
✗ Git worktree in .worktrees/sprint-X/

**What will be preserved**:
✓ Sprint planning artifacts in planning/sprint-X/
✓ Sprint index entry

**To proceed with cleanup**, call this tool again with a confirmation parameter,
or use the npm script: `npm run sprint:cleanup -- --yes`
```

**Strengths:**
- Clear preview/confirmation flow
- Explicit preservation vs deletion distinction
- Disk space calculation
- Uncommitted changes detection and blocking
- Hook integration (pre-worktree-remove)

**Weaknesses:**
- No protocol phase context (when is cleanup appropriate?)
- Missing relationship to sprint lifecycle (complete → archive → cleanup)
- npm script reference may not be MCP-accessible
- No guidance on recovering from hook failures
- Confirmation flow requires "calling tool again" - unclear for agents

**Protocol Intent Coverage:**
- ✅ Safe deletion with preview - EXCELLENT
- ⚠️ Sprint lifecycle context - WEAK
- ❌ Hook failure recovery - MISSING

**Recommendations:**

1. **Add sprint lifecycle context:**
   ```
   🧹 Sprint Cleanup (Post-Completion Maintenance)

   **When to clean up worktrees**:
   Per §2.9, after sprint completion and PR merge, worktrees can be removed to
   free disk space while preserving sprint planning artifacts.

   **Recommended workflow**:
   1. Complete sprint (status: 'complete')
   2. Create and merge PR
   3. Archive sprint (optional, moves to planning/archive/YYYY/)
   4. Clean up worktree ← YOU ARE HERE
   ```

2. **Clarify confirmation flow for MCP agents:**
   ```
   **To proceed with cleanup**:

   This is a preview mode. Cleanup will NOT execute until you confirm.

   **For MCP agents**: Re-call this tool with the same arguments (the tool will
   detect this is a second call and execute cleanup)

   **For humans**: Run `npm run sprint:cleanup -- --yes`
   ```

3. **Add hook failure recovery guidance:**
   ```
   ⚠️  pre-worktree-remove hook failed for sprint-18-y4v2xi

   **Hook Error**: [stderr]

   **What this means**:
   PRE-phase hooks are BLOCKING (§2.2.2). The hook detected uncommitted changes
   or other issues that should be resolved before removing the worktree.

   **Recovery Options**:
   1. Review worktree state: `cd .worktrees/sprint-18-y4v2xi && git status`
   2. Commit or stash changes if desired
   3. Retry cleanup
   4. Or use force=true to cleanup anyway (changes will be LOST)
   ```

4. **Improve disk space presentation:**
   ```
   **Cleanup Impact**:
   - Worktrees to remove: 9
   - Total disk space: ~245 MB
   - Per sprint average: ~27 MB
   - Planning artifacts preserved: 9 directories (~2 MB)
   ```

---

### 1.6 archive-sprint

**Protocol Phase**: Post-Completion Knowledge Management

**Current Response Structure:**
```
✅ Sprint sprint-12-sdwpw0 archived successfully!

**Archive Details**:
- Sprint: sprint-12-sdwpw0
- Archive Year: 2026
- Location: planning/archive/2026/sprint-12-sdwpw0
- Index Path: planning/archive/2026/sprint-12-sdwpw0/sprint-manifest.yaml

**Completed Operations**:
✅ Created archive year directory
✅ Moved sprint from active/ to archive/2026/
✅ Updated sprint-index.yaml
✅ Extracted knowledge: N lessons, N patterns, N anti-patterns

**Sprint is now archived**:
- No longer appears in check-sprint-status (active sprints only)
- Still included in sprint-index.yaml for history
- Still regenerated when running sprint:index:regenerate

**Next Steps**:
1. Review archived sprint: planning/archive/2026/sprint-12-sdwpw0
2. Optionally clean up worktree: `git worktree remove .worktrees/sprint-12-sdwpw0`
3. Archive older sprints as needed
```

**Strengths:**
- Clear archive location and year-based organization
- Knowledge extraction feedback
- Dry-run support well-explained
- Hook integration (pre-archive, post-archive)
- Index update confirmation

**Weaknesses:**
- No explanation of knowledge base purpose or location
- Missing auto-archive system mention
- No guidance on when to archive vs when to keep in active/
- Hook failure recovery minimal
- Deduplication and aggregation not explained

**Protocol Intent Coverage:**
- ✅ Archive mechanics - GOOD
- ⚠️ Knowledge extraction purpose - WEAK
- ❌ Archive strategy guidance - MISSING
- ❌ Knowledge base usage - MISSING

**Recommendations:**

1. **Add knowledge system context:**
   ```
   ✅ Extracted knowledge: 12 lessons, 5 patterns, 3 anti-patterns

   **Knowledge Base Integration**:
   Extracted knowledge has been aggregated into:
   planning/knowledge/knowledge-base.yaml

   **Purpose**:
   The knowledge base accumulates lessons across all archived sprints,
   deduplicates similar lessons (tracking frequency), and provides a
   searchable repository of project-wide learnings.

   **Usage**:
   Review knowledge base before starting new sprints to leverage past lessons
   and avoid repeating mistakes.
   ```

2. **Add archive strategy guidance:**
   ```
   **When to Archive Sprints**:

   Archive completed sprints when:
   - Sprint is no longer actively referenced (old enough to declutter active/)
   - You want to trigger knowledge extraction
   - Following auto-archive policy (see archive-config.yaml)

   **Archive Configuration** (archive-config.yaml):
   Current policy: Hybrid (must meet BOTH criteria)
   - Age: > 30 days old
   - Count: Keep 10 most recent in active/

   **Alternative**: Use auto-archive-sprints to batch-archive eligible sprints
   ```

3. **Improve dry-run clarity:**
   ```
   🔍 Dry-run: Archive preview for sprint-12-sdwpw0

   **This is a preview**. No changes will be made.

   [Preview details]

   **To execute archival**:
   Re-call archive-sprint with same sprintId but dryRun: false (or omit dryRun)
   ```

4. **Add hook failure context:**
   ```
   ❌ Archival blocked by pre-archive hook

   **Sprint**: sprint-12-sdwpw0

   **Hook Error**: [stderr]

   **Why This Blocked**:
   PRE-phase hooks are BLOCKING (§2.2.2). The hook validates sprint completeness
   before archival. Common checks:
   - All required artifacts present
   - No uncommitted changes in worktree
   - Tests passing

   **Resolution**:
   1. Review hook error above
   2. Fix reported issues (e.g., create missing artifacts)
   3. Retry archive-sprint

   **Hook Location**: .sprint-hooks/pre-archive
   ```

---

### 1.7 auto-archive-sprints

**Protocol Phase**: Automated Post-Completion Maintenance

**Current Response Structure:**
```
✅ Auto-archive complete!

**Summary**:
- Eligible sprints: N
- Successfully archived: N
- Skipped: N
- Failed: N

**Criteria Applied**: hybrid
- Age threshold: > 30 days
- Count threshold: Keep 10 most recent

**Archived Sprints**:
[List of archived sprint IDs with years]

**Skipped Sprints**:
[List with reasons]

**Next Steps**:
- Review archive: planning/archive/
- Clean up worktrees: cleanup-sprint
```

**Strengths:**
- Clear criteria explanation
- Success/skip/fail breakdown
- Configurable thresholds
- Dry-run support

**Weaknesses:**
- No knowledge base aggregation summary (how many total lessons extracted?)
- Missing archive-config.yaml location/modification guidance
- No suggestion to run cleanup-sprint on archived sprints
- Criteria explanation could be clearer for agents (intersection vs union)

**Protocol Intent Coverage:**
- ✅ Batch archival mechanics - GOOD
- ⚠️ Criteria clarity - MODERATE
- ❌ Knowledge aggregation summary - MISSING

**Recommendations:**

1. **Improve criteria explanation for agents:**
   ```
   **Criteria Applied**: hybrid (must meet BOTH age AND count)

   Hybrid criteria = intersection of age and count:
   - Sprint must be > 30 days old (age criteria)
   - AND outside the 10 most recent (count criteria)

   **Why hybrid?**
   Prevents archiving very recent sprints even if many exist,
   and prevents archiving sprints that aren't old enough even if count exceeded.

   **Alternative criteria**:
   - age: Archive all sprints > N days old (regardless of count)
   - count: Keep N most recent, archive rest (regardless of age)
   ```

2. **Add knowledge aggregation summary:**
   ```
   ✅ Auto-archive complete!

   **Summary**:
   - Successfully archived: 5 sprints
   - Knowledge extracted: 23 lessons, 8 patterns, 6 anti-patterns
   - Knowledge base updated: planning/knowledge/knowledge-base.yaml

   **Deduplication**:
   - New unique lessons: 15
   - Merged with existing: 8 (frequency tracking updated)
   ```

3. **Add configuration modification guidance:**
   ```
   **Current Configuration** (archive-config.yaml):
   - Criteria: hybrid
   - Age threshold: 30 days
   - Keep count: 10 sprints

   **To modify thresholds**:
   Edit planning/archive-config.yaml:
   ```yaml
   archive:
     autoArchive:
       criteria: hybrid  # or 'age' or 'count'
       ageDays: 60      # increase/decrease age threshold
       keepCount: 15    # increase/decrease keep count
   ```
   ```

4. **Add cleanup workflow integration:**
   ```
   **Next Steps**:
   1. Review archived sprints: planning/archive/2026/
   2. Review aggregated knowledge: planning/knowledge/knowledge-base.yaml
   3. Clean up worktrees for archived sprints:
      `cleanup-sprint` (will show 5 eligible worktrees, ~135 MB recoverable)
   ```

---

### 1.8 regenerate-sprint-index

**Protocol Phase**: Index Recovery/Maintenance

**Current Response Structure** (Concise Mode):
```
✅ Sprint index regenerated successfully

18 total (1 active, 17 completed)

**Active:**
→ sprint-18-y4v2xi: MCP Tool Response Optimization Analysis (in-progress)
```

**Current Response Structure** (Detailed Mode):
```
✅ Sprint index regenerated successfully!

**Summary**:
- Total sprints: 18
- Active sprints: 1
- Completed sprints: 17
- Repaired directories: 0
- Skipped directories: 5
- Generated at: timestamp

**Sprints in index**: [full list for <= 20 sprints]

**Statistics**:
- By status: [counts]
- By completion mode: [counts]
- Average sprint duration: PT6H

**Validation**:
✅ All validation checks passed
```

**Strengths:**
- Adaptive output (concise vs detailed based on context)
- Clear repair mode support
- Validation integration
- Statistics provide useful insights
- Handles large indexes gracefully (shows summary instead of full list)

**Weaknesses:**
- No explanation of when/why to regenerate
- Missing relationship to manifest corruption scenarios
- Skipped directories not explained (are they test artifacts? Incomplete sprints?)
- No guidance on what to do with validation errors
- Repair mode consequences not clearly explained

**Protocol Intent Coverage:**
- ✅ Index regeneration mechanics - EXCELLENT
- ⚠️ Recovery scenario guidance - WEAK
- ❌ Validation error remediation - MISSING

**Recommendations:**

1. **Add when/why guidance:**
   ```
   ✅ Sprint index regenerated successfully

   **Purpose of Index Regeneration**:
   The sprint index (planning/sprint-index.yaml) is a derived cache of sprint
   metadata. Regenerate when:
   - Index becomes corrupted or out of sync with manifests
   - After manual manifest edits
   - Test artifacts pollute index
   - Validation errors detected

   **Source of Truth**:
   Individual sprint manifests (sprint-manifest.yaml) are authoritative.
   Index is computed from manifests and can always be safely regenerated.
   ```

2. **Improve validation error remediation:**
   ```
   **Validation**:
   ❌ Validation failed (3 errors, 2 warnings)

   **Errors**:
   ❌ **MANIFEST_MISMATCH**: Sprint sprint-15-dq6cg7 manifest path in index
      does not match actual location
      Sprint: sprint-15-dq6cg7

   **Remediation**:
   Most validation errors are automatically fixed by regenerating the index.

   **Action**: Run regenerate-sprint-index again to fix:
   - Manifest path mismatches (updates paths from filesystem scan)
   - Missing index entries (adds newly discovered manifests)
   - Stale entries (removes if manifest no longer exists)

   **Manual fixes required** for:
   - Corrupted manifest YAML (repair manifest file first)
   - Invalid status values (edit manifest to use valid status)
   ```

3. **Explain skipped directories:**
   ```
   **Summary**:
   - Total sprints: 18
   - Repaired directories: 0
   - ⚠️  Skipped directories: 5

   **Skipped Directories Explained**:
   5 directories in planning/ did not have sprint-manifest.yaml files:
   - May be test artifacts, incomplete sprints, or non-sprint directories
   - These are ignored during index generation

   **To investigate**:
   Review planning/ for unexpected directories. Non-sprint directories should
   be moved outside planning/ to avoid confusion.

   **To repair**:
   Use repair=true mode to auto-generate minimal manifests for sprint-like
   directories (sprint-N-hash pattern) that are missing manifests.
   ```

4. **Improve repair mode explanation:**
   ```
   **Repair Mode Enabled**:
   Created 3 minimal manifest(s) for sprint directories missing them:
   - sprint-10-t5kiid
   - sprint-11-giiaka
   - sprint-12-sdwpw0

   **What repair mode did**:
   - Detected sprint-like directories (sprint-N-hash pattern) without manifests
   - Created minimal manifests with default values:
     - title: "[Auto-generated] Sprint {number}"
     - status: "complete" (assumed for legacy sprints)
     - owner: "unknown"
     - goal: "Auto-generated manifest by repair mode"

   **IMPORTANT**: Review and update these auto-generated manifests with actual
   sprint details. They are placeholders to restore index consistency.

   **Next Action**: Edit manifests at:
   - planning/active/sprint-10-t5kiid/sprint-manifest.yaml
   - planning/active/sprint-11-giiaka/sprint-manifest.yaml
   - planning/active/sprint-12-sdwpw0/sprint-manifest.yaml
   ```

---

## 2. Cross-Cutting Analysis

### 2.1 Protocol Rule Citations

**Current State:**
- start-sprint: Cites S1 ✅
- check-sprint-status: Mentions S3 in warning but doesn't cite it explicitly ⚠️
- complete-sprint: Cites S2, S14, §2.9 ✅
- update-sprint-status: No protocol citations ❌
- Other tools: No protocol citations ❌

**Impact:**
Agents may not understand the protocol context for tool actions, reducing their ability to proactively validate protocol compliance before calling tools.

**Recommendation:**
Standardize protocol citation format across all tools:

```
**Sprint Protocol Compliance**:
✅ Rule S3: Only one sprint may be active at a time
✅ §2.2: Sprint start procedure followed
```

**Citation Strategy:**
- Pre-action citations: Rules being validated (e.g., S3 in check-sprint-status)
- Post-action citations: Rules satisfied (e.g., S1 in start-sprint result)
- Phase transitions: Section references (e.g., §2.4 → §2.5 transition)

---

### 2.2 Next-Step Guidance Quality

**Grading:**
- start-sprint: EXCELLENT (explicit numbered steps, protocol gates, warnings)
- complete-sprint: GOOD (clear post-completion workflow)
- check-sprint-status: GOOD (when active sprint detected)
- update-sprint-status: POOR (no next-step guidance)
- cleanup-sprint: GOOD (confirmation flow explained)
- archive-sprint: GOOD (review and cleanup steps)
- auto-archive-sprints: MODERATE (generic next steps)
- regenerate-sprint-index: POOR (no action guidance)

**Pattern:**
Tools at protocol transitions (start, complete) provide strong guidance.
Tools for intermediate operations (update-status, regenerate) provide weak guidance.

**Recommendation:**
Every tool response should include **Recommended Next Actions** section:

```
**Recommended Next Actions**:
1. [Immediate next step in current protocol phase]
2. [Validation or verification step]
3. [Optional follow-up or alternative path]

**Current Protocol Phase**: [phase name and section reference]
**Next Protocol Gate**: [what approval/artifact is required to proceed]
```

---

### 2.3 Visual Hierarchy and Token Efficiency

**Current Patterns:**
- Heavy use of emojis (✅ ❌ ⚠️ 📦 📁 🧹 🔍)
- Markdown formatting (**, -, numbered lists)
- Section headers (**Section Name:**)
- Inline code blocks (`command`)

**Token Analysis:**
- start-sprint: ~400 tokens (very verbose)
- check-sprint-status: ~300 tokens (with diagnostics)
- complete-sprint: ~250 tokens
- update-sprint-status: ~100 tokens (concise)
- regenerate-sprint-index: ~50 tokens (concise mode), ~500 tokens (detailed mode)

**Trade-offs:**
- **Pros**: Visual hierarchy aids agent parsing, emojis provide quick status scanning
- **Cons**: High token cost for comprehensive responses, potential emoji parsing issues

**Recommendation:**
Implement tiered response strategy:

1. **Minimal Mode** (--minimal flag or auto-detect for simple success):
   ```
   ✅ Sprint sprint-18-y4v2xi started
   Branch: feature/sprint-18-y4v2xi-...
   Next: cd .worktrees/sprint-18-y4v2xi && create implementation-plan.md
   ```

2. **Standard Mode** (default):
   Current format but trimmed:
   - Remove redundant explanations (unified worktree model details)
   - Condense diagnostics to errors/warnings only
   - Target: 30% token reduction

3. **Detailed Mode** (--verbose flag or error scenarios):
   Current format plus:
   - Full protocol context
   - Hook execution details
   - Recovery guidance
   - Examples

**Adaptive Selection:**
- Success + no warnings → Minimal
- Success + warnings or first-time-user → Standard
- Errors or complex scenarios → Detailed

---

### 2.4 Hook System Feedback

**Current State:**
All tools with hook integration report:
- Whether hook executed
- Hook exit code
- Hook stdout/stderr (if failed)
- Blocking vs non-blocking behavior

**Strengths:**
- Clear distinction between blocking (PRE) and non-blocking (POST) hooks
- Hook failure doesn't break tool execution flow
- Stdout captured for successful hooks

**Weaknesses:**
- No guidance on debugging hooks
- No indication of which hooks are available/configured
- Hook failure recovery paths minimal
- No suggestion to check .sprint-hooks/ directory

**Recommendation:**

1. **Add hook discovery to check-sprint-status:**
   ```
   **Sprint Lifecycle Hooks**:
   ✅ post-worktree-create (found, executable)
   ✅ on-status-change (found, executable)
   ❌ pre-worktree-remove (not found)
   ❌ pre-archive (not found)
   ❌ post-archive (not found)

   **Hook Directory**: .sprint-hooks/
   **Examples**: examples/sprint-hooks/
   ```

2. **Standardize hook failure messaging:**
   ```
   [BLOCKING HOOK FAILED] pre-worktree-remove

   **Impact**: Worktree cleanup aborted

   **Hook Error**:
   ```
   [stderr from hook]
   ```

   **Debugging**:
   1. Test hook manually:
      ```bash
      cd .worktrees/sprint-18-y4v2xi
      SPRINT_ID="sprint-18-y4v2xi" \
      SPRINT_WORKTREE="$(pwd)" \
      .sprint-hooks/pre-worktree-remove
      ```
   2. Review hook logic: .sprint-hooks/pre-worktree-remove
   3. Fix issues and retry

   **Hook System Reference**: AGENTS-uncompressed.md §2.2.2
   ```

---

### 2.5 Error vs Warning vs Info Clarity

**Current Categorization:**
- ✅ (green check): Success, completion, validation passed
- ❌ (red X): Error, validation failed, operation blocked
- ⚠️ (warning triangle): Warning, non-blocking issue, attention needed
- ℹ️ (info): Informational, guidance, next steps

**Issues:**
- Some warnings should be errors (uncommitted changes in cleanup)
- Some info should be warnings (orphaned worktrees)
- No severity indication (is this warning critical or minor?)

**Recommendation:**

1. **Add severity levels for warnings:**
   ```
   ⚠️  **WARNING (HIGH)**: Uncommitted changes detected
   This will BLOCK cleanup unless force=true

   ⚠️  **WARNING (LOW)**: Validation skipped (no validate_deliverable.sh)
   Sprint can still complete but validation is not performed
   ```

2. **Standardize error escalation:**
   - **Info (ℹ️)**: Guidance, next steps, optional actions
   - **Warning (⚠️)**: Non-blocking issues, should be addressed
   - **Error (❌)**: Blocking issues, must be resolved
   - **Critical (🔴)**: Data loss risk, irreversible actions

3. **Add "recoverable" indicators:**
   ```
   ❌ Cannot archive sprint sprint-18-y4v2xi [RECOVERABLE]

   **Validation Errors**:
   - Sprint status is 'in-progress', must be 'complete'

   **Recovery Path**:
   Complete the sprint first: complete-sprint sprint-18-y4v2xi
   ```

---

### 2.6 Backlog Integration Reminders

**Current State:**
Only complete-sprint validates artifacts (verification-report.md which should contain backlog reconciliation). No other tools mention backlog.yaml.

**Protocol Requirements** (§2.3.1):
- Backlog is the accountability contract
- Must be updated as state changes occur (not just at verification)
- Status transitions should align with backlog item state

**Impact:**
Agents may forget to maintain backlog.yaml during execution phase, leading to stale accountability records.

**Recommendation:**

1. **Add backlog reminder to update-sprint-status:**
   ```
   ✅ Sprint status updated: planning → in-progress

   **Backlog Reminder** (§2.3.1):
   Update backlog.yaml as work progresses:
   - Mark items as 'in-progress' when starting
   - Add acceptance evidence when completing
   - Update timestamps and history

   Backlog is the accountability contract and must reflect current state.
   ```

2. **Add backlog validation to complete-sprint:**
   ```
   **Validated Artifacts**:
   ✅ verification-report.md (contains backlog reconciliation)

   **Backlog Validation** (§2.3.1):
   - All 'done' items have acceptance evidence
   - All 'blocked' items have blocker reason
   - All 'deferred'/'cancelled' items link to human approval
   - All items have updated_at timestamps
   ```

3. **Add backlog creation to start-sprint:**
   ```
   **Required Planning Artifacts** (§2.4):
   1. implementation-plan.md
   2. backlog.yaml - Accountability contract with:
      - Atomic backlog items with acceptance criteria
      - Priority (P0/P1/P2/P3)
      - Owner (partnership/human/llm)
      - Dependencies
      - Approval status
   ```

---

## 3. Architectural Recommendations

### 3.1 Response Composition System

**Problem:**
Each tool constructs responses ad-hoc, leading to inconsistent formatting, missing protocol citations, and duplicate code.

**Recommendation:**
Create a **Response Composer** utility with standardized sections:

```typescript
interface ToolResponse {
  status: 'success' | 'error' | 'warning';
  title: string;
  protocolCompliance?: ProtocolCitation[];
  details?: Record<string, string>;
  artifacts?: ArtifactCheck[];
  warnings?: Warning[];
  errors?: Error[];
  nextActions?: NextAction[];
  protocolPhase?: ProtocolPhase;
  metadata?: Record<string, unknown>;
}

interface ProtocolCitation {
  rule: string; // 'S1', 'S3', '§2.9'
  description: string;
  satisfied: boolean;
}

interface NextAction {
  order: number;
  description: string;
  required: boolean;
  protocolGate?: boolean;
}

interface ProtocolPhase {
  current: string; // 'Planning', 'Execution', 'Validation'
  section: string; // '§2.4', '§2.5', '§2.6'
  nextPhase?: string;
  nextGate?: string;
}
```

**Benefits:**
- Consistent formatting across all tools
- Automatic protocol citation inclusion
- Token-efficient rendering options (minimal/standard/detailed)
- Easier testing and validation
- Simplified localization (if needed in future)

---

### 3.2 Protocol Phase State Machine

**Problem:**
Tools don't clearly communicate protocol phase transitions, making it hard for agents to understand where they are in the sprint lifecycle.

**Recommendation:**
Implement a **Protocol Phase Tracker** that:

1. Maps sprint status to protocol phases
2. Identifies current phase and next gates
3. Validates phase transitions
4. Provides context-aware next actions

```typescript
const PHASE_MAP = {
  planning: {
    section: '§2.4',
    name: 'Planning Phase',
    gates: [
      'implementation-plan.md created',
      'backlog.yaml created',
      'User approval received'
    ],
    nextPhase: 'in-progress'
  },
  'in-progress': {
    section: '§2.5',
    name: 'Execution Phase',
    gates: [
      'All backlog items done/deferred',
      'Intentional commits created',
      'Tests passing'
    ],
    nextPhase: 'validating'
  },
  // ... etc
};

function getPhaseContext(status: SprintStatus): ProtocolPhase {
  const phase = PHASE_MAP[status];
  return {
    current: phase.name,
    section: phase.section,
    gates: phase.gates,
    nextPhase: phase.nextPhase,
    // Auto-generate next actions based on gates
  };
}
```

**Integration:**
Every status transition response includes phase context automatically.

---

### 3.3 Agent Guidance Levels

**Problem:**
Different agents (or the same agent in different contexts) need different levels of detail.

**Recommendation:**
Implement **Guidance Levels** system:

```typescript
enum GuidanceLevel {
  MINIMAL = 'minimal',    // Experienced agent, simple success case
  STANDARD = 'standard',  // Default, balanced detail
  DETAILED = 'detailed',  // New agent, error cases, complex scenarios
  PROTOCOL = 'protocol'   // Full protocol references and explanations
}

function selectGuidanceLevel(context: {
  isFirstSprint?: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  complexOperation: boolean;
  userPreference?: GuidanceLevel;
}): GuidanceLevel {
  if (context.userPreference) return context.userPreference;
  if (context.hasErrors || context.complexOperation) return GuidanceLevel.DETAILED;
  if (context.hasWarnings || context.isFirstSprint) return GuidanceLevel.STANDARD;
  return GuidanceLevel.MINIMAL;
}
```

**Adaptive Rendering:**
```typescript
function renderNextActions(actions: NextAction[], level: GuidanceLevel): string {
  switch (level) {
    case GuidanceLevel.MINIMAL:
      return actions[0].description; // Only first action
    case GuidanceLevel.STANDARD:
      return formatNumberedList(actions.filter(a => a.required));
    case GuidanceLevel.DETAILED:
      return formatNumberedList(actions) + protocolContext();
    case GuidanceLevel.PROTOCOL:
      return formatNumberedList(actions) + protocolContext() + examples();
  }
}
```

---

### 3.4 Knowledge Base Visibility

**Problem:**
Knowledge extraction happens during archive but agents are not prompted to review/use the knowledge base before starting new sprints.

**Recommendation:**

1. **Add knowledge base check to check-sprint-status:**
   ```
   ✅ No active sprints. Ready to start a new sprint.

   **Knowledge Base Available**:
   📚 planning/knowledge/knowledge-base.yaml
   - 47 lessons learned from past sprints
   - 18 successful patterns identified
   - 12 anti-patterns to avoid

   **Recommendation**:
   Review knowledge base before planning new sprint to leverage past learnings.
   ```

2. **Add knowledge prompt to start-sprint:**
   ```
   ✅ Sprint sprint-19-abc123 initialized successfully!

   **Before Planning**:
   Consider reviewing knowledge base (planning/knowledge/knowledge-base.yaml)
   for lessons relevant to: [goal keywords]

   Relevant lessons (auto-matched by keywords):
   - LEARN-042: Always validate input before processing (confidence: high, frequency: 5)
   - PATTERN-015: Use hooks for environment setup (confidence: high)
   ```

---

### 3.5 Validation Rule Registry

**Problem:**
Validation logic is scattered across tools (complete-sprint validates artifacts, update-sprint-status validates status values, etc.). No centralized validation rules.

**Recommendation:**
Create **Validation Rule Registry**:

```typescript
interface ValidationRule {
  id: string;
  category: 'artifact' | 'status' | 'protocol' | 'data';
  severity: 'error' | 'warning' | 'info';
  validate: (context: any) => ValidationResult;
  remediation: string;
  protocolReference?: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'ARTIFACT_VERIFICATION_REPORT',
    category: 'artifact',
    severity: 'error',
    validate: (sprintDir) => checkFileExists(join(sprintDir, 'verification-report.md')),
    remediation: 'Create verification-report.md with backlog reconciliation (§2.7)',
    protocolReference: '§2.9'
  },
  {
    id: 'STATUS_TRANSITION_VALID',
    category: 'status',
    severity: 'error',
    validate: (from, to) => isValidTransition(from, to),
    remediation: 'Invalid status transition. Review protocol phase sequence.',
    protocolReference: '§2.5'
  },
  // ... more rules
];
```

**Benefits:**
- Centralized validation logic
- Consistent error messages and remediation
- Easy to add new validation rules
- Protocol references automatically included
- Can be tested independently

---

## 4. Summary of Recommended Changes

### 4.1 High Priority (Immediate Impact)

1. **Add protocol citations to all tools** (check-sprint-status, update-sprint-status, archive-sprint, cleanup-sprint, regenerate-sprint-index)
   - Impact: Agents understand protocol context for every action
   - Effort: Low (template update)

2. **Add next-step guidance to update-sprint-status**
   - Impact: Agents know what to do after status transitions
   - Effort: Medium (requires phase mapping)

3. **Add backlog reminders to update-sprint-status and start-sprint**
   - Impact: Agents maintain accountability contract during execution
   - Effort: Low (text addition)

4. **Implement tiered response detail (minimal/standard/detailed)**
   - Impact: 30% token reduction in standard cases
   - Effort: High (requires refactoring)

5. **Improve hook failure recovery guidance**
   - Impact: Agents can debug and recover from hook failures
   - Effort: Medium (standardized template)

### 4.2 Medium Priority (Enhanced Agent Experience)

6. **Add protocol phase context to all status transitions**
   - Impact: Agents understand sprint lifecycle position
   - Effort: High (requires phase state machine)

7. **Add knowledge base visibility to check-sprint-status and start-sprint**
   - Impact: Agents leverage past learnings
   - Effort: Medium (knowledge base integration)

8. **Improve validation error remediation in regenerate-sprint-index**
   - Impact: Agents can self-recover from index corruption
   - Effort: Low (text addition)

9. **Add archive workflow context to complete-sprint**
   - Impact: Agents understand post-completion lifecycle
   - Effort: Low (text addition)

10. **Standardize warning severity levels**
    - Impact: Agents prioritize issues correctly
    - Effort: Medium (categorization work)

### 4.3 Long-Term (Architectural)

11. **Implement Response Composer utility**
    - Impact: Consistent formatting, easier maintenance
    - Effort: High (architectural change)

12. **Implement Protocol Phase State Machine**
    - Impact: Automatic phase context and gate tracking
    - Effort: High (architectural change)

13. **Implement Validation Rule Registry**
    - Impact: Centralized validation, better testing
    - Effort: High (architectural change)

14. **Implement Guidance Level system**
    - Impact: Adaptive detail for different contexts
    - Effort: High (requires detection logic)

---

## 5. Conclusion

The current sprint-mcp tool responses provide comprehensive information but have significant opportunities for optimization. The analysis reveals three main improvement areas:

1. **Protocol Clarity**: Inconsistent protocol rule citations and phase context leave agents uncertain about where they are in the sprint lifecycle and what comes next.

2. **Actionability**: Tools vary widely in next-step guidance quality, with lifecycle transition tools (start, complete) providing excellent guidance but intermediate tools (update-status, regenerate) providing minimal guidance.

3. **Token Efficiency**: Verbose responses in success cases waste tokens on redundant explanations. Adaptive detail levels could reduce token usage by 30% while improving clarity in error cases.

**Priority Recommendation:**
Implement protocol citations, phase context, and next-step guidance across all tools first (items 1-3, 6). These provide immediate value with moderate effort and establish patterns for the remaining improvements.

The proposed architectural changes (Response Composer, Phase State Machine, Validation Registry) would formalize these improvements and make the system more maintainable long-term, but can be deferred until the immediate improvements are validated.

---

## Appendix A: Protocol Phase Mapping

```yaml
sprint_lifecycle:
  phases:
    - id: initialization
      status: null → planning
      section: §2.2
      tools: [check-sprint-status, start-sprint]
      gates:
        - No active sprints (S3)
        - Main branch exists with commits
        - Worktree created successfully
      next_phase: planning

    - id: planning
      status: planning
      section: §2.4
      tools: []
      gates:
        - implementation-plan.md created
        - backlog.yaml created
        - User approval received
      next_phase: execution

    - id: execution
      status: planning → in-progress
      section: §2.5
      tools: [update-sprint-status]
      gates:
        - Backlog items implemented
        - Intentional commits created (§2.5.1)
        - Tests passing
      next_phase: validation

    - id: validation
      status: in-progress → validating
      section: §2.6
      tools: [update-sprint-status]
      gates:
        - validate_deliverable.sh created
        - Validation script passes
      next_phase: verification

    - id: verification
      status: validating → verifying
      section: §2.7
      tools: [update-sprint-status]
      gates:
        - verification-report.md created
        - Backlog reconciled
      next_phase: publication

    - id: publication
      status: verifying → published
      section: §2.8
      tools: [update-sprint-status]
      gates:
        - Branch pushed
        - PR created (optional, per S14)
      next_phase: completion

    - id: completion
      status: published → complete
      section: §2.9
      tools: [complete-sprint]
      gates:
        - retro.md created
        - key-learnings.md created
        - publication.yaml created
        - User says "Sprint complete" or "Force complete sprint" (S2)
      next_phase: post_completion

    - id: post_completion
      status: complete
      section: null
      tools: [archive-sprint, cleanup-sprint]
      gates:
        - PR merged (optional)
        - Sprint archived (optional)
        - Worktree cleaned up (optional)
```

---

## Appendix B: Response Template Examples

### B.1 Minimal Response Template
```
✅ [Action] successful
[Key detail 1]
[Key detail 2]
Next: [Single next action]
```

### B.2 Standard Response Template
```
✅ [Action] successful!

**Summary**:
- [Key metric 1]
- [Key metric 2]

**Protocol Compliance**:
✅ [Rule/Section satisfied]

**Recommended Next Actions**:
1. [Required action]
2. [Optional action]

**Current Phase**: [Phase name] ([Section])
```

### B.3 Detailed Response Template
```
✅ [Action] successful!

**Summary**:
- [Detailed metric 1]
- [Detailed metric 2]

**Protocol Compliance**:
✅ [Rule/Section satisfied with explanation]
✅ [Another rule satisfied]

**Current Protocol Phase**: [Phase name] ([Section])
[Phase description and purpose]

**Gates Satisfied**:
✅ [Gate 1]
✅ [Gate 2]

**Next Gates**:
- [Upcoming gate 1]
- [Upcoming gate 2]

**Recommended Next Actions**:
1. [Required action with context]
2. [Optional action with rationale]
3. [Alternative path]

**Protocol Reference**:
See AGENTS-uncompressed.md [Section] for full phase requirements.

**Artifacts**:
[Detailed artifact list with status]

**Warnings** (if any):
⚠️  [Warning with severity and remediation]
```

---

## Appendix C: Tool Response Optimization Checklist

Use this checklist when updating tool responses:

- [ ] Protocol rule/section citations included
- [ ] Current protocol phase identified
- [ ] Next protocol gates listed
- [ ] Recommended next actions provided (numbered, clear)
- [ ] Hook execution status reported (if applicable)
- [ ] Hook failure recovery guidance provided (if hook failed)
- [ ] Backlog reminder included (for execution phase tools)
- [ ] Knowledge base mention included (for completion/archive tools)
- [ ] Error severity clearly indicated (error vs warning vs info)
- [ ] Validation errors include remediation guidance
- [ ] Token efficiency considered (avoid redundant explanations)
- [ ] Visual hierarchy aids parsing (emojis, markdown)
- [ ] Confirmation flows clearly explained (for destructive operations)
- [ ] Dry-run mode supported and explained (for risky operations)
- [ ] Response adapts to context (success vs error, first-time vs experienced)

---

**End of Technical Architecture Document**
