# Sprint 14: SPRINT_ROOT Environment Variable Implementation

## Sprint Overview

**ID**: sprint-14-kmbtu7
**Goal**: Implement SPRINT_ROOT environment variable support across all MCP tools, common modules, and compression subsystem to enable multi-project workflows
**Owner**: Christopher Navta
**Status**: planning
**Estimated Duration**: 8-12 hours (1-2 days)
**Story Points**: 20

---

## Problem Statement

The `SPRINT_ROOT` environment variable is **documented but not implemented** in the sprint-mcp codebase. This creates a critical gap between promised functionality and actual behavior, preventing multi-project usage patterns as advertised in the documentation.

**Impact**: Users cannot configure different sprint-mcp instances per project, making multi-project workflows impossible.

---

## Solution Overview

Create a centralized configuration module (`src/common/project-config.ts`) that serves as the single source of truth for project root path resolution. All MCP tools, common modules, and subsystems will migrate from using `process.cwd()` directly to using this centralized configuration.

**Core Pattern**:
```typescript
export function getProjectRoot(): string {
  return process.env.SPRINT_ROOT || process.cwd();
}
```

**Backward Compatibility**: When `SPRINT_ROOT` is not set, behavior is identical to current implementation (uses `process.cwd()`).

---

## Implementation Phases

### Phase 1: Foundation - Centralized Configuration Module (1-2 hours)

**Objective**: Create single source of truth for project root path resolution

**Tasks**:
1. Create `src/common/project-config.ts` with core functions
2. Implement path helper functions (planning dir, index path, worktree path, etc.)
3. Add validation logic for SPRINT_ROOT
4. Write comprehensive unit tests (100% coverage target)
5. Add JSDoc documentation

**Deliverables**:
- `src/common/project-config.ts`
- `src/common/__tests__/project-config.test.ts`

**Validation Criteria**:
- All tests pass
- 100% code coverage for project-config.ts
- No breaking changes to existing behavior
- Documentation complete

---

### Phase 2: Core Infrastructure - Common Modules (2-3 hours)

**Objective**: Migrate all common modules to use centralized configuration

**Tasks**:
1. **sprint-index-manager.ts**: Replace local path functions
2. **sprint-index-validator.ts**: Update path resolution
3. **git-utils.ts**: Update worktree path (CRITICAL - requires extra validation)
4. **sprint-cleanup-utils.ts**: Update planning directory references
5. Update all corresponding test files

**Migration Pattern**:
```typescript
// Before
const planningDir = join(process.cwd(), 'planning');

// After
import { getPlanningDir } from './project-config.js';
const planningDir = getPlanningDir();
```

**Validation Criteria**:
- All module tests pass
- No integration test regressions
- Backward compatibility verified
- Git worktrees work correctly

---

### Phase 3: MCP Tools Migration (2-3 hours)

**Objective**: Update all MCP tools to use centralized configuration

**Tasks**:
1. **start-sprint.ts**: Update sprint directory creation
2. **check-sprint-status.ts**: Update planning directory reference
3. **update-sprint-status.ts**: Update manifest path construction
4. **complete-sprint.ts**: Update artifact checking paths
5. **cleanup-sprint.ts**: Verify integration (uses sprint-cleanup-utils)
6. Update all corresponding test files

**Validation Criteria**:
- All tool tests pass
- Manual testing of each MCP tool successful
- Integration tests pass
- No breaking changes observed

---

### Phase 4: Compression Subsystem (1 hour)

**Objective**: Update compression module to respect SPRINT_ROOT

**Tasks**:
1. Update `compression/config.ts` path resolution
2. Update compression tests

**Validation Criteria**:
- Compression tests pass
- Config loading works with SPRINT_ROOT
- Backward compatibility verified

---

### Phase 5: Integration Testing (1-2 hours)

**Objective**: Validate end-to-end functionality with SPRINT_ROOT

**Tasks**:
1. Create multi-project integration test suite
2. Create backward compatibility test suite
3. Create edge case tests (invalid paths, permissions, etc.)

**Test Scenarios**:
- Full sprint lifecycle with SPRINT_ROOT
- Switching between projects
- Operations without SPRINT_ROOT (backward compatibility)
- Error handling for invalid SPRINT_ROOT

**Validation Criteria**:
- All integration tests pass
- Edge cases handled gracefully
- Error messages clear and actionable
- Performance acceptable

---

### Phase 6: Documentation and Polish (1 hour)

**Objective**: Update all documentation to reflect SPRINT_ROOT support

**Tasks**:
1. Verify and update installation guide
2. Update README.md
3. Create/update environment variables documentation
4. Optional: Create migration guide

**Validation Criteria**:
- Documentation accurate
- Examples tested
- Links valid
- Terminology consistent

---

## Design Decisions

### Decision 1: Relative vs Absolute Paths
**Decision**: SPRINT_ROOT must be an absolute path
**Rationale**: Clarity and predictability; avoids confusion about resolution context
**Implementation**: Validate and error if relative path provided

### Decision 2: Validation Timing
**Decision**: Validate SPRINT_ROOT on first use (lazy validation)
**Rationale**: Allows MCP server to start even if SPRINT_ROOT not needed; errors when actually used
**Implementation**: Validation in getProjectRoot() function

### Decision 3: Git Worktree Location
**Decision**: Keep worktrees in actual repository root (.worktrees/)
**Rationale**: Git worktrees are git-specific and should stay with the .git directory
**Implementation**: Worktree path helper uses process.cwd() not SPRINT_ROOT

### Decision 4: Invalid SPRINT_ROOT Handling
**Decision**: Error immediately when invalid path detected
**Rationale**: Fail-fast for predictable behavior and clear debugging
**Implementation**: Throw descriptive error in validation function

---

## Quality Gates

### Gate 1: After Phase 1
- [ ] project-config module tests pass with 100% coverage
- [ ] Code review complete
- **Decision**: Proceed to Phase 2 or iterate?

### Gate 2: After Phase 2
- [ ] All common module tests pass
- [ ] No integration test regressions
- [ ] Git worktrees validated
- **Decision**: Proceed to Phase 3 or fix issues?

### Gate 3: After Phase 3
- [ ] All MCP tool tests pass
- [ ] Manual testing successful
- [ ] No breaking changes detected
- **Decision**: Proceed to Phase 4 or fix bugs?

### Gate 4: After Phase 5
- [ ] Integration tests pass
- [ ] Edge cases handled
- [ ] Performance acceptable
- **Decision**: Proceed to documentation or add tests?

### Final Gate: Before Sprint Completion
- [ ] All phases complete
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Manual validation successful
- **Decision**: Ready for PR?

---

## Risk Management

### High-Risk Areas

**Risk 1: Git Worktree Path Issues**
- **Severity**: High
- **Mitigation**: Extra scrutiny on git-utils.ts; comprehensive testing; manual validation
- **Contingency**: Revert git-utils changes if issues found; address in follow-up sprint

**Risk 2: Breaking Existing Deployments**
- **Severity**: High
- **Mitigation**: Strict backward compatibility; extensive testing without SPRINT_ROOT
- **Contingency**: Immediate rollback if any breakage detected

**Risk 3: Test Isolation Conflicts**
- **Severity**: Medium
- **Mitigation**: Review process.chdir() patterns; add interaction tests
- **Contingency**: Adjust test isolation strategy if conflicts arise

---

## Success Criteria

### Functional (Must Have)
- [ ] All 6 MCP tools respect SPRINT_ROOT when set
- [ ] All tools work without SPRINT_ROOT (100% backward compatible)
- [ ] All 5 common modules use centralized config
- [ ] Git worktrees function correctly
- [ ] Compression subsystem works with SPRINT_ROOT

### Quality (Must Have)
- [ ] All tests pass (zero regressions)
- [ ] Test coverage maintained (>80% lines)
- [ ] Clean build (no warnings)
- [ ] Code review approved
- [ ] Documentation complete and accurate

### Performance (Nice to Have)
- [ ] No measurable performance degradation
- [ ] Startup time unchanged
- [ ] Tool execution time unchanged

---

## Testing Strategy

### Unit Tests
- Test each module in isolation
- Test with and without SPRINT_ROOT
- Test edge cases (empty, invalid, relative paths)
- Target: 100% coverage for project-config.ts

### Integration Tests
- Full sprint lifecycle with SPRINT_ROOT
- Multi-project scenarios
- Backward compatibility validation
- Error handling scenarios

### Manual Testing
- Test each MCP tool manually with SPRINT_ROOT set
- Test without SPRINT_ROOT to verify backward compatibility
- Test git worktree creation and removal
- Test sprint index regeneration

---

## Rollback Plan

If critical issues discovered during implementation:

### Option 1: Targeted Revert
- Identify problematic module/tool
- Revert specific changes
- Continue with rest of implementation

### Option 2: Full Rollback
- All changes isolated to specific functions
- Clean revert possible via git
- Return to planning if fundamental issues found

### Option 3: Hot Fix
- If issue is localized, fix in place
- Re-test affected phase
- Continue execution

---

## Files to Modify

### Production Files (10)
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

### Test Files (10)
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

### Integration Tests (2 new)
1. `src/__tests__/integration/sprint-root.test.ts` (NEW)
2. `src/__tests__/integration/backward-compatibility.test.ts` (NEW)

### Documentation (3)
1. `documentation/claude-desktop-installation-guide.md` (verify/update)
2. `README.md` (update)
3. `documentation/environment-variables.md` (NEW or update)

**Total: 25 files** (12 new/create, 13 modify)

---

## Reference Documentation

- **Analysis Document**: `planning/sprint-root-analysis.md`
- **Detailed Execution Plan**: `planning/sprint-root-execution-plan.md`
- **Prioritized Backlog**: `planning/sprint-root-backlog.yaml`
- **Executive Summary**: `planning/sprint-root-summary.md`

---

## Approval Required

Before proceeding to implementation (updating status to 'in-progress'):

- [ ] User has reviewed this implementation plan
- [ ] Design decisions approved
- [ ] Scope confirmed
- [ ] Risk mitigation strategies acceptable
- [ ] Success criteria clear

**Once approved, I will**:
1. Update sprint status to 'in-progress'
2. Begin Phase 1 implementation (project-config.ts)
3. Work through phases sequentially with quality gates
4. Provide updates at each checkpoint

---

## Notes

- All work will be done in the sprint worktree: `.worktrees/sprint-14-kmbtu7/`
- Main branch remains untouched until PR merged
- All prompts and actions logged in `request-log.md`
- Validation script created as part of completion criteria

---

**Status**: Awaiting user approval to proceed with implementation
