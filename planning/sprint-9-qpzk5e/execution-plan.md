# Sprint 9 Execution Plan

**Sprint ID**: sprint-9-qpzk5e
**Title**: Test Coverage, Documentation, and README Updates
**Owner**: christophernavta
**Created**: 2026-08-01T14:28:31Z

---

## Executive Summary

This sprint addresses technical debt accumulated from Sprints 6-8 by improving code quality across three dimensions:

1. **Test Coverage**: Increase from 47.58% to ≥80% by adding unit tests for untested modules
2. **Documentation**: Complete JSDoc coverage for all public APIs and complex functions
3. **README**: Document all MCP tools and CLI commands comprehensively

**Scope**: Quality improvements only - no new features or behavioral changes.

**Target**: Achieve Sprint Protocol "Definition of Done" criteria for existing features.

---

## Current State Analysis

### Test Coverage Audit (as of 2026-08-01)

Current coverage: **47.58%** (below 80% threshold)

#### Modules with 0% Coverage (Critical)

| Module | Lines | Complexity | Priority |
|--------|-------|------------|----------|
| `src/common/sprint-cleanup-utils.ts` | 264 | Medium | P0 |
| `src/tools/cleanup-sprint.ts` | 232 | Medium | P0 |
| `src/tools/complete-sprint.ts` | 271 | High | P0 |
| `src/compression/semantic-extractor.ts` | 211 | High | P1 |
| `src/compression/compression-engine.ts` | 224 | High | P1 |
| `src/compression/validation-engine.ts` | 299 | High | P1 |
| `src/compression/cli.ts` | 216 | Medium | P1 |
| `src/compression/config.ts` | 161 | Low | P1 |
| `src/index.ts` (MCP server) | 188 | Medium | P1 |

#### Modules with Good Coverage (✓)

| Module | Coverage | Notes |
|--------|----------|-------|
| `src/common/git-utils.ts` | 87.2% | Excellent |
| `src/common/sprint-index-manager.ts` | 94.53% | Excellent |
| `src/common/sprint-index-validator.ts` | 92% | Excellent |
| `src/tools/check-sprint-status.ts` | 100% | Perfect |
| `src/tools/start-sprint.ts` | 94.02% | Excellent |
| `src/tools/update-sprint-status.ts` | 94.93% | Excellent |

**Analysis**:
- Sprint 4-5 modules (index system) have excellent coverage
- Sprint 7-8 modules (complete-sprint, cleanup-sprint) have 0% coverage
- Sprint 6 modules (compression) have 0% coverage
- Core utilities (git-utils, file-utils) have good coverage

**Root Cause**: Sprints 6-8 deferred unit tests to meet P0 delivery timeline.

### Documentation Audit

#### JSDoc Coverage by Module

| Module | JSDoc Status | Gap |
|--------|--------------|-----|
| `sprint-cleanup-utils.ts` | Partial | Missing function-level JSDoc for 6/9 functions |
| `complete-sprint.ts` | Partial | File header present, function JSDoc missing |
| `cleanup-sprint.ts` | Minimal | Only basic comments, no structured JSDoc |
| `compression/*.ts` | Good | File headers present, some function JSDoc exists |
| `git-utils.ts` | Excellent | Complete JSDoc for all public functions |
| `sprint-index-manager.ts` | Excellent | Complete JSDoc |

**Pattern**: Files from earlier sprints (1-5) have better JSDoc than later sprints (6-8).

**Missing Documentation**:
1. Function-level JSDoc for public APIs
2. Parameter descriptions with `@param` tags
3. Return value descriptions with `@returns` tags
4. Usage examples with `@example` tags (where helpful)
5. Error conditions with `@throws` tags

### README Audit

#### Current README Sections (✓)

- [x] Overview and features
- [x] Installation and setup
- [x] MCP server connection (Claude Desktop)
- [x] `start-sprint` tool documentation
- [x] `check-sprint-status` tool documentation
- [x] `regenerate-sprint-index` tool documentation
- [x] `update-sprint-status` tool documentation
- [x] Sprint Index explanation
- [x] Git Worktree workflow
- [x] Project structure
- [x] Logging

#### Missing README Content (✗)

- [ ] **`complete-sprint` tool** (Sprint 7 deliverable)
  - Purpose and workflow
  - Parameters and options
  - Example usage
  - Artifact validation details

- [ ] **`cleanup-sprint` tool** (Sprint 8 deliverable)
  - Dual interface (npm script + MCP tool)
  - Safety features
  - Usage examples for both interfaces
  - Warnings and confirmation flow

- [ ] **Compression CLI** (Sprint 6 deliverable)
  - `npm run compress:extract`
  - `npm run compress:agents`
  - `npm run compress:validate`
  - `npm run compress:all`
  - Configuration and semantic invariants

- [ ] **npm Scripts Reference**
  - Complete list of all package.json scripts
  - When to use each script

- [ ] **Testing Requirements**
  - Coverage thresholds (80% statements/lines/functions, 70% branches)
  - How to run tests
  - How to interpret coverage reports

- [ ] **Contributing Guidelines** (optional, P1)
  - Code style requirements
  - Testing requirements
  - Documentation requirements

**Total Missing**: 3 MCP tools + 1 CLI + 2 reference sections

---

## Goals and Success Criteria

### Primary Goals (P0)

**G1: Achieve 80% Test Coverage**
- **Metric**: Overall coverage ≥80% (statements, lines, functions), ≥70% branches
- **Evidence**: `npm run test:coverage` report shows thresholds met
- **Validation**: Jest exits with code 0 (no threshold violations)

**G2: Complete Critical Module Tests**
- **Target Modules**:
  - `src/common/sprint-cleanup-utils.ts` → ≥90% coverage
  - `src/tools/cleanup-sprint.ts` → ≥85% coverage
  - `src/tools/complete-sprint.ts` → ≥85% coverage
- **Rationale**: These are user-facing features from Sprints 7-8
- **Evidence**: Coverage report shows module-level metrics

**G3: Complete JSDoc for All Public APIs**
- **Target**: All exported functions have complete JSDoc
- **Requirements**:
  - Function description
  - `@param` tags for all parameters
  - `@returns` tag for return value
  - `@throws` tag if function can throw errors
  - `@example` tag for complex functions
- **Evidence**: TypeScript hover tooltips show complete documentation

**G4: Document All MCP Tools in README**
- **Target**: README documents all 6 MCP tools
- **Current**: 4/6 documented
- **Missing**: `complete-sprint`, `cleanup-sprint`
- **Evidence**: README has sections for both tools with usage examples

### Secondary Goals (P1)

**G5: Add Tests for Compression Modules** (Deferred OK)
- **Target**: ≥70% coverage for compression tools
- **Rationale**: Complex LLM integration, harder to test, lower usage frequency
- **Defer Condition**: If time-constrained, acceptable to defer to Sprint 10

**G6: Document Compression CLI in README** (Deferred OK)
- **Target**: README section explaining compression workflow
- **Defer Condition**: Can defer if tool is infrequently used

**G7: Add npm Scripts Reference** (Nice to Have)
- **Target**: Complete table of all package.json scripts
- **Defer Condition**: Can defer, scripts have --help

---

## Implementation Strategy

### Phase 1: Test Infrastructure Setup

**Duration**: 15-30 minutes
**Goal**: Prepare test utilities and helpers for new test suites

**Tasks**:
1. **Review existing test patterns** in `src/tools/__tests__/` and `src/common/__tests__/`
2. **Identify reusable test helpers** (mocking, fixtures, assertions)
3. **Create additional test helpers** if needed for cleanup/complete-sprint tests
4. **Set up test fixtures** (sample sprint manifests, index files)

**Output**: Test infrastructure ready for Phase 2

### Phase 2: Critical Module Testing (P0)

**Duration**: 2-3 hours
**Goal**: Achieve ≥80% coverage on sprint-cleanup-utils, cleanup-sprint, complete-sprint

#### 2.1: Test `sprint-cleanup-utils.ts`

**File**: `src/common/__tests__/sprint-cleanup-utils.test.ts` (new)

**Test Coverage**:
```typescript
describe('sprint-cleanup-utils', () => {
  describe('getCleanupCandidates', () => {
    // Test finding completed sprints with worktrees
    // Test filtering by sprintId
    // Test handling no candidates
    // Test handling sprint index errors
  });

  describe('calculateDiskUsage', () => {
    // Test calculating directory size
    // Test handling non-existent path
    // Test handling permission errors
    // Test fallback when du command fails
  });

  describe('detectUncommittedChanges', () => {
    // Test clean worktree (no changes)
    // Test worktree with uncommitted changes
    // Test worktree with staged changes
    // Test handling invalid worktree path
  });

  describe('validateCleanupSafety', () => {
    // Test completed sprint validation
    // Test blocking non-completed sprint
    // Test worktree existence check
    // Test uncommitted changes warning
  });

  describe('cleanupSprint', () => {
    // Test successful cleanup
    // Test cleanup with force flag
    // Test cleanup failure scenarios
    // Test disk usage reporting
  });

  describe('formatBytes', () => {
    // Test byte formatting (B, KB, MB, GB)
  });
});
```

**Estimated Coverage**: 90%+

**Approach**:
- Mock `execSync` for git commands and du
- Mock `removeWorktree` from git-utils
- Use test fixtures for sprint index
- Test both success and error paths

#### 2.2: Test `cleanup-sprint.ts` (MCP Tool)

**File**: `src/tools/__tests__/cleanup-sprint.test.ts` (new)

**Test Coverage**:
```typescript
describe('cleanup-sprint tool', () => {
  describe('cleanupSprintTool (preview mode)', () => {
    // Test listing all candidates
    // Test filtering by sprintId
    // Test warning messages for uncommitted changes
    // Test error handling (invalid sprintId)
  });

  describe('executeCleanupSprintTool', () => {
    // Test successful cleanup
    // Test cleanup with force flag
    // Test blocking on uncommitted changes (without force)
    // Test error reporting
  });
});
```

**Estimated Coverage**: 85%+

**Approach**:
- Mock sprint-cleanup-utils functions
- Test MCP response format (content array with text type)
- Verify isError flag set correctly
- Test parameter validation

#### 2.3: Test `complete-sprint.ts` (MCP Tool)

**File**: `src/tools/__tests__/complete-sprint.test.ts` (new)

**Test Coverage**:
```typescript
describe('complete-sprint tool', () => {
  describe('artifact validation', () => {
    // Test normal mode: all 4 artifacts required
    // Test forced mode: artifacts optional
    // Test artifact existence checking
    // Test error messages for missing artifacts
  });

  describe('status updates', () => {
    // Test successful completion (normal mode)
    // Test forced completion with warnings
    // Test updating sprint status to 'complete'
    // Test adding completion timestamp
    // Test adding PR URL if provided
  });

  describe('completion summary', () => {
    // Test summary format
    // Test listing validated artifacts
    // Test listing missing artifacts (forced mode)
    // Test next steps guidance
  });

  describe('error handling', () => {
    // Test invalid sprintId
    // Test invalid completion mode
    // Test missing required parameters
    // Test update-sprint-status failures
  });
});
```

**Estimated Coverage**: 85%+

**Approach**:
- Mock `fileExists` from file-utils
- Mock `updateSprintStatusTool`
- Use test fixtures for sprint manifests
- Test both normal and forced completion modes

**Phase 2 Completion Criteria**:
- All 3 test files created and passing
- Coverage for targeted modules ≥85%
- Overall coverage increased significantly (target: 60%+ after Phase 2)

### Phase 3: JSDoc Documentation (P0)

**Duration**: 1-1.5 hours
**Goal**: Complete JSDoc for all public APIs in sprint-cleanup-utils, cleanup-sprint, complete-sprint

#### Documentation Template

```typescript
/**
 * Brief function description (one line)
 *
 * Extended description if needed (optional, 1-3 sentences explaining
 * the function's purpose, behavior, and context).
 *
 * @param paramName - Description of parameter, including type details if complex
 * @param optionalParam - Description (optional)
 * @returns Description of return value, including possible values or structure
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * ```typescript
 * const result = functionName(arg1, arg2);
 * console.log(result); // Expected output
 * ```
 */
export async function functionName(
  paramName: string,
  optionalParam?: boolean
): Promise<Result> {
  // implementation
}
```

#### Files to Document

1. **`src/common/sprint-cleanup-utils.ts`**
   - `getCleanupCandidates()` - Full JSDoc
   - `calculateDiskUsage()` - Full JSDoc (already has basic, enhance)
   - `detectUncommittedChanges()` - Full JSDoc
   - `validateCleanupSafety()` - Full JSDoc
   - `cleanupSprint()` - Full JSDoc with example
   - `formatBytes()` - Full JSDoc

2. **`src/tools/cleanup-sprint.ts`**
   - File header already exists ✓
   - `cleanupSprintTool()` - Add JSDoc
   - `executeCleanupSprintTool()` - Add JSDoc

3. **`src/tools/complete-sprint.ts`**
   - File header already exists ✓
   - `isValidCompletionMode()` - Add JSDoc
   - `validateArtifacts()` - Add JSDoc
   - `completeSprintTool()` - Add JSDoc with example

**Phase 3 Completion Criteria**:
- All public functions have complete JSDoc
- TypeScript hover shows full documentation
- No missing `@param`, `@returns`, or `@throws` tags

### Phase 4: README Updates (P0)

**Duration**: 1 hour
**Goal**: Document complete-sprint and cleanup-sprint tools comprehensively

#### 4.1: Add `complete-sprint` Tool Documentation

**Location**: After `update-sprint-status` section (around line 182)

**Content Structure**:
```markdown
### `complete-sprint`

Complete a sprint by validating artifacts, updating status, and providing completion summary.

**Parameters**:
- `sprintId` (string, required): Sprint ID to complete
- `completionMode` (string, required): `normal` or `forced`
- `pr` (string, optional): Pull request URL if already created

**Example**:
[JSON example]

**Behavior**:
- Validates 4 required artifacts (verification-report.md, retro.md, key-learnings.md, publication.yaml)
- Updates sprint status to 'complete'
- Adds completion timestamp
- Adds PR URL if provided
- Returns completion summary

**Completion Modes**:
- `normal`: All 4 artifacts must exist (strict)
- `forced`: Allows completion despite missing artifacts (with warnings)

**When to Use**:
- After completing all sprint deliverables
- After creating PR and pushing changes
- When ready to close sprint and move to next one

**Output Example**:
[Show example completion summary]
```

#### 4.2: Add `cleanup-sprint` Tool Documentation

**Location**: After `complete-sprint` section

**Content Structure**:
```markdown
### `cleanup-sprint`

Safely remove git worktrees for completed sprints while preserving planning artifacts.

**Dual Interface**: Available as both MCP tool (for agents) and npm script (for humans).

**Parameters** (MCP tool):
- `sprintId` (string, optional): Sprint ID to cleanup. If omitted, shows all candidates.
- `force` (boolean, optional): Force removal even if uncommitted changes exist

**Example** (MCP tool):
[JSON example]

**Example** (npm script):
```bash
# Interactive cleanup (shows candidates)
npm run sprint:cleanup

# Cleanup specific sprint
npm run sprint:cleanup -- --sprint=sprint-6-24txmg

# Auto-confirm (for scripts)
npm run sprint:cleanup -- --sprint=sprint-6-24txmg --yes

# Force cleanup (ignores uncommitted changes)
npm run sprint:cleanup -- --sprint=sprint-6-24txmg --force --yes
```

**Safety Features**:
- Only cleans up completed sprints (status check)
- Never deletes planning directories
- Warns about uncommitted changes
- Requires explicit confirmation (interactive mode)
- Shows disk space to be freed

**What Gets Deleted**:
✗ Worktree directory: `.worktrees/sprint-<id>/`

**What Gets Preserved**:
✓ Planning directory: `planning/sprint-<id>/`
✓ All sprint artifacts (manifest, backlog, retro, etc.)
✓ Sprint index entry

**When to Use**:
- After sprint PR is merged
- When disk space is needed
- When cleaning up orphaned worktrees
```

#### 4.3: Add npm Scripts Reference (Optional, P1)

**Location**: After "Development" section (around line 293)

**Content**:
```markdown
### Available npm Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run build` | Compile TypeScript to dist/ | Before running server, before tests |
| `npm run watch` | Compile in watch mode | During development |
| `npm test` | Run test suite | Before committing, in CI |
| `npm run test:watch` | Run tests in watch mode | During TDD development |
| `npm run test:coverage` | Generate coverage report | Before committing, to check coverage |
| `npm run dev` | Build and run MCP server | Testing MCP server locally |
| `npm run sprint:index:regenerate` | Rebuild sprint index | When index is corrupted or out of sync |
| `npm run sprint:cleanup` | Cleanup sprint worktrees | After sprint completion and PR merge |
| `npm run compress:extract` | Extract semantic invariants | When updating AGENTS-uncompressed.md |
| `npm run compress:agents` | Compress AGENTS.md | After extracting invariants |
| `npm run compress:validate` | Validate compression | After compressing AGENTS.md |
| `npm run compress:all` | Run full compression pipeline | When updating protocol |
```

**Phase 4 Completion Criteria**:
- README documents all 6 MCP tools
- complete-sprint section includes examples and completion modes
- cleanup-sprint section includes both MCP and npm script usage
- npm scripts reference table complete (if time permits)

### Phase 5: Compression Module Testing (P1, Deferred OK)

**Duration**: 2-3 hours (if time permits)
**Goal**: Add tests for compression tools to reach 70% coverage

**Rationale for P1**:
- Compression tools are complex (LLM integration)
- Require API credentials for full testing
- Used infrequently (only when updating protocol)
- Can mock LLM calls but provides less value than mocking git operations

**Approach** (if pursued):
1. Mock `generateObject` from `ai` package
2. Test semantic-extractor with canned responses
3. Test compression-engine transformation logic
4. Test validation-engine comparison logic
5. Test CLI argument parsing and workflow

**Deferral Criteria**:
- If Phase 1-4 take longer than expected
- If overall coverage reaches 80% without compression tests
- If sprint time budget exceeded (3-4 hours total)

**Phase 5 Completion Criteria** (if pursued):
- Compression modules achieve ≥70% coverage
- Overall coverage reaches 85%+

### Phase 6: Validation and Verification (P0)

**Duration**: 30 minutes
**Goal**: Validate sprint deliverables meet acceptance criteria

**Validation Steps**:
1. **Run full test suite**: `npm test`
   - All tests must pass
   - No test failures or errors

2. **Check coverage**: `npm run test:coverage`
   - Overall coverage ≥80% (statements, lines, functions)
   - Branch coverage ≥70%
   - No threshold violations (Jest exits code 0)

3. **Verify JSDoc completeness**:
   - Open each documented file in VS Code
   - Hover over each public function
   - Verify complete JSDoc appears in tooltip

4. **Verify README completeness**:
   - README includes complete-sprint section with examples
   - README includes cleanup-sprint section with dual interface examples
   - All 6 MCP tools documented

5. **Build verification**: `npm run build`
   - TypeScript compilation succeeds
   - No build errors or warnings

**Acceptance Criteria**:
- ✅ Test coverage ≥80% overall
- ✅ All new tests passing
- ✅ JSDoc complete for all public APIs in sprint-cleanup-utils, cleanup-sprint, complete-sprint
- ✅ README documents complete-sprint and cleanup-sprint tools
- ✅ Build succeeds without errors

---

## Risk Assessment

### Risk 1: Coverage Target Too Ambitious

**Probability**: Medium
**Impact**: Medium

**Scenario**: Cannot reach 80% coverage without testing compression modules or MCP server entry point.

**Mitigation**:
- Focus on sprint-cleanup-utils, cleanup-sprint, complete-sprint first (largest gap)
- Defer compression tests to P1 (acceptable)
- MCP server entry point (src/index.ts) can remain at 0% (integration testing, not unit testing)

**Contingency**:
- Accept 70-75% coverage if time-constrained
- Document remaining gaps in retro
- Plan Sprint 10 for compression test coverage

### Risk 2: Time Estimation Inaccurate

**Probability**: Low
**Impact**: Low

**Scenario**: Testing takes longer than 2-3 hours estimate.

**Mitigation**:
- Use existing test patterns from check-sprint-status, start-sprint tests
- Reuse test helpers and fixtures
- Focus on happy path + critical error paths (not exhaustive edge cases)

**Contingency**:
- Defer P1 items (compression tests, npm scripts reference)
- Reduce JSDoc examples if time-constrained
- Maintain P0 focus: cleanup/complete-sprint modules only

### Risk 3: Unforeseen Test Complexity

**Probability**: Low
**Impact**: Medium

**Scenario**: Cleanup/complete-sprint functions are harder to test than expected.

**Mitigation**:
- Review existing test patterns first (Phase 1)
- Mock external dependencies aggressively
- Use test fixtures for file system operations

**Contingency**:
- Reduce coverage target to 70% for complex modules
- Focus on critical code paths only
- Document testing challenges in retro

---

## Open Questions

### Q1: Should we test MCP server entry point (src/index.ts)?

**Context**: src/index.ts has 0% coverage. It's the MCP server initialization and request routing.

**Options**:
- **A**: Add integration tests for MCP server (mock stdio transport, send requests, verify responses)
- **B**: Keep at 0% coverage (treat as integration layer, not unit testable)

**Recommendation**: **Option B** (keep at 0%)

**Rationale**:
- Entry point is thin glue code (routing requests to tool handlers)
- Tool handlers already have comprehensive tests
- Integration testing MCP protocol is complex (requires mocking stdio, MCP SDK)
- Low value for effort (mostly boilerplate from MCP SDK examples)
- Can be tested via manual MCP testing in Claude Desktop

**Decision Required**: Human approval

### Q2: Should we add tests for compression modules in this sprint?

**Context**: Compression modules (Sprint 6) have 0% coverage and are complex LLM integrations.

**Options**:
- **A**: Add in Sprint 9 (aim for 70% coverage, defer if time-constrained)
- **B**: Defer to Sprint 10 (focus only on cleanup/complete-sprint in Sprint 9)

**Recommendation**: **Option A** (try in Sprint 9, defer if needed)

**Rationale**:
- Compression tools are valuable and should have tests
- Can mock LLM calls for unit testing
- Provides more complete test suite
- But OK to defer if time budget exceeded

**Decision Required**: Human approval during sprint if time-constrained

### Q3: Should we add examples to all JSDoc or only complex functions?

**Context**: JSDoc `@example` tags are helpful but add verbosity.

**Options**:
- **A**: Add examples to all public functions
- **B**: Add examples only to complex/non-obvious functions
- **C**: No examples (description + params/returns sufficient)

**Recommendation**: **Option B** (examples for complex functions only)

**Rationale**:
- Examples are most helpful for complex functions (e.g., cleanupSprint, completeSprintTool)
- Simple functions (e.g., formatBytes, isValidCompletionMode) don't need examples
- Balances helpfulness with maintainability

**Decision Required**: None (proceed with Option B unless human requests otherwise)

### Q4: Should we add a "Contributing" section to README?

**Context**: README currently lacks contributing guidelines.

**Options**:
- **A**: Add comprehensive contributing section (code style, testing, docs requirements)
- **B**: Add minimal contributing section (link to Sprint Protocol)
- **C**: Skip contributing section (README already long)

**Recommendation**: **Option C** (skip for now)

**Rationale**:
- Sprint Protocol (AGENTS.md, CLAUDE.md) already defines contribution requirements
- README is already comprehensive (417 lines)
- Can add in future sprint if external contributors emerge

**Decision Required**: None (proceed with Option C unless human requests otherwise)

---

## Definition of Done

Sprint 9 is complete when:

**Tests**:
- [x] Test suite passes with no failures
- [x] Coverage ≥80% overall (statements, lines, functions)
- [x] Coverage ≥70% branches
- [x] New test files created for sprint-cleanup-utils, cleanup-sprint, complete-sprint
- [x] Coverage for those 3 modules individually ≥85%

**Documentation**:
- [x] All public functions in sprint-cleanup-utils have complete JSDoc
- [x] All public functions in cleanup-sprint have complete JSDoc
- [x] All public functions in complete-sprint have complete JSDoc
- [x] JSDoc includes @param, @returns, @throws tags where applicable
- [x] Complex functions include @example tags

**README**:
- [x] README includes complete-sprint tool section with examples
- [x] README includes cleanup-sprint tool section with dual interface examples
- [x] All 6 MCP tools documented in README

**Build**:
- [x] TypeScript compilation succeeds (npm run build)
- [x] No build errors or warnings

**Verification**:
- [x] verification-report.md created with backlog reconciliation
- [x] All P0 items complete or explicitly deferred with rationale

**Protocol Compliance**:
- [x] All work performed in sprint-9 worktree
- [x] All changes committed to feature branch
- [x] Sprint artifacts complete (retro.md, key-learnings.md, publication.yaml)

---

## Time Estimate

**Total Estimated Duration**: 4-6 hours

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Test Infrastructure Setup | 0.5h | 0.5h |
| Phase 2: Critical Module Testing | 2.5h | 3h |
| Phase 3: JSDoc Documentation | 1.25h | 4.25h |
| Phase 4: README Updates | 1h | 5.25h |
| Phase 5: Compression Testing (P1) | 0-2h | 5.25-7.25h |
| Phase 6: Validation | 0.5h | 5.75-7.75h |

**P0 Completion Target**: 5-6 hours
**P0+P1 Completion Target**: 7-8 hours

**Notes**:
- Phase 5 is optional (P1)
- Estimates assume familiarity with existing test patterns
- Estimates include time for test debugging and coverage verification

---

## Success Metrics

**Quantitative**:
- Test coverage: 47.58% → ≥80%
- Test files: 7 → 10 (add 3 new test files)
- Documented MCP tools in README: 4 → 6
- JSDoc-documented functions: ~30 → ~45

**Qualitative**:
- Developer experience: Clear documentation for all tools
- Code confidence: High test coverage reduces regression risk
- Onboarding: New contributors can understand codebase from JSDoc and README
- Protocol compliance: Meets "Definition of Done" from Sprint Protocol

**Sprint Health**:
- P0 completion rate: Target 100%
- P1 completion rate: Target ≥50% (compression tests optional)
- Process adherence: All work in worktree, proper artifact creation
- Knowledge capture: Retro and key learnings document testing patterns

---

## Appendix: Test Patterns Reference

### Pattern 1: Mocking execSync for Git Commands

```typescript
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// In test:
mockExecSync.mockReturnValue('mocked output');
```

### Pattern 2: Mocking File System Operations

```typescript
import { fileExists } from '../common/file-utils.js';

jest.mock('../common/file-utils.js', () => ({
  fileExists: jest.fn(),
}));

const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;

// In test:
mockFileExists.mockResolvedValue(true);
```

### Pattern 3: Testing MCP Tool Response Format

```typescript
it('should return correct MCP response format', async () => {
  const result = await toolFunction(args);

  expect(result).toHaveProperty('content');
  expect(Array.isArray(result.content)).toBe(true);
  expect(result.content[0]).toHaveProperty('type', 'text');
  expect(result.content[0]).toHaveProperty('text');
  expect(result.isError).toBe(false); // or true for error cases
});
```

### Pattern 4: Using Test Fixtures

```typescript
// test-fixtures.ts
export const mockSprintManifest = {
  id: 'sprint-test-abc123',
  title: 'Test Sprint',
  status: 'complete' as const,
  // ... other fields
};

// In test:
import { mockSprintManifest } from './test-fixtures.js';
mockLoadManifest.mockResolvedValue(mockSprintManifest);
```

---

## Next Steps After Approval

1. **Human reviews execution plan**
2. **Human approves plan or requests changes**
3. **If approved**:
   - Update sprint status to 'in-progress'
   - Create backlog.yaml with granular tasks
   - Begin Phase 1 implementation
4. **If changes requested**:
   - Revise execution plan
   - Re-submit for approval

---

**End of Execution Plan**
