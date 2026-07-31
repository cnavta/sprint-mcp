# Execution Plan – sprint-3-c8f2a9

## Sprint Goal

Integrate git worktrees into Sprint Protocol and MCP tooling, add comprehensive test suite for MCP tools, and fix main baseline verification issues identified in sprint-2.

## Context

Sprint 2 completed successfully but identified two follow-up items:

1. **FOLLOW-002**: Feature branch creation before main baseline caused topology friction. Sprint initialization should verify main exists and establish baseline before creating feature branch.

2. **FOLLOW-003**: The start-sprint MCP tool failed during sprint-2 initialization (REQ-001), requiring manual fallback. No tests exist to catch tool regression.

Additionally, this sprint will enhance the workflow by integrating **git worktrees**, which provide:
- Isolated working directories for each sprint
- No context switching or file conflicts between sprints
- Main repository stays on main branch
- Parallel work on multiple sprints possible
- Clean separation of concerns

## Current State Analysis

### MCP Tool Status
**Build**: ✓ Passes (`npm run build` succeeds)
**Tests**: ✗ No tests exist (`npm test` finds 0 tests)
**Runtime**: Unknown (failed in sprint-2 but no detailed error logged)

**Code Structure**:
- `src/index.ts` - MCP server entry point
- `src/tools/start-sprint.ts` - Sprint initialization tool
- `src/tools/check-sprint-status.ts` - Status verification tool
- `src/common/file-utils.ts` - File system utilities
- `src/common/logger.ts` - Logging facade
- `src/types/sprint.ts` - TypeScript type definitions

### Current Sprint Initialization Flow

Per AGENTS.md § 2.2:
1. Check for active sprints
2. Generate sprint ID (`sprint-<number>-<hash>`)
3. Create sprint directory (`planning/sprint-<id>/`)
4. **Create feature branch** (`git checkout -b feature/...`)
5. Create `sprint-manifest.yaml`
6. Log to `request-log.md`
7. Verify branch before planning continues

**Issues**:
- No main baseline verification before branch creation
- Working tree conflicts when switching between sprints
- Single checkout limits parallel sprint work

### Git Worktree Integration Benefits

**Current Workflow**:
```
/Users/.../sprint-mcp/          (single checkout, switches branches)
```

**Proposed Workflow**:
```
/Users/.../sprint-mcp/                (main worktree, stays on main)
/Users/.../sprint-mcp/.worktrees/sprint-3-c8f2a9/  (sprint worktree)
/Users/.../sprint-mcp/.worktrees/sprint-4-d9e1b3/  (another sprint)
```

**Benefits**:
- Main worktree always on `main` branch - baseline always available
- Each sprint isolated in its own directory
- No file conflicts when switching context
- Can run builds/tests in multiple sprints simultaneously
- MCP server runs from main directory, tools operate on worktrees

## Proposed Solution

### Phase 1: Test Infrastructure (FOLLOW-003)

**Priority**: HIGHEST (first task per user requirement)

Create comprehensive test suite to prevent tool regression and catch runtime errors.

**Tasks**:
1. Set up Jest test directory structure (`src/**/__tests__/`)
2. Create test utilities and fixtures
3. Write unit tests for `start-sprint.ts`
4. Write unit tests for `check-sprint-status.ts`
5. Write integration tests for file operations
6. Add tests to CI/validation script
7. Achieve minimum 80% code coverage for tools

**Success Criteria**:
- `npm test` runs and passes
- All MCP tool functions have test coverage
- Tests catch the failure scenarios from sprint-2
- Tests run in `validate_deliverable.sh`

### Phase 2: Main Baseline Verification (FOLLOW-002 Part 1)

Fix the initialization sequence to verify main branch exists before proceeding.

**Tasks**:
1. Add `verifyMainBaseline()` function to utilities
2. Update `start-sprint.ts` to check main exists
3. Return error if main branch doesn't exist or has no commits
4. Add tests for baseline verification logic
5. Update Sprint Protocol (AGENTS-uncompressed.md) § 2.2 with verification step

**Success Criteria**:
- Tool fails gracefully if main doesn't exist
- Clear error message guides user to establish baseline
- Tests verify the check works correctly

### Phase 3: Git Worktree Integration (Protocol)

Update Sprint Protocol to specify worktree-based workflow.

**IMPORTANT**: All protocol changes must be made to **AGENTS-uncompressed.md** (the source file with explicit intent). AGENTS.md is a semantically compressed version for token efficiency and should NOT be modified directly.

**Tasks**:
1. Add worktree concept and benefits to AGENTS-uncompressed.md introduction
2. Update § 2.2 (Sprint Start) to use `git worktree add` instead of `git checkout -b`
3. Specify worktree directory structure (`.worktrees/sprint-<id>/`)
4. Update § 2.8 (Publication) to reference worktree cleanup
5. Add sprint completion step: remove worktree after PR merge
6. Update examples throughout protocol
7. Note: AGENTS.md will need recompression in a future sprint (out of scope)

**Changes**:
```diff
- 4. **Create a new feature branch**
-    git checkout -b feature/<sprint-id>-<short-description>
+ 4. **Create a new worktree for the sprint**
+    git worktree add .worktrees/sprint-<id> -b feature/<sprint-id>-<short-description>
```

**Success Criteria**:
- AGENTS-uncompressed.md clearly documents worktree workflow
- All git command examples in AGENTS-uncompressed.md updated
- Worktree cleanup documented in protocol
- Note added about AGENTS.md needing future recompression

### Phase 4: Git Worktree Integration (Tooling)

Update MCP tools to create and manage worktrees.

**Tasks**:
1. Add git worktree utilities to `common/git-utils.ts`:
   - `createWorktree()`
   - `listWorktrees()`
   - `removeWorktree()`
   - `verifyMainBranch()`
2. Update `start-sprint.ts`:
   - Call `verifyMainBranch()` before proceeding
   - Create worktree instead of checking out branch
   - Update paths to reference worktree directory
   - Create sprint artifacts in worktree's planning directory
3. Consider `complete-sprint` tool (optional):
   - Helper to remove worktree after completion
   - Or document manual cleanup in protocol
4. Update integration tests for worktree operations
5. Test end-to-end: sprint start → work → completion → cleanup

**Success Criteria**:
- `start-sprint` creates worktree successfully
- Sprint artifacts created in correct worktree location
- Main worktree remains on main branch
- Tools handle worktree paths correctly
- Tests verify worktree lifecycle

### Phase 5: Validation and Documentation

Ensure everything works together and is properly documented.

**Tasks**:
1. Create `validate_deliverable.sh` with:
   - Test suite execution
   - Worktree verification checks
   - Integration smoke tests
2. Update README.md with:
   - Worktree workflow explanation
   - Testing instructions
   - Development setup changes
3. Add architecture notes to `architecture.yaml` if applicable
4. Create migration guide for existing sprints
5. Run full validation suite

**Success Criteria**:
- All tests pass
- Validation script passes
- Documentation is clear and complete
- Migration path is documented

## Implementation Approach

### Test-First Development

For FOLLOW-003 (highest priority), we'll use Test-Driven Development:
1. Write failing tests that expose the sprint-2 failure scenarios
2. Implement fixes to make tests pass
3. Refactor with confidence

### Incremental Integration

For worktrees:
1. Protocol changes first (set the standard)
2. Utility functions second (build the primitives)
3. Tool integration third (use the primitives)
4. Validation fourth (prove it works)

This ensures tooling complements and implements protocol changes.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Worktree path issues on different OS | Use Node path utilities, test on multiple platforms |
| MCP server can't operate across worktrees | Server runs from main, tools use absolute paths |
| Existing sprints break with new workflow | Provide migration guide, make worktrees opt-in initially |
| Tests too slow or brittle | Use fixtures and mocks, keep tests isolated |
| Breaking changes to protocol | Version protocol, provide backwards compatibility notes |

## Dependencies

- Main branch must exist and have commits (resolved in sprint-2)
- Git 2.5+ required for worktree support
- Node.js file system APIs for path resolution
- Jest for testing infrastructure

## Success Criteria

### Must Have
- [ ] Test suite exists and passes (`npm test` ✓)
- [ ] Tests cover both MCP tools (start-sprint, check-sprint-status)
- [ ] Main baseline verification implemented and tested
- [ ] Sprint Protocol updated to specify worktree workflow
- [ ] `start-sprint` tool creates worktrees instead of checking out branches
- [ ] Worktree cleanup process documented
- [ ] `validate_deliverable.sh` passes all checks

### Should Have
- [ ] 80%+ test coverage on tools directory
- [ ] Integration tests for worktree lifecycle
- [ ] Complete worktree utility module
- [ ] Migration guide for existing workflow
- [ ] README updated with worktree documentation

### Nice to Have
- [ ] `complete-sprint` tool for automated cleanup
- [ ] Worktree status in `check-sprint-status` output
- [ ] CI integration for tests
- [ ] Performance benchmarks

## Out of Scope

- Migrating existing sprint-1 and sprint-2 to worktrees (manual if desired)
- Implementing full CI/CD pipeline (tests only)
- Windows-specific worktree path handling (if issues arise, document)
- Worktree-based merge strategies (use standard Git)

## Approval Gate

**Human approval required before proceeding to implementation.**

Please confirm:
1. Test infrastructure as highest priority (first task)
2. Worktree integration approach (protocol → utilities → tools → validation)
3. Success criteria alignment with sprint goals
4. Any additional requirements or changes to approach
