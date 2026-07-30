# Key Learnings – Sprint 3 (sprint-3-c8f2a9)

**Sprint**: Git Worktrees Integration and MCP Testing Infrastructure
**Date**: 2026-07-30
**Context**: First sprint implementing comprehensive test suite and git worktree workflow

---

## 1. Integration Tests > Mocks for File Operations

**Context**: Phase 1 attempted to use jest mocks for file system operations in ES modules.

**Challenge**:
- `jest.unstable_mockModule()` proved unreliable for fs/promises
- Mock cleanup and reset logic became complex
- Tests failed intermittently with mock state issues

**Solution**:
- Switched to integration tests with real file system operations
- Used `mkdtemp()` for isolated temporary directories
- Guaranteed cleanup with `afterEach` hooks

**Learning**:
> **When testing file operations in Node.js ES modules, prefer integration tests with temporary directories over mocking. Real file system operations are more reliable and catch actual integration issues.**

**Application**:
- All future MCP tool tests should use real file system
- Reserve mocks for external API calls, not internal file ops
- Temp directories provide true isolation between tests

---

## 2. Git Worktrees Provide Superior Sprint Isolation

**Context**: Implemented git worktrees to replace traditional branch checkout workflow.

**Benefits Observed**:
- **No branch context switching**: Main worktree stays on main branch
- **Parallel work capability**: Multiple sprint directories can coexist
- **Clean separation**: No risk of mixing sprint changes with main branch
- **Easy cleanup**: `git worktree remove` after sprint completion

**Implementation**:
- Each sprint gets `.worktrees/sprint-<id>/` directory
- Feature branch created automatically in worktree
- Main worktree untouched during sprint work

**Learning**:
> **Git worktrees eliminate branch switching overhead and prevent context pollution. They should be the default workflow for isolated feature development.**

**Application**:
- Sprint 4 should use worktree from initialization
- Document worktree benefits in developer onboarding
- Consider worktree workflow for all feature branches (not just sprints)

---

## 3. Main Baseline Verification is Critical

**Context**: Sprint 2 FOLLOW-002 identified need to verify main branch before sprint creation.

**Problem Prevented**:
- Sprints created without stable baseline
- Feature branches diverging from non-existent or empty main
- Merge conflicts from unstable base

**Solution**:
- `verifyMainBranch()` checks local main or origin/main
- Requires at least 1 commit before sprint creation
- Clear error messages guide users to fix baseline

**Learning**:
> **Always verify baseline branch exists and has commits before creating feature branches. This prevents downstream merge issues and ensures stable development foundation.**

**Application**:
- Apply to all branching workflows, not just sprints
- Consider pre-commit hooks for baseline verification
- Document baseline requirements in contribution guidelines

---

## 4. Comprehensive Validation Scripts Pay Dividends

**Context**: Created `validate_deliverable.sh` with 8-step validation process.

**Benefits**:
- **Early issue detection**: Caught problems before PR creation
- **Repeatability**: Anyone can validate deliverables consistently
- **Documentation**: Script serves as validation checklist
- **Confidence**: All checks passing provides clear "ready" signal

**Components**:
1. Environment verification (Node.js, npm, git)
2. Dependency installation
3. TypeScript compilation
4. Test suite execution
5. Coverage verification
6. Worktree smoke test
7. File structure validation
8. Code quality checks

**Learning**:
> **Automated validation scripts ensure deliverable quality and provide repeatable verification. Invest time in comprehensive validation early in the sprint.**

**Application**:
- Create validation script in planning phase
- Run validation frequently during development
- Include validation script in CI/CD pipeline

---

## 5. Phased Execution Prevents Scope Creep

**Context**: Sprint 3 used 5-phase execution plan with clear boundaries.

**Phases**:
1. Test Infrastructure (FOLLOW-003)
2. Main Baseline Verification (FOLLOW-002)
3. Protocol Updates (worktree documentation)
4. Worktree Tooling (implementation)
5. Validation and Documentation

**Benefits**:
- **Focus**: Only one phase active at a time
- **Progress visibility**: Clear milestones
- **Flexibility**: Phases could be reordered if needed
- **Completion criteria**: Each phase had specific deliverables

**Learning**:
> **Breaking complex sprints into explicit phases with clear boundaries prevents scope creep and maintains focus. Each phase should have specific deliverables and completion criteria.**

**Application**:
- Always create execution plan with phases
- Document phase dependencies
- Mark phase completion explicitly in request log

---

## 6. Test Coverage Targets Drive Quality

**Context**: Set 80% coverage target for src/tools/, achieved 92%.

**Impact**:
- **Comprehensive testing**: Edge cases covered
- **Confidence**: High coverage supports refactoring
- **Documentation**: Tests serve as usage examples
- **Bug prevention**: Many edge cases caught during test writing

**Approach**:
- Integration tests with real operations
- Test both success and failure paths
- Verify error messages and logging
- Test edge cases (no main, empty directories, etc.)

**Learning**:
> **Set explicit coverage targets early (80%+) and track them. High coverage enables confident refactoring and prevents regression bugs.**

**Application**:
- Include coverage target in sprint acceptance criteria
- Monitor coverage trends across sprints
- Require tests for all new code paths

---

## 7. Orphaned Resource Detection is Valuable

**Context**: Implemented orphaned worktree detection in check-sprint-status.

**User Value**:
- **Disk space**: Identifies cleanup opportunities
- **Hygiene**: Keeps repository clean
- **Visibility**: Shows what's left behind
- **Actionable**: Provides cleanup command

**Pattern**:
```typescript
// Identify orphaned worktrees
const orphaned = worktrees.filter(wt => {
  const sprintId = extractSprintId(wt.path);
  return completedSprints.has(sprintId) || !activeSprints.has(sprintId);
});
```

**Learning**:
> **Proactively detect orphaned resources (worktrees, branches, temp files) and provide cleanup guidance. This prevents resource accumulation and maintains repository hygiene.**

**Application**:
- Add orphaned branch detection
- Check for orphaned planning directories
- Consider automated cleanup suggestions

---

## 8. Documentation Timing Matters

**Context**: Updated AGENTS-uncompressed.md in Phase 3, README.md in Phase 5.

**Observation**:
- Protocol updates synchronized with implementation (good)
- User documentation came late in sprint
- README updates could have been incremental

**Better Approach**:
- Update protocol docs when planning changes
- Update README as features are implemented
- Keep documentation and code in sync

**Learning**:
> **Update documentation incrementally alongside implementation, not as final sprint task. This keeps docs accurate and reduces end-of-sprint documentation burden.**

**Application**:
- Add "Update README" to implementation tasks
- Commit docs with related code changes
- Review docs before sprint completion

---

## 9. Explicit Acceptance Criteria Enable Clear Completion

**Context**: Each task in backlog.yaml had explicit acceptance criteria.

**Example** (TASK-014):
```yaml
acceptanceCriteria:
  - "Lists active worktrees alongside sprint status"
  - "Shows worktree path for each active sprint"
  - "Detects orphaned worktrees (sprint complete but worktree remains)"
  - "Tests verify worktree information display"
```

**Benefits**:
- **No ambiguity**: Clear definition of "done"
- **Testable**: Can verify each criterion
- **Communication**: User knows what to expect
- **Scope control**: Prevents feature creep

**Learning**:
> **Write explicit, testable acceptance criteria for every task. This eliminates ambiguity about completion and enables objective verification.**

**Application**:
- Always include acceptance criteria in backlog
- Review criteria with stakeholders before implementation
- Mark each criterion as complete with evidence

---

## 10. Deferred Tasks Are Acceptable

**Context**: TASK-014 and TASK-017 deferred to preserve focus on P0/P1 tasks.

**Decision**:
- TASK-014 (P2-MEDIUM): check-sprint-status enhancements
  - **Deferred initially**: Not critical for sprint success
  - **Implemented later**: User requested after Phase 5
  - **Outcome**: Successful addition with 4 new tests

- TASK-017 (P2-MEDIUM): Worktree migration guide
  - **Deferred**: No existing sprints to migrate
  - **Status**: Remains deferred (appropriate)

**Learning**:
> **Deferring P2-MEDIUM tasks to maintain focus on P0-CRITICAL and P1-HIGH work is acceptable and often necessary. Re-evaluate deferred tasks based on user feedback and changing priorities.**

**Application**:
- Prioritize ruthlessly (P0 > P1 > P2)
- Document why tasks are deferred
- Re-evaluate deferred tasks if user requests feature

---

## Summary of Actionable Learnings

| Learning | Priority | Action for Sprint 4 |
|----------|----------|---------------------|
| Integration tests > mocks | HIGH | Continue real fs operations for all file tests |
| Git worktrees for isolation | HIGH | Start Sprint 4 with worktree creation |
| Baseline verification critical | HIGH | Apply pattern to all branching workflows |
| Validation scripts pay off | HIGH | Create validation script in planning phase |
| Phased execution prevents scope creep | MEDIUM | Use 3-5 phases for complex sprints |
| Coverage targets drive quality | MEDIUM | Set 80%+ target for new code |
| Orphaned resource detection | MEDIUM | Add branch/directory cleanup detection |
| Documentation timing matters | MEDIUM | Update docs alongside implementation |
| Explicit acceptance criteria | HIGH | Include in all task definitions |
| Deferred tasks acceptable | LOW | Prioritize P0/P1, defer P2 when needed |

---

**Key Learnings Date**: 2026-07-30
**Prepared By**: Claude (Lead Implementor)
**For**: Future sprints in sprint-mcp repository
