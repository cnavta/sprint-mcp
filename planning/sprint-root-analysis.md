# SPRINT_ROOT Environment Variable - Implementation Analysis

**Lead Implementor**: Claude
**Date**: 2026-08-05
**Sprint Goal**: Implement SPRINT_ROOT environment variable support across all MCP tools

---

## Executive Summary

The `SPRINT_ROOT` environment variable is **documented but not implemented** across the sprint-mcp codebase. This creates a critical gap between promised functionality and actual behavior, preventing multi-project usage patterns documented in `documentation/claude-desktop-installation-guide.md`.

**Impact**: Users cannot configure different sprint-mcp instances per project as advertised.

**Scope**: 6 MCP tools + 5 common modules + compression subsystem + tests + documentation

---

## Current State Analysis

### Documentation vs Reality

**Documented Promise** (from `documentation/claude-desktop-installation-guide.md:420-431`):
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "env": {
        "SPRINT_ROOT": "/Users/username/projects/my-app"
      }
    }
  }
}
```

**Actual Implementation**: All modules use `process.cwd()` directly, ignoring `SPRINT_ROOT`.

### Affected Components

#### MCP Tools (6 total)
1. **start-sprint.ts**
   - `getNextSprintNumber()` → `join(process.cwd(), 'planning')` (line 44)
   - Sprint directory creation → `join(process.cwd(), 'planning')` (line 118)

2. **check-sprint-status.ts**
   - Planning directory → `join(process.cwd(), 'planning')` (line 28)

3. **regenerate-sprint-index.ts**
   - Indirect via `sprint-index-manager.ts`

4. **update-sprint-status.ts**
   - Manifest path → `join(process.cwd(), 'planning', sprintId, ...)` (line 96)

5. **complete-sprint.ts**
   - Artifact checking → `join(process.cwd(), 'planning', sprintId)` (line 69)
   - Manifest path → `join(process.cwd(), 'planning', sprintId, ...)` (line 126)

6. **cleanup-sprint.ts**
   - Indirect via `sprint-cleanup-utils.ts`

#### Common Modules (5 total)
1. **sprint-index-manager.ts** ⚠️ **CRITICAL PATH**
   - `getSprintIndexPath()` → `join(process.cwd(), 'planning', 'sprint-index.yaml')` (line 38)
   - `getPlanningDir()` → `join(process.cwd(), 'planning')` (line 46)
   - Used by: regenerate-sprint-index, add/update operations

2. **sprint-index-validator.ts**
   - `getPlanningDir()` → `join(process.cwd(), 'planning')` (line 74)
   - Manifest path resolution → `join(process.cwd(), entry.manifestPath)` (lines 279, 312)

3. **git-utils.ts**
   - `getWorktreePath()` → `join(process.cwd(), '.worktrees', sprintId)` (line 234)

4. **sprint-cleanup-utils.ts**
   - Planning directory → `join(process.cwd(), 'planning', sprintId)` (line 146)

5. **compression/config.ts**
   - Config path resolution → `join(process.cwd(), configPath)` (line 62)

#### Test Files
- **17 test files** use `process.cwd()` for test isolation (saving/restoring)
- This pattern is CORRECT and should remain unchanged
- Tests will need SPRINT_ROOT-aware test cases added

### Design Pattern from Sprint 13

From `planning/sprint-13-eaydun/key-learnings.md:280-286`:

```typescript
export function getProjectRoot(): string {
  return process.env.SPRINT_ROOT || process.cwd();
}
```

This pattern was identified as beneficial but never implemented.

---

## Technical Requirements

### 1. Centralized Configuration Module

**Location**: `src/common/project-config.ts` (new file)

**Responsibilities**:
- Read `SPRINT_ROOT` environment variable
- Provide project root accessor
- Provide derived path helpers (planning dir, index path, worktree path)
- Maintain backward compatibility (no SPRINT_ROOT = use process.cwd())

**API Design**:
```typescript
// Core function
export function getProjectRoot(): string

// Derived path helpers
export function getPlanningDir(): string
export function getSprintIndexPath(): string
export function getWorktreePath(sprintId: string): string
export function getSprintDir(sprintId: string): string
export function getManifestPath(sprintId: string): string
```

### 2. Migration Strategy

**Phase 1**: Create centralized config module
- Implement `src/common/project-config.ts`
- Add comprehensive unit tests
- Validate backward compatibility

**Phase 2**: Update common modules
- Migrate `sprint-index-manager.ts`
- Migrate `sprint-index-validator.ts`
- Migrate `git-utils.ts`
- Migrate `sprint-cleanup-utils.ts`
- Update each module's tests

**Phase 3**: Update MCP tools
- Migrate `start-sprint.ts`
- Migrate `check-sprint-status.ts`
- Migrate `update-sprint-status.ts`
- Migrate `complete-sprint.ts`
- Update each tool's tests

**Phase 4**: Update compression subsystem
- Migrate `compression/config.ts`
- Update compression tests

**Phase 5**: Integration testing
- Test multi-project scenarios
- Test backward compatibility (no SPRINT_ROOT)
- Test with invalid paths
- Test edge cases (missing directories, permissions)

**Phase 6**: Documentation updates
- Update installation guide
- Update README
- Add migration guide for users
- Document environment variables

### 3. Backward Compatibility

**Critical Constraint**: Must not break existing deployments.

**Compatibility Matrix**:
| SPRINT_ROOT | Working Directory | Expected Behavior |
|-------------|-------------------|-------------------|
| Not set | /project | Use /project (current behavior) |
| Set to /custom | /anywhere | Use /custom (new behavior) |
| Set to "" | /project | Use /project (fallback) |
| Set to invalid | /project | Error or fallback? (TBD) |

**Decision needed**: How to handle invalid SPRINT_ROOT paths?
- Option A: Error immediately on startup
- Option B: Fallback to process.cwd() with warning
- Option C: Let filesystem operations fail naturally

**Recommendation**: Option A for fail-fast behavior.

### 4. Testing Strategy

**Unit Tests** (per module):
- Default behavior (no SPRINT_ROOT) → uses process.cwd()
- With SPRINT_ROOT set → uses SPRINT_ROOT
- With empty SPRINT_ROOT → uses process.cwd()
- With relative SPRINT_ROOT → should error or resolve?
- With non-existent SPRINT_ROOT → should error

**Integration Tests**:
- Full MCP tool flows with SPRINT_ROOT
- Multi-project simulation
- Path resolution across module boundaries

**Test Utilities**:
```typescript
// Test helper to temporarily set SPRINT_ROOT
function withSprintRoot(path: string, fn: () => void): void
```

### 5. Performance Considerations

**Current**: Every call uses `process.cwd()` (syscall overhead minimal)

**Proposed**: Every call uses `process.env.SPRINT_ROOT || process.cwd()`
- Environment variable access is fast (no syscall)
- Negligible performance impact

**Optimization**: Could cache on module load if needed, but likely unnecessary.

---

## Risk Assessment

### High Risk
1. **Breaking Changes**: Incorrect migration could break all MCP tools
   - **Mitigation**: Comprehensive test coverage before migration

2. **Test Isolation**: Tests use `process.chdir()` for isolation
   - **Mitigation**: Ensure SPRINT_ROOT tests don't interfere with chdir pattern

### Medium Risk
1. **Path Resolution**: Relative vs absolute SPRINT_ROOT handling
   - **Mitigation**: Explicit validation and error handling

2. **Git Worktree Paths**: Worktrees must remain relative to actual git repo
   - **Mitigation**: Careful review of git-utils.ts changes

### Low Risk
1. **Documentation Lag**: Docs may become outdated
   - **Mitigation**: Update docs atomically with implementation

---

## Success Criteria

### Must Have (P0)
- [ ] All MCP tools respect SPRINT_ROOT when set
- [ ] Backward compatible (no SPRINT_ROOT = works as before)
- [ ] All existing tests pass
- [ ] Documentation updated

### Should Have (P1)
- [ ] New tests for SPRINT_ROOT scenarios
- [ ] Integration tests for multi-project setup
- [ ] Clear error messages for invalid SPRINT_ROOT

### Nice to Have (P2)
- [ ] Validation on MCP server startup
- [ ] Helpful debug logging for path resolution
- [ ] Migration guide for existing users

---

## Open Questions

1. **Relative paths**: Should SPRINT_ROOT support relative paths?
   - Current thinking: No, require absolute paths for clarity

2. **Validation**: When should we validate SPRINT_ROOT exists?
   - Option A: On module load
   - Option B: On first use
   - Option C: Never (let FS operations fail)

3. **Git worktrees**: Should worktrees be under SPRINT_ROOT or actual repo?
   - Current: `.worktrees/` in repo root
   - Proposal: Keep in repo root (worktrees are git-specific)

4. **Compression config**: Should compression config path be relative to SPRINT_ROOT?
   - Current: Relative to process.cwd()
   - Proposal: Yes, for consistency

---

## Dependencies and Blockers

### Dependencies
- None (all changes are internal)

### Blockers
- None identified

### Prerequisites
- Sprint start approval
- Backlog prioritization approval

---

## Estimated Effort

| Phase | Story Points | Time Estimate |
|-------|--------------|---------------|
| Phase 1: Config module | 3 | 1-2 hours |
| Phase 2: Common modules | 5 | 2-3 hours |
| Phase 3: MCP tools | 5 | 2-3 hours |
| Phase 4: Compression | 2 | 1 hour |
| Phase 5: Integration tests | 3 | 1-2 hours |
| Phase 6: Documentation | 2 | 1 hour |
| **Total** | **20** | **8-12 hours** |

**Note**: Estimates assume no major blockers or design changes.

---

## Next Steps

1. **Immediate**: Review and approve this analysis
2. **Next**: Create prioritized YAML backlog
3. **Then**: Implement Phase 1 (config module)
4. **Finally**: Sequential execution through Phase 6

---

## Appendix: Code Inventory

### Files Requiring Changes (Production)
1. `src/common/project-config.ts` (NEW)
2. `src/common/sprint-index-manager.ts`
3. `src/common/sprint-index-validator.ts`
4. `src/common/git-utils.ts`
5. `src/common/sprint-cleanup-utils.ts`
6. `src/tools/start-sprint.ts`
7. `src/tools/check-sprint-status.ts`
8. `src/tools/update-sprint-status.ts`
9. `src/tools/complete-sprint.ts`
10. `src/compression/config.ts`

### Files Requiring Changes (Tests)
1. `src/common/__tests__/project-config.test.ts` (NEW)
2. `src/common/__tests__/sprint-index-manager.test.ts`
3. `src/common/__tests__/sprint-index-validator.test.ts`
4. `src/common/__tests__/git-utils.test.ts`
5. `src/common/__tests__/sprint-cleanup-utils.test.ts`
6. `src/tools/__tests__/start-sprint.test.ts`
7. `src/tools/__tests__/check-sprint-status.test.ts`
8. `src/tools/__tests__/update-sprint-status.test.ts`
9. `src/tools/__tests__/complete-sprint.test.ts`
10. `src/compression/__tests__/config.test.ts`

### Files Requiring Changes (Documentation)
1. `documentation/claude-desktop-installation-guide.md` (update)
2. `README.md` (update)
3. `documentation/environment-variables.md` (NEW or update)

**Total Files**: 23 files (10 production, 10 test, 3 documentation)
