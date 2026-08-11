# Implementation Plan: Protocol Phase Map Test Fixes

**Sprint ID**: sprint-19-hmbhz0
**Goal**: Fix 6 failing tests in protocol-phase-map.test.ts related to getNextPhase and getPhaseContext functions

## Problem Analysis

The failing tests all relate to `getNextPhase()` returning `undefined` instead of the expected next phase object.

**Root Cause**:
- `PHASE_MAP` uses sprint **statuses** as keys (`'planning'`, `'in-progress'`, `'validating'`, etc.)
- But `nextPhase` property values refer to **phase IDs** (`'execution'`, `'validation'`, `'verification'`, etc.)
- When `getNextPhase()` tries to look up `PHASE_MAP[currentPhase.nextPhase]`, it fails because keys don't match

**Example**:
```typescript
planning: {
  id: 'planning',
  nextPhase: 'execution',  // ❌ This is a phase ID, not a status
  ...
}
```

When code tries `PHASE_MAP['execution']`, it returns `undefined` because the actual key is `'in-progress'`.

## Solution

Update all `nextPhase` values in `PHASE_MAP` to use **status keys** instead of phase IDs:

| Current Value | Correct Value |
|--------------|---------------|
| `'execution'` | `'in-progress'` |
| `'validation'` | `'validating'` |
| `'verification'` | `'verifying'` |
| `'publication'` | `'published'` |
| `'completion'` | `'complete'` |

## Deliverables

1. **Code Fix** (src/common/protocol-phase-map.ts:91, 117, 138, 159, 180)
   - Update planning phase: `nextPhase: 'in-progress'`
   - Update execution phase: `nextPhase: 'validating'`
   - Update validation phase: `nextPhase: 'verifying'`
   - Update verification phase: `nextPhase: 'published'`
   - Update publication phase: `nextPhase: 'complete'`

2. **Test Verification**
   - Run full test suite
   - Verify all 6 failing tests now pass
   - Ensure no regressions in other tests

3. **Sprint Artifacts**
   - validation script (`validate_deliverable.sh`)
   - verification report
   - request log (ongoing)

## Acceptance Criteria

- [ ] All 6 failing tests in protocol-phase-map.test.ts pass
- [ ] No test regressions (all 473 tests pass)
- [ ] Code changes limited to fixing the `nextPhase` values
- [ ] Build completes successfully
- [ ] Validation script passes

## Risk Assessment

**Low Risk**: This is a straightforward fix with clear test coverage. The failing tests already define the expected behavior, so we're simply aligning the implementation to match.

## Estimated Effort

**~15 minutes**: Simple property value updates with immediate test feedback.
