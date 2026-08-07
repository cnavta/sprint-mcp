# Implementation Plan v2 – Sprint 15
## Unified Worktree Model for Agent Workflow

**Sprint ID**: sprint-15-dq6cg7
**Title**: Worktree-Aware Tool Remediation (Agent-Focused)
**Goal**: Implement unified worktree model where agents work entirely within worktree directory
**Owner**: Lead Implementor

---

## Executive Summary

### Problem Reframed

The original problem is **NOT** that MCP tools are unaware of worktrees (they ARE aware via SPRINT_ROOT). The problem is that **AGENTS are unaware of worktrees** - they don't know to work exclusively within the worktree directory.

### Current Issue (SPLIT MODEL)

Agents must work in TWO locations:
- **Code changes**: `.worktrees/sprint-15/src/`
- **Planning artifacts**: `planning/sprint-15/` (main repo)

This violates the principle stated in AGENTS.md line 130: "All subsequent sprint work happens within this worktree directory."

### Proposed Solution (UNIFIED MODEL)

Agents work in ONE location:
- **Everything**: `.worktrees/sprint-15/` (code + planning artifacts)
- **cd to worktree and stay there**
- **PR merges both code and planning artifacts**

---

## Scope and Approach

### In-Scope

1. **Update AGENTS.md/AGENTS-uncompressed.md** - Clear agent guidance
2. **Update MCP start-sprint tool** - Create planning artifacts in worktree
3. **Update other MCP tools** - Find artifacts in worktree or main repo
4. **Update sprint index logic** - Support both worktree and main repo paths
5. **Grandfather existing sprints** - Keep sprint 13-15 as-is (split model)
6. **Test unified model** - Validate full lifecycle works

### Out-of-Scope (Explicitly Deferred)

1. ❌ Migrating existing active sprints (13-15) to unified model
2. ❌ Changing archive system behavior
3. ❌ Modifying SPRINT_ROOT environment variable logic
4. ❌ Changes to git worktree creation mechanism

### Migration Strategy

**Grandfathered Approach**:
- Sprint 1-15: Split model (planning in main repo, code in worktree)
- Sprint 16+: Unified model (everything in worktree)
- Document the transition clearly for future agents

---

## Phase 1: Update Agent Guidance

### Objective
Make AGENTS.md unambiguous: agents work exclusively in worktree.

### Tasks

#### 1.1 Update AGENTS-uncompressed.md Sprint Start Section

**File**: `AGENTS-uncompressed.md` Section 2.2

**Current (Line 134)**:
```markdown
7. **Create `sprint-manifest.yaml`** in the sprint directory with required metadata.
   Note: The sprint directory `planning/sprint-<id>/` is accessible from both the main worktree and the sprint worktree.
```

**Change To**:
```markdown
7. **Create `sprint-manifest.yaml`** in the sprint directory WITHIN THE WORKTREE.

   The sprint directory is `planning/sprint-<id>/` INSIDE the worktree, ensuring all sprint artifacts
   are committed on the feature branch and merged to main via PR.

   Path: `.worktrees/sprint-<id>/planning/sprint-<id>/sprint-manifest.yaml`

   This directory is created automatically by the start-sprint tool.
```

**Estimated Effort**: 30 minutes

#### 1.2 Add "Agent Working Directory Discipline" Section

**File**: `AGENTS-uncompressed.md` New Section 2.2.1

**Content**:
```markdown
## 2.2.1 Agent Working Directory Discipline

Once you `cd` to the sprint worktree (`.worktrees/sprint-<id>/`), you MUST remain in that context
for ALL sprint work. The unified worktree model ensures all sprint changes (code + planning) are
committed together on the feature branch.

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
- Planning artifacts are now in main repo: `planning/active/sprint-<id>/`
- Sprint can be archived: `planning/archive/2026/sprint-<id>/`
- Worktree can be cleaned up: `git worktree remove .worktrees/sprint-<id>/`

### Legacy Sprints (Pre-Sprint-16)

Sprints 1-15 used a split model where planning artifacts lived in the main repo.
If working with these legacy sprints, planning artifacts remain in `planning/sprint-<id>/` (main repo).

Starting with Sprint 16, ALL sprints use the unified worktree model.
```

**Estimated Effort**: 45 minutes

#### 1.3 Update Sprint Directory Structure Documentation

**File**: `AGENTS-uncompressed.md` Section 2.3

**Current**:
```markdown
# 🧩 2.3 Sprint Directory Structure

planning/
  sprint-7-a13b2f/
    sprint-manifest.yaml
    ...
```

**Change To**:
```markdown
# 🧩 2.3 Sprint Directory Structure

The sprint directory lives WITHIN the worktree for unified workflow:

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
    ...

After PR merge to main:
planning/
  active/
    sprint-7-a13b2f/                 ← Now in main repo
      (same artifacts)
```

**Estimated Effort**: 20 minutes

#### 1.4 Regenerate AGENTS.md (Compressed Version)

**File**: `AGENTS.md`

Use semantic compression to update AGENTS.md with the new guidance while preserving token efficiency.

**Estimated Effort**: 30 minutes

**Total Phase 1 Effort**: 2-2.5 hours

---

## Phase 2: Update MCP Tools

### Objective
Update MCP tools to create and find planning artifacts in worktree.

### Tasks

#### 2.1 Update start-sprint Tool

**File**: `src/tools/start-sprint.ts`

**Changes**:

1. **Create worktree first** (already done at line 204)
2. **Create planning directory INSIDE worktree** (NEW)

```typescript
// Step 3: Create git worktree with feature branch
const worktreePath = getWorktreePath(sprintId);
const worktreeCreated = createWorktree(worktreePath, branchName);

if (!worktreeCreated) {
  // Error handling...
}

// Step 4: Create sprint directory INSIDE worktree (NEW LOGIC)
const worktreePlanningDir = join(worktreePath, 'planning');
await ensureDir(worktreePlanningDir);

// Determine sprint parent directory (archive-aware)
let sprintParentDir = worktreePlanningDir;
if (archiveEnabled) {
  // Note: Archive structure not used in worktrees (sprints are active)
  // But we preserve the logic for consistency
  sprintParentDir = join(worktreePlanningDir, 'active');
  await ensureDir(sprintParentDir);
}

const sprintDir = join(sprintParentDir, sprintId);
await ensureDir(sprintDir);
logger.info(`Created sprint directory in worktree: ${sprintDir}`);

// Step 5: Create sprint manifest in worktree
const manifestPath = join(sprintDir, 'sprint-manifest.yaml');
await writeFile(manifestPath, stringifyYaml(manifest));
logger.info(`Created sprint manifest: ${manifestPath}`);

// Step 6: Create initial request log in worktree
const requestLogPath = join(sprintDir, 'request-log.md');
await writeFile(requestLogPath, requestLogContent);
logger.info(`Created request log: ${requestLogPath}`);
```

3. **Update sprint index entry** to use worktree path

```typescript
// Step 7: Add sprint to index
const manifestRelativePath = archiveEnabled
  ? `.worktrees/${sprintId}/planning/active/${sprintId}/sprint-manifest.yaml`
  : `.worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml`;

const indexEntry: SprintIndexEntry = {
  id: sprintId,
  title: sprintArgs.title,
  status: manifest.status,
  owner: sprintArgs.owner,
  createdAt: manifest.createdAt,
  manifestPath: manifestRelativePath,  // Points to worktree
  branch: branchName,
  worktreePath: `.worktrees/${sprintId}`,
};
```

4. **Update success message** to reflect worktree location

```typescript
const resultText = `✅ Sprint ${sprintId} initialized successfully!

**Sprint Details**:
- ID: ${sprintId}
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}
- Status: planning
- Worktree: .worktrees/${sprintId}/
- Branch: ${branchName}

**Sprint artifacts location**:
- Planning directory: .worktrees/${sprintId}/planning/${sprintId}/
- Manifest: .worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml
- Request log: .worktrees/${sprintId}/planning/${sprintId}/request-log.md

**Next Steps**:
1. Change to sprint worktree: \`cd .worktrees/${sprintId}/\`
2. Verify branch: \`git branch --show-current\` (should show: ${branchName})
3. Create implementation-plan.md in planning/${sprintId}/
4. Get user approval for the plan before implementing
5. ALL sprint work happens in this worktree directory

**Important**: Do NOT leave the worktree directory during sprint work.
All code changes and planning artifacts should be created/edited within .worktrees/${sprintId}/
`;
```

**Acceptance Criteria**:
- start-sprint creates planning/ directory inside worktree
- Manifest and request-log created in worktree
- Sprint index manifestPath points to worktree
- Success message explicitly instructs agent to stay in worktree
- All tests pass

**Estimated Effort**: 2-3 hours

#### 2.2 Update complete-sprint Tool

**File**: `src/tools/complete-sprint.ts`

**Changes**:

Update artifact discovery to check worktree first, then fall back to main repo.

```typescript
async function findSprintManifest(sprintId: string): Promise<string | null> {
  const projectRoot = getProjectRoot();

  // Option 1: Check worktree (active sprint using unified model)
  const worktreePath = getWorktreePath(sprintId);
  const worktreeManifest = join(worktreePath, 'planning', sprintId, 'sprint-manifest.yaml');

  if (await fileExists(worktreeManifest)) {
    logger.info(`Found manifest in worktree: ${worktreeManifest}`);
    return worktreeManifest;
  }

  // Option 2: Check main repo active/ (completed sprint or legacy split model)
  const activeManifest = join(projectRoot, 'planning', 'active', sprintId, 'sprint-manifest.yaml');

  if (await fileExists(activeManifest)) {
    logger.info(`Found manifest in main repo active/: ${activeManifest}`);
    return activeManifest;
  }

  // Option 3: Check main repo root (legacy flat structure)
  const flatManifest = join(projectRoot, 'planning', sprintId, 'sprint-manifest.yaml');

  if (await fileExists(flatManifest)) {
    logger.info(`Found manifest in main repo flat structure: ${flatManifest}`);
    return flatManifest;
  }

  // Option 4: Check archive (completed and archived sprint)
  // Use index to find archive location
  const index = await loadSprintIndex();
  const sprintEntry = index.sprints.find(s => s.id === sprintId);

  if (sprintEntry && sprintEntry.manifestPath.startsWith('planning/archive/')) {
    const archiveManifest = join(projectRoot, sprintEntry.manifestPath);
    if (await fileExists(archiveManifest)) {
      logger.info(`Found manifest in archive: ${archiveManifest}`);
      return archiveManifest;
    }
  }

  return null;
}
```

**Acceptance Criteria**:
- complete-sprint finds manifests in worktree
- complete-sprint falls back to main repo if worktree not found
- complete-sprint validates artifacts in correct location
- All tests pass

**Estimated Effort**: 2 hours

#### 2.3 Update update-sprint-status Tool

**File**: `src/tools/update-sprint-status.ts`

**Changes**:

Use same `findSprintManifest` logic as complete-sprint.

```typescript
// Find sprint manifest path (check worktree first, then main repo)
const manifestPath = await findSprintManifest(sprintId);

if (!manifestPath) {
  return {
    content: [{
      type: 'text',
      text: `❌ Sprint ${sprintId} not found.\n\nSearched:\n- Worktree: .worktrees/${sprintId}/planning/${sprintId}/\n- Main repo: planning/active/${sprintId}/\n- Archive: planning/archive/*/\n\nPlease check sprint ID.`,
    }],
    isError: true,
  };
}

// Rest of logic uses manifestPath...
```

**Acceptance Criteria**:
- update-sprint-status finds and updates manifests in worktree
- Falls back to main repo if needed
- All tests pass

**Estimated Effort**: 1 hour

#### 2.4 Update check-sprint-status Tool

**File**: `src/tools/check-sprint-status.ts`

**Changes**:

Update sprint discovery to check worktrees.

```typescript
async function getActiveSprintDirectories(): Promise<string[]> {
  const sprintDirs: string[] = [];

  // Check worktrees for active sprints
  const worktreesDir = join(getProjectRoot(), '.worktrees');

  if (await fileExists(worktreesDir)) {
    const worktrees = await readdir(worktreesDir, { withFileTypes: true });

    for (const worktree of worktrees.filter(w => w.isDirectory() && w.name.startsWith('sprint-'))) {
      const planningDir = join(worktreesDir, worktree.name, 'planning');

      if (await fileExists(planningDir)) {
        const sprints = await readdir(planningDir, { withFileTypes: true });

        for (const sprint of sprints.filter(s => s.isDirectory() && s.name.startsWith('sprint-'))) {
          const manifestPath = join(planningDir, sprint.name, 'sprint-manifest.yaml');

          if (await fileExists(manifestPath)) {
            sprintDirs.push(join(worktreesDir, worktree.name, 'planning', sprint.name));
          }
        }
      }
    }
  }

  // Also check main repo for completed sprints or legacy sprints
  const mainRepoPlanningDir = getPlanningDir();
  // ... existing logic for scanning main repo ...

  return sprintDirs;
}
```

**Acceptance Criteria**:
- check-sprint-status finds active sprints in worktrees
- Reports worktree location correctly
- All tests pass

**Estimated Effort**: 1.5 hours

#### 2.5 Update regenerate-sprint-index Tool

**File**: `src/common/sprint-index-manager.ts`

**Changes**:

Update directory scanning to include worktrees.

```typescript
async function getSprintDirectories(options: { activeOnly?: boolean } = {}): Promise<string[]> {
  const projectRoot = getProjectRoot();
  const planningDir = getPlanningDir();
  const sprintDirs: string[] = [];

  // Scan worktrees for active sprints (unified model)
  const worktreesDir = join(projectRoot, '.worktrees');

  if (await fileExists(worktreesDir)) {
    logger.debug('Scanning worktrees for active sprints...');
    const worktrees = await listDirectories(worktreesDir);

    for (const worktreePath of worktrees) {
      const worktreePlanningDir = join(worktreePath, 'planning');

      if (await fileExists(worktreePlanningDir)) {
        const sprintDirsInWorktree = await listDirectories(worktreePlanningDir);
        sprintDirs.push(...sprintDirsInWorktree);
      }
    }

    logger.debug(`Found ${sprintDirs.length} sprints in worktrees`);
  }

  // Scan main repo planning/ for completed sprints
  // ... existing logic ...

  return sprintDirs;
}
```

**Acceptance Criteria**:
- regenerate-sprint-index scans worktrees
- Correctly builds index with worktree manifestPaths
- All tests pass

**Estimated Effort**: 2 hours

**Total Phase 2 Effort**: 8.5-10.5 hours

---

## Phase 3: Testing and Validation

### Objective
Validate that unified worktree model works end-to-end.

### Tasks

#### 3.1 Create Integration Test for Unified Model

**File**: `src/integration/__tests__/unified-worktree.test.ts`

**Test Scenarios**:
1. Start sprint with unified model
2. Verify planning artifacts in worktree
3. Update manifest in worktree
4. Complete sprint from worktree
5. Verify sprint index uses worktree path

**Estimated Effort**: 3 hours

#### 3.2 Manual End-to-End Test

**Procedure**:
1. Start sprint-16 (first unified model sprint)
2. Verify artifacts in `.worktrees/sprint-16/planning/sprint-16/`
3. Edit request-log.md in worktree
4. Edit src/tools/example.ts in worktree
5. Run npm test from worktree
6. Commit changes (verify both code + planning staged)
7. Push to remote
8. Create PR (verify PR includes planning artifacts)

**Acceptance Criteria**:
- Agent stays in worktree entire time
- All artifacts created in worktree
- Commit includes both code and planning
- PR shows planning artifacts

**Estimated Effort**: 2 hours

#### 3.3 Test Tool Compatibility

Test all tools with unified model:
- start-sprint
- check-sprint-status
- update-sprint-status
- complete-sprint
- regenerate-sprint-index
- cleanup-sprint
- archive-sprint

**Estimated Effort**: 2 hours

**Total Phase 3 Effort**: 7 hours

---

## Phase 4: Documentation and Migration

### Objective
Document unified model and migration strategy.

### Tasks

#### 4.1 Update CLAUDE.md

Add section explaining unified worktree model for agents.

**Estimated Effort**: 1 hour

#### 4.2 Create Migration Guide

Document transition from split model (sprints 1-15) to unified model (sprints 16+).

**File**: `planning/WORKTREE_MIGRATION.md`

**Content**:
- Explanation of split vs unified models
- Timeline (sprint 1-15 vs 16+)
- How to work with legacy sprints
- How to work with new sprints

**Estimated Effort**: 1 hour

#### 4.3 Update Request Log

Document all implementation activities in sprint-15 request-log.md.

**Estimated Effort**: 30 minutes

**Total Phase 4 Effort**: 2.5 hours

---

## Total Effort Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Update Agent Guidance | 2-2.5 hours |
| Phase 2: Update MCP Tools | 8.5-10.5 hours |
| Phase 3: Testing and Validation | 7 hours |
| Phase 4: Documentation and Migration | 2.5 hours |
| **Total** | **20-22.5 hours** |

**Timeline**: 3-4 days at 6 hours/day

---

## Success Criteria

### Agent Workflow

1. ✅ Agent can start sprint and receive clear instruction to stay in worktree
2. ✅ Agent creates all planning artifacts in worktree
3. ✅ Agent makes code changes in worktree
4. ✅ Agent commits both code and planning together
5. ✅ Agent never needs to leave worktree during sprint

### Tool Functionality

1. ✅ start-sprint creates planning/ directory in worktree
2. ✅ complete-sprint finds manifests in worktree
3. ✅ update-sprint-status updates worktree manifests
4. ✅ check-sprint-status reports worktree sprints
5. ✅ regenerate-sprint-index scans both worktrees and main repo

### Git and PR Workflow

1. ✅ Feature branch contains both code and planning changes
2. ✅ PR includes planning artifacts
3. ✅ After merge, planning artifacts in main repo
4. ✅ Worktree can be safely removed after merge

### Documentation

1. ✅ AGENTS.md unambiguous: "work in worktree"
2. ✅ No conflicting guidance
3. ✅ Examples use worktree-relative paths
4. ✅ Migration guide explains transition

---

## Risk Mitigation

### Risk 1: Breaking Existing Sprints

**Mitigation**: Grandfather sprints 1-15 (keep split model), only apply unified model to new sprints (16+).

### Risk 2: Tool Compatibility Issues

**Mitigation**: Tools check worktree first, fall back to main repo. Comprehensive testing before rollout.

### Risk 3: Archive System Confusion

**Mitigation**: Archive only after PR merge (artifacts in main repo). Document sequencing clearly.

### Risk 4: Sprint Index Complexity

**Mitigation**: Sprint index abstracts path resolution. Tools use index, not hardcoded paths.

---

## Implementation Sequence

### Week 1, Day 1 (6 hours)
- Task 1.1: Update AGENTS-uncompressed.md Sprint Start (0.5h)
- Task 1.2: Add Agent Working Directory Discipline section (0.75h)
- Task 1.3: Update Sprint Directory Structure docs (0.33h)
- Task 1.4: Regenerate AGENTS.md (0.5h)
- Task 2.1: Update start-sprint tool (2.5h)
- Task 2.2: Start update-sprint-status tool (1.5h)

### Week 1, Day 2 (6 hours)
- Task 2.2: Complete update-sprint-status tool (0.5h)
- Task 2.3: Update complete-sprint tool (2h)
- Task 2.4: Update check-sprint-status tool (1.5h)
- Task 2.5: Update regenerate-sprint-index (2h)

### Week 1, Day 3 (6 hours)
- Task 3.1: Create integration tests (3h)
- Task 3.2: Manual end-to-end test (2h)
- Task 3.3: Test tool compatibility (1h)

### Week 1, Day 4 (3 hours)
- Task 4.1: Update CLAUDE.md (1h)
- Task 4.2: Create migration guide (1h)
- Task 4.3: Update request log (0.5h)
- Buffer for issues/adjustments (0.5h)

**Total**: 21 hours over 3.5 days

---

## Next Steps

1. ✅ This implementation plan
2. **Create prioritized YAML backlog** with discrete tasks
3. **Get user approval** before implementation
4. **Begin Phase 1** (update agent guidance)
5. **Implement and test** phases 2-4
6. **Validate with sprint-16** as first unified model sprint
7. **Complete sprint-15** with documentation of unified model

