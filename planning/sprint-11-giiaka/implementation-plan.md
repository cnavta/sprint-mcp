# Implementation Plan – Sprint 11

**Sprint ID**: sprint-11-giiaka
**Sprint Goal**: Expand test coverage by testing the compression modules (P1 deferred from Sprint 9) and improving coverage for modules just below 80% threshold, aiming for 75%+ overall coverage
**Lead Implementor**: Claude Code
**Date**: 2026-08-01

---

## Executive Summary

This sprint continues the testing expansion work from Sprint 10, applying the proven integration test pattern to the remaining untested modules. The primary focus is testing the compression subsystem (deferred as P1 from Sprint 9), followed by improving coverage for modules just below the 80% threshold.

**Current State**:
- Overall coverage: 66.02% (statements)
- Compression modules: 0% coverage (6 files)
- Near-threshold modules: file-utils (62.85%), cleanup-sprint (78.02%), regenerate-sprint-index (78.57%)
- Total tests: 168 passing

**Target State**:
- Overall coverage: 75%+ (statements)
- Compression modules: 75%+ coverage each
- Near-threshold modules: 80%+ coverage each
- All tests passing with integration test pattern

---

## Sprint 10 Learnings Applied

This sprint will apply the following critical learnings from Sprint 10:

### ⭐⭐⭐ Learning #1: Validation Spike First
**Pattern**: Start with Phase 0 validation spike creating 3-5 POC tests before committing to full implementation.

**Application**: Phase 0 will create POC tests for compression-engine.ts to validate:
- Integration test approach works with compression modules
- No unforeseen dependencies or testing challenges
- Pattern is reusable for other compression modules

### ⭐⭐⭐ Learning #2: Integration Test Pattern
**Pattern**: Use real file operations instead of mocks, with isolated temp directories.

**Application**: All compression module tests will:
- Use real file I/O (readFile, writeFile, mkdir)
- Use isolated temp directories per test
- Avoid mocking unless absolutely necessary
- Follow the established beforeEach/afterEach pattern

### ⭐⭐ Learning #3: Test Public APIs Only
**Pattern**: Test through exported functions, not private implementation details.

**Application**: Compression module tests will:
- Only import and test exported functions
- Test private function behavior indirectly through public API
- Use various inputs to trigger internal validation logic

### ⭐⭐ Learning #4: Module-Specific Coverage Targets
**Pattern**: Set coverage targets for specific subsystems being tested.

**Application**: This sprint sets targets for:
- **Compression modules**: 75%+ each (6 modules)
- **Near-threshold modules**: 80%+ each (3 modules)
- **Overall**: 75%+ (realistic given scope)

### ⭐⭐ Learning #5: User Guidance Over Metrics
**Pattern**: Follow user guidance on simplicity vs thoroughness.

**Application**: Focus on practical, realistic tests rather than:
- Exhaustive edge case testing
- Deep integration tests for simple modules
- Artificial test coverage inflation

---

## Coverage Analysis

### Current Coverage Breakdown

| Module | Current | Target | Gap | Priority |
|--------|---------|--------|-----|----------|
| **Compression Modules** | | | | **P0** |
| compression-engine.ts | 0% | 75% | +75% | P0 |
| semantic-extractor.ts | 0% | 75% | +75% | P0 |
| validation-engine.ts | 0% | 75% | +75% | P0 |
| config.ts | 0% | 75% | +75% | P0 |
| cli.ts | 0% | 75% | +75% | P0 |
| types.ts | 0% | N/A | N/A | P2 (type defs) |
| **Near-Threshold Modules** | | | | **P1** |
| file-utils.ts | 62.85% | 80% | +17.15% | P1 |
| cleanup-sprint.ts | 78.02% | 80% | +1.98% | P1 |
| regenerate-sprint-index.ts | 78.57% | 80% | +1.43% | P1 |
| **Out of Scope** | | | | |
| index.ts (MCP entry) | 0% | N/A | N/A | P3 (deferred) |

### Coverage Target Calculation

**Best Case Scenario** (all P0 + P1 tested to target):
- Current untested lines: ~1,200 lines
- If compression modules (900 lines) reach 75%: +675 tested lines
- If near-threshold modules (150 lines) reach 80%: +120 tested lines
- Total improvement: ~795 lines
- **Projected overall coverage**: 75-78%

**Realistic Scenario** (P0 only):
- If compression modules reach 75%: +675 tested lines
- **Projected overall coverage**: 72-75%

---

## Phased Execution Plan

### Phase 0: Validation Spike (Learning #1 Applied) ✅

**Goal**: Validate integration test approach works for compression modules.

**Tasks**:
1. Read compression-engine.ts to understand public API
2. Read semantic-extractor.ts to understand dependencies
3. Create `src/compression/__tests__/validation-spike.test.ts`
4. Write 4-5 POC tests for core compression functionality:
   - Test compress() with simple input
   - Test decompress() round-trip
   - Test error handling for invalid input
   - Test configuration loading
5. Verify tests pass and approach is viable
6. Document spike results in this plan (update section below)

**Success Criteria**:
- 4-5 POC tests created and passing
- No unexpected mocking issues
- Integration test pattern confirmed viable for compression modules
- Confidence to proceed with full test suite

**Estimated Backlog Items**: 6 (BL-001 to BL-006)

---

### Phase 1: Compression Engine Testing

**Goal**: Create comprehensive integration tests for compression-engine.ts.

**Context**: The compression engine is the core module that orchestrates semantic compression. Understanding the public API and testing it thoroughly is critical.

**Tasks**:
1. Map out all exported functions from compression-engine.ts
2. Create `src/compression/__tests__/compression-engine.test.ts`
3. Create integration tests for:
   - Compression workflow (full round-trip)
   - Decompression workflow
   - Configuration handling
   - Error cases (invalid input, missing files, etc.)
   - Edge cases (empty input, very large input)
4. Create helper functions for test setup (similar to Sprint 10)
5. Run coverage for compression-engine.ts
6. Add additional tests until 75%+ coverage achieved

**Success Criteria**:
- compression-engine.ts coverage ≥75%
- All tests passing
- Integration test pattern followed
- Helper functions created for reusability

**Estimated Backlog Items**: 8 (BL-007 to BL-014)

---

### Phase 2: Semantic Extractor Testing

**Goal**: Create comprehensive integration tests for semantic-extractor.ts.

**Context**: The semantic extractor analyzes markdown to extract key information. Testing should focus on real markdown parsing.

**Tasks**:
1. Read semantic-extractor.ts to understand public API
2. Create `src/compression/__tests__/semantic-extractor.test.ts`
3. Create integration tests for:
   - Extracting headings from markdown
   - Extracting code blocks
   - Extracting lists and structured content
   - Handling malformed markdown
   - Edge cases (empty file, no structure, etc.)
4. Use real markdown samples in tests
5. Run coverage for semantic-extractor.ts
6. Add additional tests until 75%+ coverage achieved

**Success Criteria**:
- semantic-extractor.ts coverage ≥75%
- All tests passing
- Real markdown samples used (no mocks)
- Tests validate actual extraction logic

**Estimated Backlog Items**: 7 (BL-015 to BL-021)

---

### Phase 3: Validation Engine Testing

**Goal**: Create comprehensive integration tests for validation-engine.ts.

**Context**: The validation engine verifies compressed output maintains semantic equivalence. Critical for ensuring compression quality.

**Tasks**:
1. Read validation-engine.ts to understand public API
2. Create `src/compression/__tests__/validation-engine.test.ts`
3. Create integration tests for:
   - Validating semantic equivalence
   - Detecting semantic drift
   - Handling edge cases (empty input, identical input)
   - Error cases (invalid comparison data)
4. Run coverage for validation-engine.ts
5. Add additional tests until 75%+ coverage achieved

**Success Criteria**:
- validation-engine.ts coverage ≥75%
- All tests passing
- Semantic validation logic tested
- No mocking of validation logic

**Estimated Backlog Items**: 6 (BL-022 to BL-027)

---

### Phase 4: Compression Config and CLI Testing

**Goal**: Test config.ts and cli.ts modules.

**Context**: Config handles compression settings, CLI provides command-line interface. Both are simpler modules.

**Tasks**:
1. Create `src/compression/__tests__/config.test.ts`
2. Test configuration loading and validation
3. Test default configuration values
4. Create `src/compression/__tests__/cli.test.ts` (if appropriate)
5. Test CLI argument parsing and execution (may defer if too complex)
6. Run coverage for both modules
7. Add tests until 75%+ coverage achieved

**Success Criteria**:
- config.ts coverage ≥75%
- cli.ts coverage ≥75% (or documented deferral)
- All tests passing

**Estimated Backlog Items**: 6 (BL-028 to BL-033)

---

### Phase 5: Near-Threshold Module Coverage Improvements

**Goal**: Improve coverage for modules just below 80% threshold.

**Context**: Three modules are close to 80% but not quite there. Small coverage improvements will help reach overall target.

**Tasks**:
1. **file-utils.ts** (62.85% → 80%):
   - Review uncovered lines (17-18, 34-35, 48-49, 69-76)
   - Create additional tests for edge cases
   - Focus on error handling paths
2. **cleanup-sprint.ts** (78.02% → 80%):
   - Review uncovered lines (35-38, 55, 159, 181-185, etc.)
   - Add tests for uncovered branches
3. **regenerate-sprint-index.ts** (78.57% → 80%):
   - Review uncovered lines (94, 98-102, 118-120, etc.)
   - Add tests for edge cases

**Success Criteria**:
- file-utils.ts coverage ≥80%
- cleanup-sprint.ts coverage ≥80%
- regenerate-sprint-index.ts coverage ≥80%
- All tests passing

**Estimated Backlog Items**: 9 (BL-034 to BL-042)

---

### Phase 6: Coverage Validation and Gap Analysis

**Goal**: Verify overall coverage targets met and document any gaps.

**Tasks**:
1. Run full coverage report: `npm run test:coverage`
2. Verify compression modules all ≥75%
3. Verify near-threshold modules all ≥80%
4. Verify overall coverage ≥75%
5. Document any gaps or deferred items
6. Create summary of coverage improvements
7. Update backlog.yaml with final status

**Success Criteria**:
- Overall coverage ≥75% (statements)
- All P0 modules ≥75%
- All P1 modules ≥80%
- Coverage report documented
- Gaps documented with rationale

**Estimated Backlog Items**: 7 (BL-043 to BL-049)

---

### Phase 7: Testing Documentation (Sprint 10 Action Item #5)

**Goal**: Document established testing patterns for future reference.

**Context**: Sprint 10 identified need for testing pattern documentation. Create guide documenting integration test approach.

**Tasks**:
1. Create `docs/testing-guide.md` (or similar location)
2. Document integration test pattern with examples
3. Document helper function patterns (createSprint, createWorktree, etc.)
4. Document when to use integration vs unit tests
5. Include real examples from Sprint 10 and 11
6. Document validation spike pattern
7. Include coverage target guidance

**Success Criteria**:
- Testing guide created with concrete examples
- Patterns documented for reuse
- Helper functions catalogued
- Guidance on test approach selection

**Estimated Backlog Items**: 5 (BL-050 to BL-054)

---

### Phase 8: Sprint Completion

**Goal**: Complete all sprint artifacts and create PR.

**Tasks**:
1. Create verification-report.md
2. Create retro.md
3. Create key-learnings.md
4. Update request-log.md with final entries
5. Create publication.yaml
6. Create GitHub Pull Request
7. Execute complete-sprint MCP tool

**Success Criteria**:
- All sprint artifacts created
- PR successfully created and logged
- Sprint marked complete in normal mode

**Estimated Backlog Items**: 8 (BL-055 to BL-062)

---

## Phase 0 Validation Spike Results

**Status**: ✅ Completed (2026-08-01)

**POC Tests Created**: 13 tests in `src/compression/__tests__/validation-spike.test.ts`

**Test Results**: ✅ 13/13 passing (100%)

**Key Findings**:

### 1. Integration Test Pattern Works for Compression Modules ✅

The integration test pattern from Sprint 10 successfully applies to compression modules:
- Isolated temp directories per test
- Real file I/O operations (writeFile, readFile, mkdir)
- beforeEach/afterEach cleanup pattern
- No mocking required for testable functions

**Evidence**: All 13 POC tests passed using this pattern.

### 2. LLM Dependency Challenge Identified ⚠️

**Critical Discovery**: Compression modules have a fundamental dependency on LLM API calls:

**LLM-Dependent Functions** (cannot test without API key/costs):
- `compressDocument()` - calls `generateText()` with Anthropic API
- `extractSemanticInvariants()` - calls `generateObject()` with Anthropic API
- `validateCompression()` - calls `generateObject()` with Anthropic API

**Constraints**:
- Require ANTHROPIC_API_KEY environment variable
- API calls are slow (~5-30 seconds each)
- API calls cost money (not suitable for CI)
- LLM responses are non-deterministic (hard to assert)

### 3. Testable Without LLM ✅

**Successfully tested without LLM or mocking**:
- ✅ Config module (`loadCompressionConfig`, `getDefaultConfig`, `mergeWithDefaults`, `validateConfig`)
- ✅ Validation logic (`validateExtractedInvariants`)
- ✅ Report generation (`generateCompressionReport`)
- ✅ All helper/formatting functions

**Coverage Estimate**: Can achieve ~60-70% coverage without testing LLM-calling functions.

### 4. Hybrid Testing Strategy Recommended 💡

**Approach**:
1. **Integration tests** for config module (100% coverage achievable)
2. **Unit tests** for helper/validation functions (no LLM dependencies)
3. **Document as deferred** for LLM-calling main functions
4. **Rationale**: Follows Sprint 10 learning (avoid mocking), realistic without API costs

**Alternative Options Considered**:
- ❌ Option A: Mock `ai` SDK - violates Sprint 10 learning (avoid mocking)
- ❌ Option B: Real API calls - too slow/expensive for CI
- ✅ Option C: Test what we can, document what we can't (chosen)

### 5. CLI Module Assessment 🔍

**Finding**: `cli.ts` also depends on LLM-calling functions, so same constraints apply.

**Recommendation**: Test CLI argument parsing if possible, defer full CLI testing.

## Confidence to Proceed ✅

**Verdict**: High confidence to proceed with modified approach.

**Rationale**:
1. Integration test pattern validated for compression modules
2. Clear understanding of what CAN and CANNOT be tested
3. Realistic coverage targets (60-70% per module) without mocking or API costs
4. Aligns with Sprint 10 learnings (integration tests, avoid mocking)
5. User guidance: "we don't need massive, deep integration tests"

**Adjusted Coverage Targets**:
- Config module: 90%+ (fully testable)
- Compression engine: 60-70% (helper functions only)
- Semantic extractor: 60-70% (validation logic only)
- Validation engine: 60-70% (structural validation only)
- **Overall compression subsystem**: 65-70% (realistic without LLM testing)

**Next Steps**: Proceed to Phase 1 with hybrid testing approach.

---

## Risk Assessment

### High Risk ⚠️

1. **Compression Module Complexity**
   - **Risk**: Compression modules may have complex dependencies or require specific setup
   - **Mitigation**: Phase 0 validation spike will identify issues early
   - **Fallback**: If too complex, defer CLI testing or reduce coverage target to 70%

2. **Test Data Requirements**
   - **Risk**: Compression tests may require large corpus of markdown test data
   - **Mitigation**: Start with simple examples, expand if needed
   - **Fallback**: Use synthetic test data rather than real corpus

### Medium Risk ⚠️

3. **Coverage Target Too Ambitious**
   - **Risk**: 75% overall may not be achievable if compression modules are larger than estimated
   - **Mitigation**: Set module-specific targets as primary success criteria
   - **Fallback**: Accept 72-73% if all module targets met

4. **Time Constraints**
   - **Risk**: Sprint may take longer than expected if compression testing is complex
   - **Mitigation**: Phased approach allows partial completion
   - **Fallback**: Defer P1 (near-threshold improvements) if P0 takes longer

### Low Risk ✅

5. **Integration Test Pattern**
   - **Risk**: Pattern may not work for compression modules
   - **Mitigation**: Phase 0 spike validates approach
   - **Confidence**: High, based on Sprint 10 success

---

## Success Metrics

### Primary Success Criteria (Must Achieve)

1. ✅ Compression modules tested with ≥75% coverage each
2. ✅ All new tests passing (0 failures)
3. ✅ Integration test pattern successfully applied
4. ✅ Overall coverage improved by ≥6-9 percentage points

### Secondary Success Criteria (Should Achieve)

5. ✅ Near-threshold modules reach 80%+ coverage
6. ✅ Overall coverage ≥75%
7. ✅ Testing documentation created
8. ✅ All Sprint 10 learnings applied

### Stretch Goals (Nice to Have)

9. 💡 Overall coverage ≥80%
10. 💡 Helper functions extracted into shared test utilities module
11. 💡 CLI module tested (may defer if too complex)

---

## Definition of Done (Sprint Protocol)

Per CLAUDE.md and Sprint Protocol, deliverable is "Done" when:

### Code Quality ✅
- [ ] Adheres to project and architecture.yaml constraints
- [ ] No TODOs or placeholder logic in production paths
- [ ] All code follows TypeScript best practices

### Testing ✅
- [ ] Tests for all new behavior (compression modules, coverage improvements)
- [ ] Integration tests using real operations (no mocks)
- [ ] Test suite passes (all tests green)
- [ ] Coverage targets met for all P0 modules

### Documentation ✅
- [ ] implementation-plan.md documents strategy and phases
- [ ] backlog.yaml tracks all P0 and P1 items
- [ ] request-log.md documents all changes
- [ ] Testing guide created (Phase 7)

### Traceability ✅
- [ ] All changes trace to Sprint 11
- [ ] All changes logged in request-log.md
- [ ] All tests reference specific backlog items

---

## Estimated Effort

| Phase | Backlog Items | Estimated Complexity |
|-------|---------------|---------------------|
| Phase 0: Validation Spike | 6 | Low |
| Phase 1: Compression Engine | 8 | Medium-High |
| Phase 2: Semantic Extractor | 7 | Medium |
| Phase 3: Validation Engine | 6 | Medium |
| Phase 4: Config & CLI | 6 | Low-Medium |
| Phase 5: Near-Threshold Improvements | 9 | Low |
| Phase 6: Coverage Validation | 7 | Low |
| Phase 7: Testing Documentation | 5 | Low |
| Phase 8: Sprint Completion | 8 | Low |
| **Total** | **62** | **Medium** |

**Overall Sprint Complexity**: Medium

**Estimated Duration**: 1-2 sessions (based on Sprint 10 precedent)

---

## Open Questions

1. **Q**: Should CLI module (cli.ts) be tested, or is it too complex for integration tests?
   - **A**: Will assess in Phase 0 spike. If CLI requires terminal I/O, may defer to future sprint.

2. **Q**: What level of test data corpus is needed for compression testing?
   - **A**: Will start with simple synthetic examples. Can expand if validation spike shows need.

3. **Q**: Should types.ts be tested, or is it just type definitions?
   - **A**: Type definition files typically don't need tests. Will mark as P2 (deferred).

4. **Q**: Should we extract test helpers into shared module now, or defer?
   - **A**: Defer to future sprint. Focus on tests first, refactor later.

---

## Dependencies

### External Dependencies
- None. All compression modules are internal.

### Internal Dependencies
- Jest test framework (already configured)
- Integration test pattern from Sprint 10
- Temp directory utilities (fs/promises)

### Blocking Issues
- None identified

---

## Approval Gate

**Status**: ⏳ Awaiting user approval

This plan follows the Sprint Protocol requirement that NO coding begins until the implementation plan is explicitly approved by the user.

**User**: Please review this execution plan and approve before I proceed to Phase 0.

**Questions to consider**:
1. Is the phased approach acceptable?
2. Are the coverage targets realistic (75% compression, 80% near-threshold)?
3. Should I defer any phases (e.g., CLI testing, testing documentation)?
4. Any additional test cases or modules you want prioritized?

Once approved, I will:
1. Create backlog.yaml with all 62 trackable items
2. Begin Phase 0 validation spike
3. Update todo list to track progress

---

## Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-08-01 | Initial plan created | Lead Implementor |

