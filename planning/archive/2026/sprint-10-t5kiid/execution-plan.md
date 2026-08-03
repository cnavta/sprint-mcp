# Sprint 10 Execution Plan

**Sprint ID**: sprint-10-t5kiid
**Title**: Testing Infrastructure and Coverage Improvements
**Goal**: Achieve ≥80% test coverage by implementing tests for sprint-cleanup-utils, cleanup-sprint, and complete-sprint modules using appropriate testing approach (integration vs unit)
**Owner**: christophernavta
**Created**: 2026-08-01

---

## Executive Summary

This sprint addresses the 16 P0 testing items deferred from Sprint 9. Based on Sprint 9 learnings, we will:
1. **Start with validation spike** to confirm integration test approach works
2. **Use integration tests** (real file ops, temp dirs) matching existing patterns
3. **Keep tests simple and focused** - target critical paths, not exhaustive edge cases
4. **Achieve 80% coverage strategically** by testing the 3 untested modules

**Current Coverage**: 47.58%
**Target Coverage**: ≥80%
**Untested Modules** (0% coverage):
- `src/common/sprint-cleanup-utils.ts`
- `src/tools/cleanup-sprint.ts`
- `src/tools/complete-sprint.ts`

---

## Sprint 9 Learnings Applied

### Learning 1: Validation Spike First
- **DO**: Create POC test file to validate integration approach before full implementation
- **DON'T**: Commit to full sprint without validating testing approach

### Learning 2: Integration Tests > Unit Tests with Mocks
- **Pattern**: Use mkdtemp for temp directories, real git operations, real file I/O
- **Rationale**: Existing tests (start-sprint, git-utils) use this approach successfully
- **Benefit**: Simpler, no Jest ES module mocking complexity

### Learning 3: Keep Tests Simple
- **User guidance**: "we don't need massive, deep integration tests"
- **Approach**: Focus on happy paths + critical error cases, skip exhaustive edge cases
- **Goal**: 80% coverage strategically, not 100% exhaustively

---

## Analysis of Current State

### Test Coverage Report (2026-08-01)

```
File                       | Stmts | Branch | Funcs | Lines | Uncovered Lines
---------------------------|-------|--------|-------|-------|------------------
src/common/
  sprint-cleanup-utils.ts  |     0 |      0 |     0 |     0 | All lines
src/tools/
  cleanup-sprint.ts        |     0 |      0 |     0 |     0 | All lines
  complete-sprint.ts       |     0 |      0 |     0 |     0 | All lines
  check-sprint-status.ts   |   100 |     85 |   100 |   100 | (tested)
  start-sprint.ts          | 94.02 | 80.64 |   100 | 94.02 | (tested)

Overall: 47.58% statements (target: 80%)
```

### Existing Test Patterns (from src/tools/__tests__/start-sprint.test.ts)

```typescript
describe('startSprintTool - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Initialize git repo
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');
    execSync('git branch -M main');
    execSync('echo "test" > .gitkeep');
    execSync('git add .gitkeep');
    execSync('git commit -m "Initial commit"');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it('should create a new sprint with all required artifacts', async () => {
    const result = await startSprintTool({ title, goal, owner });
    expect(isValidMCPResponse(result)).toBe(true);
    expect(isErrorResponse(result)).toBe(false);
  });
});
```

**Key Elements**:
- Temp directory isolation
- Real git operations (no mocks)
- Real file I/O (no mocks)
- MCP response validation helpers
- Clean up in afterEach

### Modules to Test

#### 1. `src/common/sprint-cleanup-utils.ts` (234 lines, 6 functions)

**Public Functions** (ordered by complexity):
1. `calculateDiskUsage(path: string): number` - Calls `du -sb`, parses output
2. `detectUncommittedChanges(worktreePath: string): boolean` - Calls `git status --porcelain`
3. `getCleanupCandidates(sprintId?: string): Promise<CleanupCandidate[]>` - Loads sprint index, filters completed sprints, checks worktrees
4. `validateCleanupSafety(sprintId: string): Promise<{valid, errors, warnings}>` - Validates sprint can be cleaned
5. `cleanupSprint(sprintId: string, options): Promise<CleanupResult>` - Orchestrates cleanup with validation
6. Helper types: `CleanupCandidate`, `CleanupOptions`, `CleanupResult`

**Test Strategy**: Integration tests with real temp directories and git operations

#### 2. `src/tools/cleanup-sprint.ts` (202 lines, 2 functions)

**Public Functions**:
1. `cleanupSprintTool(args): Promise<CleanupSprintResult>` - Preview mode, lists candidates
2. `executeCleanupSprintTool(args): Promise<CleanupSprintResult>` - Executes cleanup

**Test Strategy**: Integration tests calling actual functions with real sprint structures

#### 3. `src/tools/complete-sprint.ts` (228 lines, 3 functions)

**Public Functions**:
1. `isValidCompletionMode(mode: string): boolean` - Validates 'normal' or 'forced'
2. `validateSprintCompletion(sprintId, mode): Promise<{valid, errors, warnings}>` - Checks artifacts exist
3. `completeSprintTool(args): Promise<CompleteSprintResult>` - MCP tool handler

**Test Strategy**: Integration tests with real sprint artifact files

---

## Execution Phases

### Phase 0: Validation Spike (30 min)

**Goal**: Validate that integration test approach works for cleanup/complete-sprint modules

**Tasks**:
- Create single POC test file: `src/common/__tests__/sprint-cleanup-utils.test.ts`
- Write 1-2 simple integration tests for `calculateDiskUsage()` and `detectUncommittedChanges()`
- Verify tests run and pass
- Decision gate: Proceed if successful, research alternatives if blocked

**Success Criteria**:
- POC test file runs successfully
- Integration approach validated (temp dirs, real git, real file I/O)
- No Jest ES module mocking issues

**Risk Mitigation**: If validation fails, pivot to simpler approach or defer complex tests

### Phase 1: Test sprint-cleanup-utils.ts (90 min)

**Goal**: Achieve ≥85% coverage for sprint-cleanup-utils.ts

**Approach**: Integration tests matching existing patterns

**Test File**: `src/common/__tests__/sprint-cleanup-utils.test.ts`

**Test Cases** (organized by function):

1. **calculateDiskUsage()**
   - ✅ Happy path: Calculate disk usage for existing directory
   - ✅ Error: Non-existent directory returns 0
   - ⏭️  Skip: du command parsing edge cases (low value)

2. **detectUncommittedChanges()**
   - ✅ Clean worktree (no changes)
   - ✅ Worktree with uncommitted changes
   - ⏭️  Skip: Staged vs unstaged distinction (covered by git porcelain output)

3. **getCleanupCandidates()**
   - ✅ Find completed sprints with worktrees
   - ✅ Filter by specific sprintId
   - ✅ No candidates scenario
   - ⏭️  Skip: Sprint index load error (covered by sprint-index-manager tests)

4. **validateCleanupSafety()**
   - ✅ Valid completed sprint
   - ✅ Sprint not found error
   - ✅ Sprint not complete error
   - ⏭️  Skip: Planning directory warnings (non-critical)

5. **cleanupSprint()**
   - ✅ Successful cleanup of completed sprint
   - ✅ Validation failure blocks cleanup
   - ✅ Uncommitted changes blocks cleanup (without force)
   - ✅ Force flag overrides uncommitted changes warning
   - ⏭️  Skip: Worktree removal failures (low-level git operation)

**Estimated Test Cases**: 12 tests (focused on critical paths)

**Estimated Coverage**: ≥85% statements

### Phase 2: Test complete-sprint.ts (60 min)

**Goal**: Achieve ≥85% coverage for complete-sprint.ts

**Test File**: `src/tools/__tests__/complete-sprint.test.ts`

**Test Cases**:

1. **isValidCompletionMode()**
   - ✅ Valid: 'normal'
   - ✅ Valid: 'forced'
   - ✅ Invalid: 'invalid-mode'
   - ✅ Invalid: empty string

2. **validateSprintCompletion()**
   - ✅ Normal mode: All artifacts present
   - ✅ Normal mode: Missing artifact fails
   - ✅ Forced mode: Missing artifacts allowed (warnings only)
   - ⏭️  Skip: All permutations of missing artifacts

3. **completeSprintTool()**
   - ✅ Normal mode: Successful completion with all artifacts
   - ✅ Normal mode: Fails if artifact missing
   - ✅ Forced mode: Completes despite missing artifacts
   - ✅ Missing required args (sprintId, completionMode)
   - ⏭️  Skip: Update-sprint-status failures (covered by that module's tests)

**Estimated Test Cases**: 10 tests

**Estimated Coverage**: ≥85% statements

### Phase 3: Test cleanup-sprint.ts (60 min)

**Goal**: Achieve ≥85% coverage for cleanup-sprint.ts

**Test File**: `src/tools/__tests__/cleanup-sprint.test.ts`

**Test Cases**:

1. **cleanupSprintTool() - Preview Mode**
   - ✅ List all cleanup candidates
   - ✅ Filter to specific sprintId
   - ✅ No candidates found
   - ✅ Uncommitted changes warning (no force)
   - ⏭️  Skip: Disk usage formatting edge cases

2. **executeCleanupSprintTool() - Execution Mode**
   - ✅ Successful cleanup of completed sprint
   - ✅ Multiple sprints cleanup
   - ✅ Cleanup failure handling
   - ⏭️  Skip: Already covered by sprint-cleanup-utils tests

**Estimated Test Cases**: 7 tests

**Estimated Coverage**: ≥85% statements

### Phase 4: Coverage Validation and Adjustment (30 min)

**Goal**: Verify ≥80% overall coverage, add strategic tests if needed

**Tasks**:
- Run `npm run test:coverage`
- Identify any critical uncovered lines
- Add 2-3 targeted tests if coverage < 80%
- Document coverage in verification report

**Success Criteria**:
- Overall coverage ≥80% statements
- All new tests passing
- Build succeeds

### Phase 5: Sprint Completion Artifacts (30 min)

**Goal**: Create all required Sprint Protocol completion artifacts

**Artifacts**:
1. `verification-report.md` - Backlog reconciliation, coverage metrics
2. `retro.md` - What went well, what didn't, action items
3. `key-learnings.md` - Transferable insights for future sprints
4. `publication.yaml` - PR and branch metadata

**Success Criteria**:
- All 4 artifacts created
- Ready for normal mode completion
- PR created and linked

---

## Testing Strategy Summary

### Integration Test Template

```typescript
describe('moduleName - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Create sprint structure
    await mkdir('planning', { recursive: true });
    await mkdir('.worktrees', { recursive: true });

    // Initialize git (if needed for test)
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  it('should test critical path behavior', async () => {
    // Setup
    const sprintId = 'sprint-test-123';
    // ... create sprint artifacts

    // Execute
    const result = await functionUnderTest(args);

    // Assert
    expect(result.success).toBe(true);
  });
});
```

### What to Test (Focus)

✅ **DO Test**:
- Happy path (successful operations)
- Critical error cases (validation failures, missing required data)
- MCP response format validation
- File/directory existence checks
- Git operation results

⏭️  **SKIP Testing** (low value for simple MCP server):
- Exhaustive edge cases for string parsing
- All permutations of error states
- Low-level utility function internals (if already covered indirectly)
- Error message exact text (test structure, not wording)

### Coverage Strategy

**Target by Module**:
- sprint-cleanup-utils.ts: ≥85% (12 tests)
- complete-sprint.ts: ≥85% (10 tests)
- cleanup-sprint.ts: ≥85% (7 tests)

**Overall Target**: ≥80% statements

**Rationale**: These 3 modules represent ~30-35% of total codebase lines. Bringing them from 0% to 85% should lift overall coverage from 47.58% to ≥80%.

---

## Risk Assessment

### High Risks

**R1: Jest ES Module Mocking Issues Resurface**
- **Likelihood**: Low (using integration tests, not mocks)
- **Impact**: High (would block sprint)
- **Mitigation**: Validation spike in Phase 0 catches this early
- **Fallback**: Pivot to testing only simpler functions, defer complex ones

**R2: Integration Tests Take Longer Than Estimated**
- **Likelihood**: Medium
- **Impact**: Medium (might not reach 80% coverage)
- **Mitigation**: Focus on high-value tests first, skip low-value edge cases
- **Fallback**: Complete critical tests, defer P1 tests, document in retro

### Medium Risks

**R3: Temp Directory Cleanup Failures in CI**
- **Likelihood**: Low (existing tests work)
- **Impact**: Low (annoying but not blocking)
- **Mitigation**: Use same cleanup pattern as existing tests
- **Fallback**: Add force: true to rm() calls

**R4: Coverage Calculation Includes Type-Only Files**
- **Likelihood**: Low
- **Impact**: Low (might need to adjust target)
- **Mitigation**: Focus on statement coverage, not file count
- **Fallback**: Document in verification report

### Low Risks

**R5: Test Execution Time Increases Significantly**
- **Likelihood**: Medium (integration tests are slower)
- **Impact**: Low (developer experience)
- **Mitigation**: Keep tests focused, avoid unnecessary setup
- **Fallback**: Document in retro, consider test parallelization in future

---

## Success Criteria

### Must Have (P0)
- [ ] ≥80% overall test coverage (statements)
- [ ] All new tests passing
- [ ] Build succeeds (`npm run build`)
- [ ] Test suite succeeds (`npm test`)
- [ ] Validation spike successful (integration approach works)
- [ ] All 4 completion artifacts created

### Should Have (P1)
- [ ] ≥85% coverage for each of the 3 modules
- [ ] ≥30 total new test cases
- [ ] No test flakiness (all tests deterministic)
- [ ] Test execution time < 15 seconds total

### Nice to Have (P2)
- [ ] ≥90% overall coverage
- [ ] Compression/validation module tests (deferred from Sprint 9)
- [ ] Test organization documentation in README

---

## Dependencies

### External Dependencies
- None (all dependencies already installed)

### Internal Dependencies
- Existing test helpers in `src/tools/__tests__/test-helpers.ts`
- Existing Jest configuration
- Sprint Protocol compliance requirements

### Blockers
- None identified (validation spike will catch any issues early)

---

## Timeline Estimate

| Phase | Description | Estimated Time | Cumulative |
|-------|-------------|----------------|------------|
| 0 | Validation spike | 30 min | 30 min |
| 1 | Test sprint-cleanup-utils.ts | 90 min | 2h |
| 2 | Test complete-sprint.ts | 60 min | 3h |
| 3 | Test cleanup-sprint.ts | 60 min | 4h |
| 4 | Coverage validation | 30 min | 4.5h |
| 5 | Completion artifacts | 30 min | 5h |

**Total Estimated Effort**: 5 hours (P0 only)

**Buffer**: 1 hour (20% contingency for unforeseen issues)

**Target Duration**: 5-6 hours

---

## Deliverables Checklist

### Code Deliverables
- [ ] `src/common/__tests__/sprint-cleanup-utils.test.ts` (new file, ~250 lines)
- [ ] `src/tools/__tests__/complete-sprint.test.ts` (new file, ~200 lines)
- [ ] `src/tools/__tests__/cleanup-sprint.test.ts` (new file, ~150 lines)
- [ ] Updated `src/tools/__tests__/test-helpers.ts` (if new helpers needed)

### Sprint Artifacts
- [ ] `planning/sprint-10-t5kiid/execution-plan.md` (this file)
- [ ] `planning/sprint-10-t5kiid/backlog.yaml` (trackable YAML backlog)
- [ ] `planning/sprint-10-t5kiid/verification-report.md`
- [ ] `planning/sprint-10-t5kiid/retro.md`
- [ ] `planning/sprint-10-t5kiid/key-learnings.md`
- [ ] `planning/sprint-10-t5kiid/publication.yaml`

### Quality Gates
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Coverage ≥80% (`npm run test:coverage`)
- [ ] No linting errors
- [ ] Git worktree on correct branch
- [ ] All changes committed to feature branch
- [ ] PR created and linked in publication.yaml

---

## Notes

### Sprint 9 Deferred Items

This sprint addresses 16 P0 items deferred from Sprint 9:
- BL-003 to BL-009: sprint-cleanup-utils.ts tests (7 items)
- BL-010 to BL-012: cleanup-sprint.ts tests (3 items)
- BL-013 to BL-017: complete-sprint.ts tests (5 items)
- BL-018: Overall coverage ≥80% validation (1 item)

**Still Deferred** (P1 from Sprint 9):
- BL-024: npm scripts reference table (documentation)
- BL-025 to BL-029: Compression module tests (5 items)

These remain deferred to future sprints as P1 items.

### Testing Philosophy for This Sprint

Based on user guidance: "we don't need massive, deep integration tests and the MCP server itself is quite simple"

**Interpretation**:
- Focus on critical paths and important error cases
- Skip exhaustive edge case permutations
- Keep tests simple and readable
- Aim for 80% strategically, not 100% exhaustively
- Integration tests are fine (already proven to work)
- Don't overcomplicate with mocks if integration tests work

**Result**: Lean, focused test suite that validates critical functionality without excessive test burden.

---

## Approval Gate

**This execution plan requires explicit user approval before proceeding to implementation.**

Per Sprint Protocol §2.2 (Planning Phase), the LLM agent must:
1. Present this plan to the user
2. Wait for explicit approval
3. Only then proceed to backlog creation and implementation

**Approval Status**: ⏳ Pending

**Once approved**: Update sprint status to 'in-progress' and create backlog.yaml
