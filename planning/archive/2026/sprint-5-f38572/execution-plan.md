# Sprint 5 Execution Plan
## Complete Sprint 4 Deferred Work

**Sprint Goal**: Complete all 10 deferred tasks from Sprint 4, achieving 100% completion of the Sprint Index System with comprehensive testing, validation layer, and documentation.

**Estimated Duration**: 7-9 hours
**Owner**: Christopher Navta
**Dependencies**: Sprint 4 (sprint-4-d9e2f1) must be complete

---

## Executive Summary

Sprint 4 delivered a **production-ready sprint index system** with all critical functionality complete (100% test coverage, atomic operations, regeneration tooling). This sprint completes the enhancement layer:

**What This Sprint Adds**:
- ✨ Validation layer for proactive issue detection
- ✨ Comprehensive integration test coverage for all MCP tools
- ✨ Complete user and developer documentation
- ✨ Troubleshooting guides

**Success Criteria**:
- All 10 deferred tasks completed
- Test coverage remains at 100% (78+ tests)
- Build passing
- Validation layer integrated and tested
- Documentation complete and reviewed

---

## Sprint Overview

### Task Breakdown by Category

**Validation Layer** (4 tasks, ~3h 45m):
- Core validation logic implementation
- Comprehensive test suite
- Integration into existing MCP tools
- Non-fatal error handling

**Test Coverage** (3 tasks, ~1h 45m):
- regenerate-sprint-index integration tests
- start-sprint index integration tests
- update-sprint-status integration tests

**Documentation** (3 tasks, ~2h 15m):
- Sprint Protocol documentation (AGENTS-uncompressed.md)
- User documentation (README.md)
- Troubleshooting guide

**Total**: 10 tasks, ~7h 45m

---

## Implementation Phases

### Phase 1: Validation Layer Foundation (2.5 hours)
**Critical Path - Build First**

#### Task 1: Implement Validation Logic (TASK-012)
**Duration**: 1.5 hours
**Priority**: P1-HIGH (Most valuable enhancement)

**Objective**: Create `sprint-index-validator.ts` module to detect index inconsistencies.

**Deliverables**:
- `src/common/sprint-index-validator.ts`
- Type definitions: `ValidationIssue`, `IndexValidationResult`
- Function: `validateSprintIndex()`

**Validation Checks**:
1. Schema validation (version, required fields)
2. Entry validation (id, title, status, owner, etc.)
3. Status enum validation
4. Manifest file existence
5. Data consistency (index vs. manifest)
6. Orphaned manifest detection
7. Statistics accuracy

**Implementation Approach**:
```typescript
export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  sprintId?: string;
  field?: string;
}

export interface IndexValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  validatedAt: string;
}

export async function validateSprintIndex(): Promise<IndexValidationResult>
```

**Key Principles**:
- Return structured results (not thrown errors)
- Distinguish errors vs. warnings
- Provide actionable error codes and messages
- Non-blocking (always returns result)

---

#### Task 2: Write Validation Tests (TASK-013)
**Duration**: 1 hour
**Priority**: P1-HIGH
**Dependencies**: TASK-012

**Objective**: Comprehensive test suite for validation logic.

**Deliverables**:
- `src/common/__tests__/sprint-index-validator.test.ts`

**Test Scenarios**:
- ✅ Valid index passes validation
- ❌ Missing required fields detected
- ❌ Invalid status values detected
- ❌ Missing manifest files detected
- ⚠️  Orphaned manifests detected (warning)
- ❌ Data inconsistencies detected
- ❌ Statistics mismatch detected
- ✅ Multiple issues reported together
- ✅ Validation result structure correct

**Test Data**:
- Create fixture files for various scenarios
- Use temporary directories for isolation
- Mock file I/O where appropriate

---

### Phase 2: Test Coverage Completion (1h 45m)
**Can Run in Parallel with Phase 3**

#### Task 3: Integration Tests for Regenerate Tool (TASK-005)
**Duration**: 30 minutes
**Priority**: P2-LOW

**Objective**: Integration tests for `regenerate-sprint-index` MCP tool.

**Deliverables**:
- `src/tools/__tests__/regenerate-sprint-index.test.ts`

**Test Scenarios**:
- Regeneration with zero sprints
- Regeneration with multiple sprints (1, 5, 10)
- Regeneration with corrupted manifest (graceful skip)
- Statistics computation accuracy
- File I/O operations
- MCP tool wrapper vs. core function

**Pattern**: Follow existing integration test patterns from start-sprint tests.

---

#### Task 4: Update Start-Sprint Tests (TASK-009)
**Duration**: 30 minutes
**Priority**: P2-LOW

**Objective**: Add tests verifying start-sprint correctly updates sprint index.

**Deliverables**:
- Extend `src/tools/__tests__/start-sprint.test.ts`

**Test Scenarios**:
- Sprint added to index after creation
- Index statistics updated correctly
- Non-fatal index failure handling
- Index entry contains all required fields (id, title, status, owner, createdAt, manifestPath, branch)

**Approach**: Extend existing test suite with additional assertions on index file.

---

#### Task 5: Tests for Update-Sprint-Status Tool (TASK-011)
**Duration**: 45 minutes
**Priority**: P1-HIGH (Critical path coverage)

**Objective**: Comprehensive test suite for `update-sprint-status` MCP tool.

**Deliverables**:
- `src/tools/__tests__/update-sprint-status.test.ts`

**Test Scenarios**:
- Status update (manifest + index atomic)
- completedAt timestamp update
- completionMode update
- PR URL update
- Invalid status rejection
- Sprint not found error
- Partial updates (only some fields)
- Non-fatal index update failures

**Pattern**: Use real manifest files in temp directories, verify atomicity.

---

### Phase 3: Validation Integration (1h 15m)
**Dependencies: Phase 1 Complete**

#### Task 6: Integrate Validation into Regenerate Tool (TASK-014)
**Duration**: 30 minutes
**Priority**: P1-HIGH

**Objective**: Call validation after regeneration and report issues.

**Deliverables**:
- Modified `src/tools/regenerate-sprint-index.ts`

**Implementation**:
```typescript
const index = await regenerateSprintIndex();
const validation = await validateSprintIndex();

if (!validation.valid) {
  resultText += `\n**Validation Issues**:\n`;
  // List errors and warnings with remediation guidance
}
```

**Behavior**:
- Validation runs automatically after regeneration
- Warnings shown but don't block operation
- Errors shown with remediation guidance
- Success message if no issues

---

#### Task 7: Add Validation to Start/Update Tools (TASK-015)
**Duration**: 45 minutes
**Priority**: P1-HIGH

**Objective**: Add optional validation to start-sprint and update-sprint-status tools.

**Deliverables**:
- Modified `src/tools/start-sprint.ts`
- Modified `src/tools/update-sprint-status.ts`

**Implementation**:
- Add validation as optional final step
- Non-fatal (operations complete regardless)
- Log validation results for troubleshooting

**Behavior**:
- Validate index after adding sprint (start-sprint)
- Validate index after status update (update-sprint-status)
- Validation failures logged as warnings
- Operations succeed even with validation warnings

---

### Phase 4: Documentation (2h 15m)
**Can Start Anytime - No Dependencies**

#### Task 8: Update AGENTS-uncompressed.md (TASK-016)
**Duration**: 1 hour
**Priority**: P1-HIGH (Protocol documentation)

**Objective**: Document sprint index system in the Sprint Protocol.

**Deliverables**:
- Modified `AGENTS-uncompressed.md`

**Content to Add**:
- New "Sprint Index" section in Sprint Protocol
- Derived/regenerable cache pattern explanation
- Automatic update triggers (sprint creation, status updates)
- Manual regeneration instructions
- Recovery procedures
- MCP tools reference (regenerate, update-status)
- Troubleshooting guidance

**Location**: Add after "Sprint Directory Structure" section.

**Key Concepts**:
- Manifests are authoritative (single source of truth)
- Index is computed cache (never manually edit)
- Regenerable from manifests at any time
- Updates are atomic (manifest first, index second)
- Index failures are non-fatal (can regenerate)

---

#### Task 9: Update README.md (TASK-017)
**Duration**: 45 minutes
**Priority**: P1-HIGH (User-facing documentation)

**Objective**: Add "Sprint Index" section to README with usage examples.

**Deliverables**:
- Modified `README.md`

**Content to Add**:
- Sprint Index overview
- Architecture explanation (authoritative vs. derived)
- MCP tools documentation
- Usage examples
- Manual regeneration instructions
- Statistics explanation

**Location**: Add as new section after project overview.

---

#### Task 10: Create Troubleshooting Guide (TASK-018)
**Duration**: 30 minutes
**Priority**: P2-MEDIUM

**Objective**: Document common issues and solutions.

**Deliverables**:
- New section in `README.md` OR
- New file `docs/troubleshooting-sprint-index.md`

**Content**:
- Issue: Index out of sync → Solution: Regenerate
- Issue: Index corrupted → Solution: Regenerate
- Issue: Test entries in index → Solution: Regenerate
- Issue: Index update failed → Solution: Regenerate (non-fatal)
- Diagnostic commands (check index, verify counts)

**Decision Point**: Integrate into README.md as subsection vs. separate docs/ file. Recommend: Add to README.md for discoverability.

---

## Execution Order

**Recommended Sequence** (respects dependencies):

1. **TASK-012**: Implement Validation Logic (1.5h) ⭐ FOUNDATIONAL
2. **TASK-013**: Write Validation Tests (1h) ⭐ VERIFY FOUNDATION
3. **TASK-005, TASK-009, TASK-011**: Test Coverage (1h 45m, parallel work)
4. **TASK-014**: Integrate Validation into Regenerate (30m)
5. **TASK-015**: Add Validation to Start/Update (45m)
6. **TASK-016, TASK-017, TASK-018**: Documentation (2h 15m, parallel work)

**Critical Path**: TASK-012 → TASK-013 → TASK-014/TASK-015 (total: 3h 45m)

**Parallelizable**:
- Documentation can start immediately (no code dependencies)
- Test coverage tasks can run in parallel with validation integration

---

## Success Criteria

### Code Quality
- ✅ All 10 tasks completed
- ✅ No new TODOs or placeholder logic
- ✅ Follows existing code patterns and style
- ✅ Type-safe TypeScript throughout

### Testing
- ✅ All tests passing (target: 90+ tests, 100% pass rate)
- ✅ No regression in existing tests
- ✅ Integration tests for all MCP tools
- ✅ Validation logic comprehensively tested

### Validation Layer
- ✅ Detects common corruption scenarios
- ✅ Provides actionable error messages
- ✅ Non-blocking (doesn't break existing operations)
- ✅ Performance impact <100ms

### Documentation
- ✅ Sprint Protocol updated (AGENTS-uncompressed.md)
- ✅ User documentation complete (README.md)
- ✅ Troubleshooting guide available
- ✅ Common issues have documented solutions

### Build & Validation
- ✅ `npm run build` passes
- ✅ `npm test` passes (100%)
- ✅ `validate_deliverable.sh` passes
- ✅ No linting errors

---

## Risk Assessment

### Low Risk
- Documentation tasks (TASK-016, TASK-017, TASK-018)
- Test coverage tasks (TASK-005, TASK-009, TASK-011)

**Mitigation**: Follow existing patterns, no new architecture.

### Medium Risk
- Validation logic (TASK-012)
- Validation integration (TASK-014, TASK-015)

**Mitigation**:
- Make validation non-fatal
- Return structured results (don't throw)
- Comprehensive test coverage
- Review validation logic carefully

### Dependencies
- TASK-013, TASK-014, TASK-015 depend on TASK-012
- Must complete TASK-012 first to unblock others

**Mitigation**: Prioritize TASK-012 at sprint start.

---

## Definition of Done

A task is "Done" when:

1. **Code Complete**:
   - Implementation matches acceptance criteria
   - No TODOs or placeholders
   - Follows project coding standards
   - Type-safe and well-documented

2. **Tested**:
   - Unit/integration tests written
   - All tests passing
   - Edge cases covered
   - No regression

3. **Documented**:
   - Code comments where needed
   - User documentation updated (if applicable)
   - Protocol documentation updated (if applicable)

4. **Committed**:
   - Changes committed to feature branch
   - Logged in request-log.md
   - Clear commit message

5. **Validated**:
   - Build passes
   - Test suite passes
   - Manual testing complete (if needed)

---

## Out of Scope

This sprint does NOT include:

- ❌ Query interface for sprint index
- ❌ Index schema versioning or migration tooling
- ❌ Index locking for concurrent updates
- ❌ Performance optimization for large repositories
- ❌ Index compression or partitioning
- ❌ New MCP tools beyond validation
- ❌ Changes to core sprint index architecture
- ❌ AGENTS.md semantic compression (update AGENTS-uncompressed.md only)

These remain as future enhancement opportunities documented in Sprint 4's deferred-work.md.

---

## Artifacts to Produce

### Code Files (New)
- `src/common/sprint-index-validator.ts`
- `src/common/__tests__/sprint-index-validator.test.ts`
- `src/tools/__tests__/regenerate-sprint-index.test.ts`
- `src/tools/__tests__/update-sprint-status.test.ts`

### Code Files (Modified)
- `src/tools/__tests__/start-sprint.test.ts`
- `src/tools/regenerate-sprint-index.ts`
- `src/tools/start-sprint.ts`
- `src/tools/update-sprint-status.ts`

### Documentation Files (Modified)
- `AGENTS-uncompressed.md`
- `README.md`

### Sprint Artifacts
- `sprint-manifest.yaml`
- `execution-plan.md` (this file)
- `backlog.yaml`
- `request-log.md`
- `validate_deliverable.sh`
- `verification-report.md`
- `retro.md`
- `key-learnings.md`
- `publication.yaml`

---

## Validation Script

The `validate_deliverable.sh` will verify:

```bash
#!/bin/bash
set -e

echo "Sprint 5 Deliverable Validation"

# Step 1: Install dependencies
npm install

# Step 2: Build the project
npm run build

# Step 3: Run full test suite
npm test

# Step 4: Verify new modules exist
test -f "src/common/sprint-index-validator.ts"
test -f "src/common/__tests__/sprint-index-validator.test.ts"
test -f "src/tools/__tests__/regenerate-sprint-index.test.ts"
test -f "src/tools/__tests__/update-sprint-status.test.ts"

# Step 5: Verify documentation updates
grep -q "Sprint Index" AGENTS-uncompressed.md
grep -q "Sprint Index" README.md

# Step 6: Test regeneration with validation
npm run sprint:index:regenerate

echo "✅ All validations passed"
```

---

## Key Learnings from Sprint 4

Apply these lessons to Sprint 5:

1. **Test Isolation**: Use dynamic functions for paths, not module-level constants
2. **Derived Data Pattern**: Validation results should be computed, not stored
3. **Non-Fatal Errors**: Validation failures should warn, not block
4. **Documentation First**: Update AGENTS-uncompressed.md (not AGENTS.md)
5. **Atomic Operations**: Always update manifest before index
6. **Recovery Mechanisms**: Regeneration handles most corruption scenarios

---

## Approval Gate

This plan requires explicit approval before proceeding to implementation.

**Questions for Review**:
1. Is the scope appropriate (all 10 tasks)?
2. Is the execution order optimal?
3. Are success criteria clear?
4. Any concerns about risk or dependencies?

**Next Steps After Approval**:
1. User says "Start sprint"
2. Create sprint directory and branch
3. Create sprint-manifest.yaml
4. Move this plan to sprint directory as execution-plan.md
5. Create backlog.yaml
6. Begin implementation with TASK-012

---

**Plan Version**: 1.0
**Created**: 2026-07-31
**Status**: Awaiting Approval
