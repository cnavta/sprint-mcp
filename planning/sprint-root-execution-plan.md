# SPRINT_ROOT Implementation - Execution Plan

**Sprint Goal**: Implement SPRINT_ROOT environment variable support across all MCP tools
**Lead Implementor**: Claude
**Target Duration**: 8-12 hours (1-2 days)
**Date**: 2026-08-05

---

## Overview

This execution plan outlines the systematic implementation of `SPRINT_ROOT` environment variable support across the sprint-mcp codebase. The work is organized into 6 sequential phases, each with clear deliverables and validation criteria.

---

## Phase 1: Foundation - Centralized Configuration Module

### Objective
Create a single source of truth for project root path resolution.

### Deliverables
1. **`src/common/project-config.ts`**
   - Core function: `getProjectRoot()`
   - Helper functions for derived paths
   - Path validation logic
   - Comprehensive JSDoc documentation

2. **`src/common/__tests__/project-config.test.ts`**
   - Test default behavior (no SPRINT_ROOT)
   - Test with SPRINT_ROOT set
   - Test with empty/invalid SPRINT_ROOT
   - Test derived path helpers
   - Test edge cases

### Implementation Details

**API Design**:
```typescript
/**
 * Get the project root directory
 * @returns Absolute path to project root (from SPRINT_ROOT or process.cwd())
 */
export function getProjectRoot(): string;

/**
 * Get the planning directory path
 * @returns Absolute path to planning/ directory
 */
export function getPlanningDir(): string;

/**
 * Get the sprint index file path
 * @returns Absolute path to planning/sprint-index.yaml
 */
export function getSprintIndexPath(): string;

/**
 * Get the worktree path for a sprint
 * @param sprintId Sprint identifier
 * @returns Absolute path to .worktrees/{sprintId}
 */
export function getWorktreePath(sprintId: string): string;

/**
 * Get the sprint directory path
 * @param sprintId Sprint identifier
 * @returns Absolute path to planning/{sprintId}
 */
export function getSprintDir(sprintId: string): string;

/**
 * Get the manifest path for a sprint
 * @param sprintId Sprint identifier
 * @returns Absolute path to planning/{sprintId}/sprint-manifest.yaml
 */
export function getManifestPath(sprintId: string): string;

/**
 * Validate SPRINT_ROOT if set
 * @throws Error if SPRINT_ROOT is invalid
 */
export function validateSprintRoot(): void;
```

### Validation Criteria
- [ ] All tests pass
- [ ] 100% code coverage for project-config.ts
- [ ] No breaking changes to existing behavior
- [ ] Documentation complete

### Estimated Duration
1-2 hours

---

## Phase 2: Core Infrastructure - Common Modules

### Objective
Migrate all common modules to use centralized configuration.

### Deliverables

#### 2.1: sprint-index-manager.ts
- Replace `getSprintIndexPath()` implementation
- Replace `getPlanningDir()` implementation
- Update all direct `process.cwd()` calls
- Update tests

#### 2.2: sprint-index-validator.ts
- Replace `getPlanningDir()` implementation
- Update manifest path resolution
- Update tests

#### 2.3: git-utils.ts
- Replace `getWorktreePath()` implementation
- Update tests
- **CRITICAL**: Verify git worktree paths remain correct

#### 2.4: sprint-cleanup-utils.ts
- Replace planning directory path construction
- Update tests

### Implementation Pattern

**Before**:
```typescript
function getPlanningDir(): string {
  return join(process.cwd(), 'planning');
}
```

**After**:
```typescript
import { getPlanningDir } from './project-config.js';
// Remove local function, use imported version
```

### Validation Criteria
- [ ] All module tests pass
- [ ] No regressions in integration tests
- [ ] Backward compatibility verified
- [ ] Code review complete

### Estimated Duration
2-3 hours

---

## Phase 3: MCP Tools Migration

### Objective
Update all MCP tools to use centralized configuration.

### Deliverables

#### 3.1: start-sprint.ts
- Update `getNextSprintNumber()` to use `getPlanningDir()`
- Update sprint directory creation
- Update tests
- Verify sprint creation flow end-to-end

#### 3.2: check-sprint-status.ts
- Update planning directory reference
- Update tests
- Verify status checking with SPRINT_ROOT

#### 3.3: update-sprint-status.ts
- Update manifest path construction
- Update tests
- Verify status updates work correctly

#### 3.4: complete-sprint.ts
- Update `checkRequiredArtifacts()` path construction
- Update manifest path references
- Update tests
- Verify completion flow end-to-end

#### 3.5: cleanup-sprint.ts
- Already uses sprint-cleanup-utils (updated in Phase 2)
- Verify through integration tests only

### Implementation Pattern

**Before**:
```typescript
const planningDir = join(process.cwd(), 'planning');
const sprintDir = join(planningDir, sprintId);
```

**After**:
```typescript
import { getSprintDir } from '../common/project-config.js';
const sprintDir = getSprintDir(sprintId);
```

### Validation Criteria
- [ ] All tool tests pass
- [ ] Manual testing of each MCP tool
- [ ] Integration tests pass
- [ ] No breaking changes observed

### Estimated Duration
2-3 hours

---

## Phase 4: Compression Subsystem

### Objective
Update compression module to respect SPRINT_ROOT.

### Deliverables

#### 4.1: compression/config.ts
- Update `loadCompressionConfig()` path resolution
- Use `getProjectRoot()` instead of `process.cwd()`
- Update tests

### Implementation Pattern

**Before**:
```typescript
const resolvedPath = configPath.startsWith('/')
  ? configPath
  : join(process.cwd(), configPath);
```

**After**:
```typescript
import { getProjectRoot } from '../common/project-config.js';

const resolvedPath = configPath.startsWith('/')
  ? configPath
  : join(getProjectRoot(), configPath);
```

### Validation Criteria
- [ ] Compression tests pass
- [ ] Config loading works with SPRINT_ROOT
- [ ] Backward compatibility verified

### Estimated Duration
1 hour

---

## Phase 5: Integration Testing

### Objective
Validate end-to-end functionality with SPRINT_ROOT in real scenarios.

### Deliverables

#### 5.1: Multi-Project Test Suite (NEW)
Create `src/__tests__/integration/sprint-root.test.ts`:
- Test full sprint lifecycle with SPRINT_ROOT
- Test switching between projects
- Test concurrent operations (if applicable)
- Test error scenarios

#### 5.2: Backward Compatibility Test Suite (NEW)
- Verify all operations work without SPRINT_ROOT
- Ensure no behavioral changes
- Test upgrade path (existing sprints continue working)

#### 5.3: Edge Cases
- Invalid SPRINT_ROOT paths
- Missing directories
- Permission issues
- Symlinks (if relevant)

### Test Scenarios

**Scenario 1: Multi-Project Setup**
```typescript
// Simulate two different project roots
// Verify sprints stay isolated
```

**Scenario 2: Migration Path**
```typescript
// Start with no SPRINT_ROOT
// Add SPRINT_ROOT mid-flight
// Verify graceful handling
```

**Scenario 3: Error Handling**
```typescript
// Set SPRINT_ROOT to non-existent path
// Verify clear error message
```

### Validation Criteria
- [ ] All integration tests pass
- [ ] Edge cases handled gracefully
- [ ] Error messages are clear and actionable
- [ ] Performance acceptable

### Estimated Duration
1-2 hours

---

## Phase 6: Documentation and Polish

### Objective
Update all documentation to reflect SPRINT_ROOT support.

### Deliverables

#### 6.1: Installation Guide Update
**File**: `documentation/claude-desktop-installation-guide.md`
- Verify SPRINT_ROOT section is accurate
- Add examples
- Add troubleshooting section

#### 6.2: README Update
**File**: `README.md`
- Add SPRINT_ROOT to environment variables section
- Add quick start example with SPRINT_ROOT
- Link to detailed docs

#### 6.3: Environment Variables Guide (NEW or UPDATE)
**File**: `documentation/environment-variables.md`
- Document SPRINT_ROOT
- Document validation rules
- Document fallback behavior
- Add examples for common scenarios

#### 6.4: Migration Guide (if needed)
- How existing users can adopt SPRINT_ROOT
- Backward compatibility guarantees
- Troubleshooting common issues

### Validation Criteria
- [ ] Documentation is accurate
- [ ] Examples are tested
- [ ] Links are valid
- [ ] Terminology is consistent

### Estimated Duration
1 hour

---

## Quality Gates

### Gate 1: After Phase 1
**Criteria**:
- [ ] project-config module tests pass
- [ ] 100% coverage
- [ ] Code review approved
- **Decision**: Proceed to Phase 2 or iterate?

### Gate 2: After Phase 2
**Criteria**:
- [ ] All common module tests pass
- [ ] No integration test regressions
- [ ] Backward compatibility verified
- **Decision**: Proceed to Phase 3 or address issues?

### Gate 3: After Phase 3
**Criteria**:
- [ ] All MCP tool tests pass
- [ ] Manual testing successful
- [ ] No breaking changes
- **Decision**: Proceed to Phase 4 or fix bugs?

### Gate 4: After Phase 5
**Criteria**:
- [ ] Integration tests pass
- [ ] Edge cases handled
- [ ] Performance acceptable
- **Decision**: Proceed to documentation or add more tests?

### Final Gate: Before Sprint Completion
**Criteria**:
- [ ] All phases complete
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code review approved
- [ ] Manual validation successful
- **Decision**: Ready for PR?

---

## Rollback Plan

If critical issues are discovered:

### Option 1: Feature Flag (if time permits)
Add environment variable `SPRINT_ROOT_ENABLED=true` to gate the feature.

### Option 2: Revert
All changes are isolated to specific functions/modules. Clean revert possible.

### Option 3: Hot Fix
If issue is localized, fix in place and re-test affected phase.

---

## Communication Plan

### Stakeholders
- User (sponsoring the sprint)
- Future maintainers
- Documentation readers

### Checkpoints
1. After each phase completion
2. At each quality gate
3. When blockers are encountered
4. Before final PR

### Artifacts
- This execution plan
- Analysis document
- YAML backlog (trackable)
- Test reports
- PR description

---

## Risk Mitigation

### Risk: Breaking Existing Deployments
**Mitigation**:
- Maintain strict backward compatibility
- Test without SPRINT_ROOT extensively
- No behavior changes when SPRINT_ROOT not set

### Risk: Git Worktree Issues
**Mitigation**:
- Extra scrutiny on git-utils.ts changes
- Test worktree creation/removal thoroughly
- Consult git documentation on absolute vs relative paths

### Risk: Test Isolation Issues
**Mitigation**:
- Review all test patterns using process.chdir()
- Ensure SPRINT_ROOT doesn't interfere with chdir-based isolation
- Add explicit tests for SPRINT_ROOT + chdir interaction

### Risk: Scope Creep
**Mitigation**:
- Stick to backlog items
- Defer nice-to-haves to future sprints
- Focus on must-haves only

---

## Success Metrics

### Functional
- [ ] All 6 MCP tools work with SPRINT_ROOT
- [ ] All 5 common modules use centralized config
- [ ] 100% backward compatibility
- [ ] Zero test regressions

### Quality
- [ ] Test coverage maintained (>80% lines)
- [ ] No new linting errors
- [ ] Clean build
- [ ] Documentation complete

### Performance
- [ ] No measurable performance degradation
- [ ] Startup time unchanged
- [ ] Tool execution time unchanged

---

## Post-Implementation

### Validation Script
Create `validate_sprint_root.sh` to test SPRINT_ROOT functionality:
```bash
#!/bin/bash
# Test SPRINT_ROOT functionality
export SPRINT_ROOT="/tmp/test-project"
mkdir -p "$SPRINT_ROOT"
# Run MCP tools
# Verify sprints created in correct location
# Clean up
```

### Future Enhancements
- [ ] Add SPRINT_ROOT to MCP server info output
- [ ] Add debug logging for path resolution
- [ ] Add startup validation warning if SPRINT_ROOT invalid
- [ ] Consider caching for performance (if needed)

---

## Appendix: Command Reference

### Running Tests
```bash
# All tests
npm test

# Specific module
npm test -- src/common/__tests__/project-config.test.ts

# Coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Building
```bash
# Clean build
npm run clean && npm run build

# Watch mode
npm run watch
```

### Manual Testing
```bash
# Test with SPRINT_ROOT
SPRINT_ROOT=/tmp/test-project npm run dev

# Test without SPRINT_ROOT
npm run dev
```

---

## Next: YAML Backlog

This execution plan will be translated into a prioritized, trackable YAML backlog with:
- Granular tasks
- Story point estimates
- Dependencies
- Acceptance criteria
- Task relationships

See: `planning/sprint-root-backlog.yaml`
