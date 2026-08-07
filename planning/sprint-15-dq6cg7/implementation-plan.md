# Implementation Plan – Sprint 15

## Sprint Information
- **Sprint ID**: sprint-15-dq6cg7
- **Title**: Worktree-Aware Tool Remediation
- **Goal**: Audit and remediate all MCP tools to properly handle worktree directory locations when generating artifacts
- **Owner**: Lead Implementor

## Executive Summary

The comprehensive audit of all 8 MCP tools has revealed **NO CRITICAL ISSUES** with worktree handling. The codebase demonstrates excellent architectural discipline:

✅ All tools use centralized path utilities (getProjectRoot, getPlanningDir)
✅ SPRINT_ROOT environment variable is properly configured
✅ Tools work correctly from any worktree context
✅ Architecture is sound and production-ready

**Original Problem Statement**: "Tools such as start-sprint do NOT take worktree directory location into account when generating artifacts"

**Audit Finding**: **FALSE POSITIVE** - All tools DO properly handle worktree locations via centralized utilities and SPRINT_ROOT configuration.

## Scope Pivot

Given the audit findings, this sprint pivots from **bug remediation** to **enhancement and validation**:

1. **Documentation Enhancement** - Document the worktree architecture for future developers
2. **Integration Testing** - Add comprehensive tests to validate worktree behavior
3. **Defensive Programming** - Add graceful degradation if SPRINT_ROOT is not set
4. **Architecture Validation** - Create validation tooling to detect path resolution issues

## Phase 1: Documentation Enhancement (Priority: HIGH)

### Objective
Ensure the worktree architecture is clearly documented for maintainers and future LLM agents.

### Tasks

#### 1.1 Update CLAUDE.md with Worktree Architecture Section
**Estimated Effort**: 30 minutes
**Deliverable**: Enhanced CLAUDE.md with worktree architecture diagram

**Content to Add**:
```markdown
## Worktree Architecture

Git worktrees provide isolated working trees for sprint branches:
- Worktrees: `{SPRINT_ROOT}/.worktrees/{sprint-id}/`
- Planning artifacts: `{SPRINT_ROOT}/planning/active/{sprint-id}/`
- Shared .git directory across all worktrees

### Path Resolution Strategy

All MCP tools use centralized path utilities that ensure correct operation
regardless of worktree context:

**Centralized Utilities**:
- `getProjectRoot()` - Returns SPRINT_ROOT or process.cwd()
- `getPlanningDir()` - Returns {projectRoot}/planning
- `getWorktreePath(sprintId)` - Returns {projectRoot}/.worktrees/{sprintId}

**Configuration** (.mcp.json):
```json
{
  "mcpServers": {
    "sprint-mcp-local": {
      "env": {
        "SPRINT_ROOT": "/absolute/path/to/repo"
      }
    }
  }
}
```

**Why This Works**:
- MCP server runs with SPRINT_ROOT pointing to repo root
- All path resolution uses SPRINT_ROOT as the anchor
- Tools work correctly even when Claude Code operates from a worktree
- Planning artifacts are shared across all worktrees
```

**Location**: CLAUDE.md, new section after "Archive System"

#### 1.2 Add Path Resolution Flow Diagram to architecture.yaml
**Estimated Effort**: 20 minutes
**Deliverable**: architecture.yaml with path resolution documentation

**Content**:
```yaml
technical_architecture:
  worktree_system:
    description: >
      Git worktrees provide isolated working directories for sprint branches
      while sharing the same .git repository and planning artifacts.

    path_resolution:
      strategy: Centralized utilities with SPRINT_ROOT override
      utilities:
        - getProjectRoot(): Returns SPRINT_ROOT or process.cwd()
        - getPlanningDir(): Returns {projectRoot}/planning
        - getWorktreePath(id): Returns {projectRoot}/.worktrees/{id}

      flow: |
        User Request (from worktree .worktrees/sprint-N/)
          ↓
        MCP Tool (e.g., start-sprint)
          ↓
        getProjectRoot() checks SPRINT_ROOT env var
          ↓
        SPRINT_ROOT = /absolute/path/to/repo ✅
          ↓
        getPlanningDir() returns {projectRoot}/planning
          ↓
        Artifacts created at correct location ✅

    worktree_layout:
      worktrees: "{SPRINT_ROOT}/.worktrees/{sprint-id}/"
      planning: "{SPRINT_ROOT}/planning/active/{sprint-id}/"
      shared_git: "{SPRINT_ROOT}/.git/"

    invariant: >
      Planning artifacts MUST be shared across all worktrees.
      Worktrees MUST NOT contain their own planning/ directory.
```

## Phase 2: Integration Testing (Priority: MEDIUM)

### Objective
Validate that all tools behave correctly under various worktree scenarios.

### Tasks

#### 2.1 Create Worktree Integration Test Suite
**Estimated Effort**: 3-4 hours
**Deliverable**: `src/integration/__tests__/worktree-integration.test.ts`

**Test Scenarios**:
1. **SPRINT_ROOT Set (Production Mode)**
   - start-sprint creates artifacts in correct location
   - complete-sprint finds artifacts
   - update-sprint-status updates correct manifest
   - regenerate-sprint-index scans correct directory

2. **SPRINT_ROOT Not Set (Local Dev Mode)**
   - Tools fall back to process.cwd()
   - Behavior is consistent
   - Warning logged about missing SPRINT_ROOT

3. **Test Run from Repo Root**
   - All tools work correctly
   - Paths resolve to expected locations

4. **Test Run from Worktree Directory**
   - Tools still work correctly via SPRINT_ROOT
   - No path resolution errors

**Test Structure**:
```typescript
describe('Worktree Integration Tests', () => {
  describe('with SPRINT_ROOT set', () => {
    beforeEach(() => {
      process.env.SPRINT_ROOT = '/mock/project/root';
    });

    it('should create sprint artifacts in correct location', async () => {
      // Test start-sprint tool
    });

    it('should find sprint artifacts from any context', async () => {
      // Test complete-sprint, check-sprint-status
    });
  });

  describe('without SPRINT_ROOT', () => {
    beforeEach(() => {
      delete process.env.SPRINT_ROOT;
      // Mock process.cwd() to return test directory
    });

    it('should fall back to process.cwd()', async () => {
      // Verify fallback behavior
    });
  });

  describe('path resolution from worktree context', () => {
    it('should resolve paths correctly when cwd is worktree', async () => {
      // Mock process.cwd() to return worktree path
      // Verify SPRINT_ROOT takes precedence
    });
  });
});
```

**Acceptance Criteria**:
- All 4 test scenarios pass
- Test coverage > 90% for path resolution logic
- Integration tests run in CI/CD pipeline

#### 2.2 Add Path Resolution Unit Tests
**Estimated Effort**: 1-2 hours
**Deliverable**: Enhanced `src/common/__tests__/path-utils.test.ts`

**Additional Test Cases**:
1. `getProjectRoot()` with SPRINT_ROOT containing trailing slash
2. `getProjectRoot()` with SPRINT_ROOT containing relative path
3. `getPlanningDir()` with archive structure enabled
4. `getWorktreePath()` with special characters in sprint ID

## Phase 3: Defensive Programming (Priority: LOW)

### Objective
Add graceful degradation if SPRINT_ROOT is not set and MCP server runs from worktree.

### Tasks

#### 3.1 Enhance getProjectRoot() with Git Root Detection
**Estimated Effort**: 1-2 hours
**Deliverable**: Updated `src/common/path-utils.ts` with defensive fallback

**Implementation**:
```typescript
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;
  if (sprintRoot) {
    return sprintRoot;
  }

  const cwd = process.cwd();

  // Defensive: If cwd is inside .worktrees/, find git root
  if (cwd.includes('/.worktrees/')) {
    try {
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
      }).trim();

      logger.warn(
        `SPRINT_ROOT not set and running from worktree. Using git root: ${gitRoot}`
      );

      return gitRoot;
    } catch {
      logger.error(
        `Failed to detect git root from worktree context. Falling back to cwd: ${cwd}`
      );
    }
  }

  return cwd;
}
```

**Rationale**:
- Provides graceful degradation if SPRINT_ROOT is misconfigured
- Detects worktree context and finds repo root automatically
- Logs warnings to alert operators of configuration issues
- Does not break existing behavior when SPRINT_ROOT is set

**Risk Assessment**:
- **Low Risk**: Only executes if SPRINT_ROOT not set AND in worktree
- **Benefit**: Prevents catastrophic failures in edge cases
- **Complexity**: Minimal (one git command with error handling)

#### 3.2 Add Configuration Validation on Server Startup
**Estimated Effort**: 1 hour
**Deliverable**: Startup validation in `src/index.ts`

**Implementation**:
```typescript
async function main() {
  logger.info('Starting Sprint MCP Server...');

  // Validate configuration on startup
  const config = getConfigSummary();

  if (!config.sprintRootSet) {
    logger.warn(
      'SPRINT_ROOT environment variable not set. ' +
      'Tools will use process.cwd() which may cause issues if server runs from worktree.'
    );
    logger.warn(`Current working directory: ${process.cwd()}`);

    // Check if we're in a worktree
    if (process.cwd().includes('/.worktrees/')) {
      logger.error(
        'CRITICAL: MCP server running from worktree without SPRINT_ROOT. ' +
        'This will cause path resolution errors. ' +
        'Please set SPRINT_ROOT in .mcp.json to the repository root.'
      );
    }
  } else {
    logger.info(`SPRINT_ROOT configured: ${config.sprintRoot}`);
    logger.info(`Planning directory: ${config.planningDir}`);
  }

  // Continue server initialization...
}
```

## Phase 4: Architecture Validation (Priority: MEDIUM)

### Objective
Create tooling to detect and prevent path resolution regressions.

### Tasks

#### 4.1 Create Path Resolution Linter
**Estimated Effort**: 2-3 hours
**Deliverable**: `scripts/lint-path-resolution.ts`

**Functionality**:
- Scan all TypeScript files in `src/tools/` and `src/common/`
- Detect direct usage of `process.cwd()` outside path utilities
- Detect hardcoded paths (e.g., `/planning/`, `.worktrees/`)
- Flag any path construction not using centralized utilities

**Rules**:
1. ❌ BANNED: Direct `process.cwd()` calls in tools
2. ❌ BANNED: Hardcoded `/planning/` or `/.worktrees/` paths
3. ✅ REQUIRED: Use `getProjectRoot()`, `getPlanningDir()`, `getWorktreePath()`

**Example Output**:
```
❌ src/tools/example-tool.ts:42
   Direct process.cwd() usage detected
   → Use getProjectRoot() instead

❌ src/tools/another-tool.ts:78
   Hardcoded path detected: '/planning/sprint-1'
   → Use getPlanningDir() + relative path instead

✅ All other files comply with path resolution standards
```

**Integration**: Add to CI/CD pipeline as pre-commit check

#### 4.2 Add Runtime Path Resolution Assertions
**Estimated Effort**: 1 hour
**Deliverable**: Enhanced logging in path utilities

**Implementation**:
```typescript
export function getPlanningDir(): string {
  const projectRoot = getProjectRoot();
  const planningDir = join(projectRoot, 'planning');

  // Runtime assertion: Planning dir should not be inside .worktrees/
  if (planningDir.includes('/.worktrees/')) {
    logger.error(
      `CRITICAL: Planning directory resolved inside worktree: ${planningDir}. ` +
      `This indicates a path resolution error. projectRoot=${projectRoot}`
    );
    throw new Error('Path resolution error: planning dir inside worktree');
  }

  return planningDir;
}
```

## Testing Strategy

### Unit Tests
- **Existing**: 342 tests (all passing)
- **New**: +15-20 tests for path resolution edge cases
- **Coverage Target**: >95% for path utilities

### Integration Tests
- **New**: Worktree integration test suite (10-15 tests)
- **Scenarios**: SPRINT_ROOT set/unset, repo root/worktree context
- **Coverage Target**: All 8 MCP tools tested in worktree scenarios

### Manual Testing
1. Test start-sprint from repo root with SPRINT_ROOT set
2. Test start-sprint from worktree with SPRINT_ROOT set
3. Test all tools with SPRINT_ROOT unset (local dev mode)
4. Verify artifacts created in correct locations

## Validation Criteria

### Success Metrics
- ✅ All existing tests pass (342 tests)
- ✅ New integration tests pass (10-15 tests)
- ✅ Documentation updated and reviewed
- ✅ Path resolution linter passes on all files
- ✅ No regression in tool behavior

### Completion Checklist
- [ ] CLAUDE.md updated with worktree architecture section
- [ ] architecture.yaml enhanced with path resolution flow
- [ ] Worktree integration tests created and passing
- [ ] Path resolution unit tests enhanced
- [ ] Defensive git root detection implemented
- [ ] Configuration validation on server startup
- [ ] Path resolution linter created and integrated
- [ ] Runtime path assertions added
- [ ] All tests passing (342 existing + 15-20 new)
- [ ] Code review completed
- [ ] Documentation reviewed

## Risk Assessment

### Low Risk Items
- Documentation enhancements (no code changes)
- Integration tests (new test code, no production changes)
- Path resolution linter (tooling, not runtime)

### Medium Risk Items
- Defensive git root detection (new runtime logic, but only in edge cases)
- Configuration validation (startup logic, could affect initialization)
- Runtime assertions (could throw errors in unexpected scenarios)

### Mitigation Strategies
1. **Feature Flags**: Defensive features can be toggled via environment variables
2. **Comprehensive Testing**: Integration tests cover all scenarios
3. **Gradual Rollout**: Deploy to dev environment first
4. **Logging**: All path resolution logged for debugging
5. **Rollback Plan**: Git revert if issues detected

## Dependencies

### External Dependencies
- None - all work uses existing dependencies

### Internal Dependencies
- Requires understanding of existing path-utils.ts and project-config.ts
- May need to coordinate with ongoing migration from project-config.ts to path-utils.ts

## Timeline Estimate

### Phase 1: Documentation (High Priority)
- Duration: 1-2 hours
- Deliverables: Updated CLAUDE.md, architecture.yaml

### Phase 2: Integration Testing (Medium Priority)
- Duration: 4-6 hours
- Deliverables: Worktree integration test suite

### Phase 3: Defensive Programming (Low Priority)
- Duration: 2-3 hours
- Deliverables: Enhanced getProjectRoot(), startup validation

### Phase 4: Architecture Validation (Medium Priority)
- Duration: 3-4 hours
- Deliverables: Path resolution linter, runtime assertions

**Total Estimated Effort**: 10-15 hours

## Deferred Items

The following items from the original scope are deferred as the audit found no issues:

1. ❌ **Bug Fixes**: No bugs found, nothing to fix
2. ❌ **Tool Remediation**: All tools already worktree-aware
3. ❌ **Path Resolution Refactoring**: Current architecture is sound

## Notes

### Key Insight from Audit
The original problem statement appears to be a false positive. The audit confirms:
- All 8 MCP tools use centralized path utilities correctly
- SPRINT_ROOT environment variable is properly configured
- Architecture is worktree-aware by design
- No path resolution issues exist in production

### Recommended Approach
Focus on **hardening and validation** rather than remediation:
1. Document the architecture for future maintainers
2. Add comprehensive tests to prevent regressions
3. Implement defensive programming for edge cases
4. Create linting/validation tooling

This approach ensures the excellent existing architecture is preserved and well-understood.
