# Unified Worktree Model Analysis
## Sprint 15 - Agent Worktree-Awareness

**Date**: 2026-08-06
**Context**: User identified that the problem is NOT tool worktree-awareness (tools are fine), but AGENT worktree-awareness (agents don't know to work in worktrees)

---

## Executive Summary

The comprehensive MCP tool audit (worktree-audit.md) confirmed that **all tools are worktree-aware**. However, the user correctly identified that **agents are NOT worktree-aware**. The current architecture uses a **split model** where:

- **Code changes** happen in `.worktrees/sprint-N/src/`
- **Planning artifacts** happen in `planning/sprint-N/` (main repo)

This creates confusion for agents who must work in TWO locations. The user proposed a **simplified unified model**:

- **Everything** happens in `.worktrees/sprint-N/`
- **Agent cd to worktree and stays there**
- **Planning artifacts** live on the feature branch
- **PR merges both code and planning artifacts**

---

## Current State Analysis

### Current Architecture (SPLIT MODEL)

```
Main Repository (on main branch):
  /Users/.../sprint-mcp/
    planning/
      sprint-15-dq6cg7/              ← Planning artifacts (NOT on feature branch)
        sprint-manifest.yaml
        request-log.md
        implementation-plan.md
        backlog.yaml
    src/                              ← Main branch code
    .worktrees/
      sprint-15-dq6cg7/               ← Feature branch worktree
        src/                          ← Feature branch code changes go here
        planning/                     ← Inherited from main (sprint-12, 13, 14)
          (no sprint-15-dq6cg7/)      ← Sprint-15 artifacts NOT here!
```

**Problem**: Agent must work in TWO places:
1. Edit code in `.worktrees/sprint-15-dq6cg7/src/`
2. Edit planning artifacts in `/Users/.../sprint-mcp/planning/sprint-15-dq6cg7/`

### Current AGENTS.md Guidance

From AGENTS-uncompressed.md (lines 128-134):

```markdown
6. **Change to the sprint worktree directory**
   cd .worktrees/sprint-<id>/
   All subsequent sprint work (planning, implementation, validation) happens within this worktree directory.

7. **Create `sprint-manifest.yaml`** in the sprint directory with required metadata (see schema below).
   Note: The sprint directory `planning/sprint-<id>/` is accessible from both the main worktree and the sprint worktree.
```

**Analysis**:
- ✅ Line 130 says "All subsequent sprint work happens within this worktree directory"
- ❌ Line 134 contradicts this: "planning/sprint-<id>/ is accessible from both" (implies shared, not in worktree)
- **Confusion**: Agent doesn't know whether to work in worktree or main repo

### Current MCP Tool Behavior

From start-sprint.ts (lines 182-236):

```typescript
// Step 3: Create sprint directory
const planningDir = getPlanningDir();              // Returns /Users/.../sprint-mcp/planning
const archiveEnabled = await isArchiveEnabled();

let sprintParentDir = planningDir;
if (archiveEnabled) {
  sprintParentDir = join(planningDir, 'active');  // Returns /Users/.../sprint-mcp/planning/active
}

const sprintDir = join(sprintParentDir, sprintId); // /Users/.../sprint-mcp/planning/sprint-15/
await ensureDir(sprintDir);                        // Creates in MAIN REPO, not worktree

// Step 5: Create sprint manifest
const manifestPath = join(sprintDir, 'sprint-manifest.yaml');
await writeFile(manifestPath, stringifyYaml(manifest)); // Written to MAIN REPO
```

**Analysis**:
- ❌ Planning artifacts created in **main repo** planning/ directory
- ❌ NOT created inside the worktree
- ❌ Planning artifacts NOT on feature branch
- ❌ Planning artifacts don't get included in PR

### Evidence from Current Sprint (Sprint-15)

```bash
$ ls planning/sprint-15-dq6cg7/
backlog.yaml
implementation-plan.md
request-log.md
sprint-manifest.yaml
worktree-audit.md

$ ls .worktrees/sprint-15-dq6cg7/planning/
sprint-12-sdwpw0/     ← From main branch
sprint-13-eaydun/     ← From main branch
sprint-14-kmbtu7/     ← From main branch
(no sprint-15-dq6cg7/) ← Sprint-15 NOT in worktree!
```

**Confirmation**: Planning artifacts for sprint-15 are in main repo, NOT in worktree.

---

## Proposed Solution: Unified Worktree Model

### Simplified Architecture

```
Main Repository (on main branch):
  /Users/.../sprint-mcp/
    planning/
      sprint-index.yaml              ← Global sprint index (stays in main)
      active/                         ← Completed sprints after PR merge
        sprint-14-kmbtu7/
      archive/
        2026/
          sprint-1-abc/
    src/                              ← Main branch code
    .worktrees/
      sprint-15-dq6cg7/               ← Feature branch worktree
        src/                          ← Feature branch code
        planning/
          sprint-15-dq6cg7/           ← Sprint artifacts ON FEATURE BRANCH
            sprint-manifest.yaml
            request-log.md
            implementation-plan.md
            backlog.yaml
```

**Benefits**:
1. ✅ **Single working directory** - Agent cd to worktree and stays there
2. ✅ **Planning artifacts on feature branch** - Merged via PR with code
3. ✅ **Simpler mental model** - "All sprint work happens in worktree"
4. ✅ **No context switching** - Agent doesn't flip between main repo and worktree
5. ✅ **Traceable** - Planning artifacts have Git history on feature branch
6. ✅ **Clean PRs** - PR contains both code changes AND planning artifacts

### Agent Workflow (Simplified)

```bash
# Start sprint
$ mcp start-sprint --title "..." --goal "..." --owner "..."
✅ Created worktree: .worktrees/sprint-15-dq6cg7/
✅ Created planning: .worktrees/sprint-15-dq6cg7/planning/sprint-15-dq6cg7/

# Agent workflow
$ cd .worktrees/sprint-15-dq6cg7/
$ pwd
/Users/.../sprint-mcp/.worktrees/sprint-15-dq6cg7/

# All work happens here
$ edit src/tools/example.ts                          ← Code changes
$ edit planning/sprint-15-dq6cg7/request-log.md     ← Planning artifacts
$ npm test                                           ← Validation

# Commit (all in worktree)
$ git add src/ planning/sprint-15-dq6cg7/
$ git commit -m "Implement feature X"
$ git push origin feature/sprint-15-dq6cg7-...

# Create PR
$ gh pr create
→ PR includes BOTH code and planning artifacts

# After PR merge
→ planning/sprint-15-dq6cg7/ now in main repo
→ Can be archived to planning/archive/2026/sprint-15-dq6cg7/
```

### What Changes

#### 1. AGENTS.md / AGENTS-uncompressed.md

**Current (Confusing)**:
```markdown
7. **Create `sprint-manifest.yaml`** in the sprint directory with required metadata.
   Note: The sprint directory `planning/sprint-<id>/` is accessible from both the main worktree and the sprint worktree.
```

**Proposed (Clear)**:
```markdown
7. **Create `sprint-manifest.yaml`** in the sprint directory within the worktree.
   The sprint directory is `planning/sprint-<id>/` INSIDE the worktree, so all sprint artifacts
   are committed on the feature branch and merged to main via PR.

   Example: .worktrees/sprint-15-dq6cg7/planning/sprint-15-dq6cg7/sprint-manifest.yaml
```

**Add explicit guidance**:
```markdown
## 2.2.1 Agent Working Directory Discipline

Once you cd to the sprint worktree (`.worktrees/sprint-<id>/`), you MUST remain in that context
for all sprint work:

- ✅ Edit code: `src/...` (relative to worktree)
- ✅ Edit planning: `planning/sprint-<id>/...` (relative to worktree)
- ✅ Run tests: `npm test` (in worktree)
- ✅ Commit changes: `git add . && git commit` (in worktree)

- ❌ Do NOT cd back to main repository
- ❌ Do NOT edit files outside the worktree
- ❌ Do NOT create planning artifacts in main repo planning/ directory

When the PR is merged, all sprint artifacts (code + planning) are merged to main together.
```

#### 2. MCP start-sprint Tool

**Current**:
```typescript
// Creates planning dir in MAIN REPO
const planningDir = getPlanningDir();  // /Users/.../sprint-mcp/planning
const sprintDir = join(planningDir, sprintId);
```

**Proposed**:
```typescript
// Create planning dir INSIDE WORKTREE
const worktreePath = getWorktreePath(sprintId);
const worktreePlanningDir = join(worktreePath, 'planning');
await ensureDir(worktreePlanningDir);
const sprintDir = join(worktreePlanningDir, sprintId);
await ensureDir(sprintDir);
```

**Full change**:
```typescript
// Step 3: Create git worktree first
const worktreePath = getWorktreePath(sprintId);
const worktreeCreated = createWorktree(worktreePath, branchName);

// Step 4: Create sprint directory INSIDE worktree
const worktreePlanningDir = join(worktreePath, 'planning');
await ensureDir(worktreePlanningDir);

// Determine sprint parent directory (archive-aware)
let sprintParentDir = worktreePlanningDir;
if (archiveEnabled) {
  sprintParentDir = join(worktreePlanningDir, 'active');
  await ensureDir(sprintParentDir);
}

const sprintDir = join(sprintParentDir, sprintId);
await ensureDir(sprintDir);

// Now create manifest, request-log, etc. in sprintDir
// These files will be INSIDE the worktree, on the feature branch
```

#### 3. Other MCP Tools

**Tools affected**:
- complete-sprint
- update-sprint-status
- check-sprint-status
- regenerate-sprint-index

**Current approach**: Use `getPlanningDir()` which points to main repo

**Options for updated approach**:

##### Option A: Tools Check Worktree First
```typescript
// If sprint is active (not complete), check worktree first
const worktreePath = getWorktreePath(sprintId);
const worktreeSprintDir = join(worktreePath, 'planning', sprintId);

if (await fileExists(worktreeSprintDir)) {
  // Use worktree location (active sprint)
  manifestPath = join(worktreeSprintDir, 'sprint-manifest.yaml');
} else {
  // Use main repo location (completed sprint, merged to main)
  manifestPath = join(getPlanningDir(), sprintId, 'sprint-manifest.yaml');
}
```

##### Option B: Sprint Index Stores Location
```yaml
# sprint-index.yaml
sprints:
  - id: sprint-15-dq6cg7
    status: in-progress
    manifestPath: ".worktrees/sprint-15-dq6cg7/planning/sprint-15-dq6cg7/sprint-manifest.yaml"
    worktreePath: ".worktrees/sprint-15-dq6cg7"

  - id: sprint-14-kmbtu7
    status: complete
    manifestPath: "planning/sprint-14-kmbtu7/sprint-manifest.yaml"  # In main after merge
    worktreePath: null  # Worktree removed
```

**Recommendation**: Use **Option B** (sprint index stores location) for consistency with existing architecture.

#### 4. Sprint Index Management

**Current**: Sprint index at `planning/sprint-index.yaml` (main repo)

**Proposed**: Keep sprint index in main repo, but:
- Active sprints: manifestPath points to worktree
- Completed sprints: manifestPath points to main repo (after PR merge)

**Update logic**:
```typescript
// When sprint starts
const indexEntry: SprintIndexEntry = {
  id: sprintId,
  status: 'planning',
  manifestPath: `.worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml`,
  worktreePath: `.worktrees/${sprintId}`,
  branch: branchName,
};

// When sprint completes and PR merges
// User or automation updates manifestPath to main repo location
const indexEntry: SprintIndexEntry = {
  id: sprintId,
  status: 'complete',
  manifestPath: `planning/active/${sprintId}/sprint-manifest.yaml`,  // Now in main
  worktreePath: null,  // Worktree can be removed
  branch: branchName,
};
```

#### 5. PR and Merge Workflow

**Current**: PR only contains code changes (planning artifacts not on feature branch)

**Proposed**: PR contains both code and planning artifacts

```bash
# In worktree
$ git status
On branch feature/sprint-15-dq6cg7-worktree-unified-model
Changes to be committed:
  modified:   src/tools/start-sprint.ts
  modified:   src/tools/complete-sprint.ts
  new file:   planning/sprint-15-dq6cg7/sprint-manifest.yaml
  new file:   planning/sprint-15-dq6cg7/request-log.md
  new file:   planning/sprint-15-dq6cg7/implementation-plan.md
  new file:   planning/sprint-15-dq6cg7/backlog.yaml

$ git commit -m "Sprint 15: Unified worktree model"
$ git push origin feature/sprint-15-dq6cg7-worktree-unified-model
$ gh pr create
```

**After merge to main**:
- Main repo now has `planning/active/sprint-15-dq6cg7/` (or `planning/sprint-15-dq6cg7/` if no archive)
- Sprint index updated: `manifestPath: planning/active/sprint-15-dq6cg7/sprint-manifest.yaml`
- Worktree can be safely removed: `git worktree remove .worktrees/sprint-15-dq6cg7`

---

## Implementation Scope

### Phase 1: Update Agent Guidance (HIGH Priority)

**Tasks**:
1. Update AGENTS-uncompressed.md with unified worktree model
2. Add explicit "Agent Working Directory Discipline" section
3. Clarify that planning artifacts live IN worktree, ON feature branch
4. Update examples to show worktree-relative paths
5. Regenerate AGENTS.md (compressed version)

**Estimated Effort**: 2-3 hours

### Phase 2: Update MCP Tools (HIGH Priority)

**Tasks**:
1. Update start-sprint to create planning/ inside worktree
2. Update complete-sprint to find manifests in worktree or main repo
3. Update update-sprint-status to support both locations
4. Update check-sprint-status to check worktree first
5. Update regenerate-sprint-index to scan both worktrees and main repo
6. Test all tools with unified model

**Estimated Effort**: 6-8 hours

### Phase 3: Update Sprint Index Logic (MEDIUM Priority)

**Tasks**:
1. Update sprint index schema to support worktree manifestPaths
2. Update addSprintToIndex to use worktree paths for active sprints
3. Add migration logic to update manifestPath after PR merge
4. Update index validation to handle both path types

**Estimated Effort**: 3-4 hours

### Phase 4: Migration Strategy (MEDIUM Priority)

**Tasks**:
1. Create migration plan for existing active sprints (sprint-13, sprint-14, sprint-15)
2. Decide: Move existing planning artifacts to worktrees? Or grandfather them?
3. Create migration script if needed
4. Document migration process

**Estimated Effort**: 2-3 hours

### Phase 5: Testing and Validation (HIGH Priority)

**Tasks**:
1. Create integration tests for unified model
2. Test full sprint lifecycle: start → implement → commit → PR → merge → cleanup
3. Test archive system with unified model
4. Test regenerate-sprint-index with mixed locations
5. Manual validation of agent workflow

**Estimated Effort**: 4-5 hours

**Total Estimated Effort**: 17-23 hours (~3-4 days at 6 hours/day)

---

## Migration Considerations

### Existing Active Sprints

Current active sprints (sprint-13, sprint-14, sprint-15) have planning artifacts in main repo.

**Options**:

#### Option 1: Grandfather Existing Sprints
- Keep existing sprints as-is (split model)
- Apply unified model only to NEW sprints (sprint-16+)
- **Pros**: No migration needed, low risk
- **Cons**: Inconsistency, confusion for agents

#### Option 2: Migrate Existing Sprints
- Move sprint-13, sprint-14, sprint-15 planning artifacts to their worktrees
- Requires copying files and updating sprint index
- **Pros**: Consistency, agents follow single model
- **Cons**: Riskier, requires careful migration

**Recommendation**: **Option 1 (Grandfather)** for simplicity and low risk.

Document clearly:
```markdown
## Legacy Split Model (Pre-Sprint-16)

Sprints 1-15 used a split model where planning artifacts lived in the main repo.
Starting with Sprint 16, the unified worktree model is used where all sprint work
happens inside the worktree.

When working on legacy sprints (1-15):
- Planning artifacts: planning/sprint-N/ (main repo)
- Code changes: .worktrees/sprint-N/src/ (worktree)

When working on new sprints (16+):
- Everything: .worktrees/sprint-N/ (worktree)
```

### Sprint Index After PR Merge

**Challenge**: After PR merges, manifestPath changes from worktree to main repo.

**Solution**: Update sprint index as part of completion workflow:

```yaml
# Before PR merge (active sprint)
- id: sprint-15-dq6cg7
  status: in-progress
  manifestPath: ".worktrees/sprint-15-dq6cg7/planning/sprint-15-dq6cg7/sprint-manifest.yaml"

# After PR merge (completed sprint)
- id: sprint-15-dq6cg7
  status: complete
  manifestPath: "planning/active/sprint-15-dq6cg7/sprint-manifest.yaml"
```

**Implementation**: Add step to complete-sprint or post-merge automation.

---

## Benefits Summary

### For Agents (LLMs)

1. **Simpler mental model**: "cd to worktree and stay there"
2. **No context switching**: All sprint work in one directory
3. **Clear guidance**: AGENTS.md explicitly says "work in worktree"
4. **Traceable**: All changes (code + planning) in Git history together

### For Humans

1. **Complete PRs**: PR contains both implementation and planning artifacts
2. **Easy review**: See code and planning context in same PR
3. **Clean history**: Feature branch contains full sprint context
4. **Simplified cleanup**: Remove worktree after merge, everything preserved in main

### For System

1. **Architectural consistency**: Worktrees truly isolate sprint work
2. **Git-native**: Leverages Git's branching and merging
3. **Reversible**: Can revert entire sprint (code + planning) via Git
4. **Scalable**: Works for any number of sprints

---

## Risks and Mitigations

### Risk 1: Sprint Index Complexity

**Risk**: Sprint index must handle two manifestPath patterns (worktree vs main repo)

**Mitigation**:
- Tools use index to find manifests (abstraction layer)
- Index validation checks both path types
- Clear documentation on path patterns

### Risk 2: Existing Sprint Migration

**Risk**: Migrating sprint-13, sprint-14, sprint-15 could break things

**Mitigation**:
- Grandfather existing sprints (don't migrate)
- Apply unified model only to new sprints (sprint-16+)
- Document transition clearly

### Risk 3: Tool Compatibility

**Risk**: Tools break if they can't find manifests

**Mitigation**:
- Tools check worktree first, then fall back to main repo
- Comprehensive integration tests
- Gradual rollout (test on sprint-16 before documenting broadly)

### Risk 4: Archive System Interaction

**Risk**: Archive system expects manifests in main repo planning/

**Mitigation**:
- Archive only AFTER PR merge (manifests in main repo by then)
- Update archive tool to handle both locations during transition
- Clear sequencing: Complete → Merge → Archive → Cleanup

---

## Validation Criteria

### Success Metrics

1. **Agent can complete full sprint lifecycle without leaving worktree**
   - Start sprint
   - Create planning artifacts
   - Implement code
   - Run tests
   - Commit changes
   - Create PR
   - All from within `.worktrees/sprint-N/`

2. **MCP tools work correctly with unified model**
   - start-sprint creates artifacts in worktree
   - complete-sprint finds artifacts in worktree
   - update-sprint-status updates worktree manifests
   - regenerate-sprint-index scans both locations

3. **PR contains both code and planning artifacts**
   - Feature branch includes `planning/sprint-N/` changes
   - PR diff shows both src/ and planning/ files

4. **Sprint index correctly tracks manifest locations**
   - Active sprints: manifestPath points to worktree
   - Completed sprints: manifestPath points to main repo
   - Tools resolve paths correctly using index

5. **Documentation is clear and unambiguous**
   - AGENTS.md explicitly says "work in worktree"
   - No conflicting guidance
   - Examples use worktree-relative paths

---

## Recommendation

**Proceed with unified worktree model implementation using grandfathered migration strategy**:

1. Update AGENTS.md/AGENTS-uncompressed.md (clear guidance)
2. Update MCP tools (create artifacts in worktree)
3. Update sprint index (support both path types)
4. Keep existing sprints (13-15) as-is (split model)
5. Apply unified model starting with sprint-16
6. Comprehensive testing before rollout

**Estimated effort**: 17-23 hours over 3-4 days

**Priority**: HIGH - Blocking user productivity, fundamental workflow issue

---

## Next Steps

1. ✅ **This analysis** - Understand problem and solution
2. **Create detailed implementation plan** - Break down into discrete tasks
3. **Create prioritized YAML backlog** - Trackable tasks with acceptance criteria
4. **Get user approval** - Review plan before implementation
5. **Implement Phase 1** - Update AGENTS.md guidance
6. **Implement Phase 2** - Update MCP tools
7. **Test sprint-16** - Validate unified model works
8. **Document and complete sprint-15**

