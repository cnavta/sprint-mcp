# Sprint 14 Key Learnings

**Sprint ID**: sprint-14-kmbtu7
**Title**: SPRINT_ROOT Environment Variable Implementation
**Date**: 2026-08-06

---

## Transferable Technical Insights

### 1. Centralized Configuration Modules

**Learning**: Creating a single centralized module for configuration and path resolution pays dividends throughout a codebase.

**Context**:
- Had 21 files using `process.cwd()` directly
- Each file had its own path construction logic
- No single source of truth for project root

**Solution**:
- Created `src/common/project-config.ts` as single source of truth
- All path resolution goes through this module
- 7 core functions encapsulate all path logic

**Transferable Pattern**:
```typescript
// Instead of:
const planningDir = join(process.cwd(), 'planning');
const indexPath = join(planningDir, 'sprint-index.yaml');

// Do this:
const planningDir = getPlanningDir();
const indexPath = getSprintIndexPath();
```

**Benefits**:
- Single place to modify path logic
- Easy to test (mock one module vs 21 files)
- Clear interface for consumers
- Environment-aware (SPRINT_ROOT support)

**When to Apply**: Any codebase with scattered configuration or path construction logic.

---

### 2. Lazy Validation for Optional Configuration

**Learning**: Validate optional configuration on first use, not at startup.

**Context**:
- SPRINT_ROOT is optional (defaults to `process.cwd()`)
- Server should start successfully even if SPRINT_ROOT not needed
- But should fail fast when invalid SPRINT_ROOT is used

**Implementation**:
```typescript
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;

  // Lazy: check environment each call
  if (!sprintRoot || sprintRoot.trim() === '') {
    return process.cwd(); // Fallback
  }

  // Validate only when SPRINT_ROOT is actually set
  if (!isAbsolute(sprintRoot)) {
    throw new Error(`SPRINT_ROOT must be absolute, got: ${sprintRoot}`);
  }

  return sprintRoot;
}
```

**Alternative (Eager Validation)**:
```typescript
// At module load time:
const projectRoot = validateAndGetRoot();

// Problem: Server fails to start even if SPRINT_ROOT never needed
```

**Trade-offs**:
- **Lazy**: More flexible, allows optional usage, validates when needed
- **Eager**: Fails fast at startup, but blocks unrelated functionality

**When to Apply**: Optional configuration that may not be used in all deployments.

---

### 3. Fail-Fast with Clear Error Messages

**Learning**: When validation fails, provide actionable error messages that help users fix the problem.

**Context**: Users might set SPRINT_ROOT to relative path, expecting it to work.

**Implementation**:
```typescript
if (!isAbsolute(sprintRoot)) {
  const error = `SPRINT_ROOT must be an absolute path, got: ${sprintRoot}`;
  logger.error(error);
  throw new Error(error);
}
```

**Good Error Message Anatomy**:
1. **What's wrong**: "SPRINT_ROOT must be an absolute path"
2. **What was provided**: "got: ./some/path"
3. **How to fix**: (implicit - use absolute path)

**Counter-Example** (bad error):
```typescript
throw new Error('Invalid path'); // What path? Why invalid? How to fix?
```

**When to Apply**: Any validation that users might trigger through misconfiguration.

---

### 4. Diagnostics as First-Class Features

**Learning**: Build diagnostic capabilities into tools from the beginning, not as afterthought.

**Context**:
- User reported SPRINT_ROOT not being picked up in other projects
- No way to verify what configuration MCP server was using
- Had to add diagnostics retroactively

**Solution**: Added configuration summary to check-sprint-status tool:
```typescript
const config = getConfigSummary();
resultText += `\n**Configuration Diagnostics**:\n`;
resultText += `- SPRINT_ROOT set: ${config.sprintRootSet ? 'YES' : 'NO'}\n`;
resultText += `- Project root: ${config.projectRoot}\n`;
resultText += `- Planning dir: ${config.planningDir}\n`;
```

**Proactive Approach** (better):
```typescript
export function getConfigSummary(): ConfigSummary {
  // Build this into the module from Day 1
  return {
    sprintRootSet: !!process.env.SPRINT_ROOT,
    projectRoot: getProjectRoot(),
    planningDir: getPlanningDir(),
    // ... other diagnostic info
  };
}
```

**When to Apply**:
- Configuration-dependent behavior
- Environment-dependent behavior
- Multi-tenant or multi-project systems
- Any system where "it works on my machine" is a risk

---

### 5. Backward Compatibility Through Graceful Fallback

**Learning**: Support new features without breaking existing deployments by providing sensible defaults.

**Context**:
- Existing deployments don't have SPRINT_ROOT set
- Can't break those deployments when introducing new feature
- Need zero-migration-effort upgrade path

**Pattern**:
```typescript
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;

  // NEW behavior: Use SPRINT_ROOT if set
  if (sprintRoot && sprintRoot.trim() !== '') {
    return sprintRoot;
  }

  // OLD behavior: Fall back to process.cwd()
  return process.cwd();
}
```

**Result**:
- ✅ Old deployments: No SPRINT_ROOT → uses process.cwd() → works exactly as before
- ✅ New deployments: SPRINT_ROOT set → uses SPRINT_ROOT → new functionality works
- ✅ Zero breaking changes

**When to Apply**: Any new optional feature being added to existing system.

---

### 6. Git Worktrees Are Coupled to Repository

**Learning**: Git worktrees must reside within the repository directory structure, not arbitrary external locations.

**Context**: Considered putting worktrees under SPRINT_ROOT for "cleanliness".

**Investigation**: Git worktrees are tightly coupled to `.git` directory:
- Worktree metadata stored in `.git/worktrees/`
- Worktrees reference `.git` via relative path
- Moving `.git` breaks worktrees
- Moving worktrees outside repo breaks references

**Decision**: Keep worktrees in repo root (`.worktrees/`), planning artifacts under SPRINT_ROOT.

**Code**:
```typescript
export function getWorktreePath(sprintId: string): string {
  // Worktrees must be in the git repository root, NOT under SPRINT_ROOT
  // This is required by git's architecture
  return join(process.cwd(), '.worktrees', sprintId);
}
```

**Transferable Insight**: Always research tool constraints before designing around them. Git worktrees have specific location requirements.

**When to Apply**: Any time you're integrating with version control or other tools with implicit location requirements.

---

### 7. Test Coverage Enables Confident Refactoring

**Learning**: High test coverage allows aggressive refactoring without fear of breaking things.

**Metrics**:
- Started with 226 passing tests
- Added 31 new tests for project-config
- Modified 10 production files
- Final result: 257/257 tests passing

**Process**:
1. Write tests for new module (project-config.ts)
2. Migrate one file at a time
3. Run full test suite after each migration
4. If tests pass → continue
5. If tests fail → fix immediately

**Confidence Level**: HIGH - every migration verified by existing tests

**Counter-Example**: Without tests, would need extensive manual testing after each change.

**When to Apply**: Any significant refactoring or migration effort.

---

### 8. TypeScript's Structural Typing Catches Import Errors

**Learning**: TypeScript compiler catches unused imports and missing imports, preventing runtime errors.

**Example Error Caught**:
```
src/tools/update-sprint-status.ts(8,1): error TS6133:
'join' is declared but its value is never read.
```

**What This Prevented**:
- Unused code in production
- Potential confusion for future developers
- Dead import statements cluttering the file

**Example Error Caught**:
```
src/tools/complete-sprint.ts(81,26): error TS2304:
Cannot find name 'join'.
```

**What This Prevented**:
- Runtime crash when trying to use undefined `join`
- Production bug that tests might not catch
- Emergency hotfix after deployment

**When to Apply**: Always use TypeScript strict mode for production code.

---

### 9. Incremental Migration Reduces Risk

**Learning**: Migrate one module at a time rather than "big bang" refactoring.

**Approach Used**:
1. Phase 1: Create new module (project-config.ts)
2. Phase 2: Migrate common modules (4 files)
3. Phase 3: Migrate MCP tools (5 files)
4. Phase 4: Migrate compression module (1 file)
5. Run tests after EACH phase

**Benefits**:
- Caught issues immediately (know exactly which change broke what)
- Could rollback single file if needed
- Maintained working system at each step
- Reduced cognitive load (one file at a time)

**Counter-Example** (Big Bang):
- Change all 10 files at once
- Run tests
- 50 test failures
- Spend hours debugging which change caused which failure

**When to Apply**: Any large refactoring or migration effort.

---

### 10. Documentation as Specification

**Learning**: Writing documentation before/during implementation clarifies requirements and prevents scope creep.

**Process**:
- README.md already documented SPRINT_ROOT (though unimplemented)
- Implementation followed documented behavior exactly
- No ambiguity about what "correct" behavior should be

**Documentation-Driven Development**:
1. Document expected behavior
2. Implement to match documentation
3. Tests verify implementation matches documentation

**Benefits**:
- Clear target behavior
- No moving goalposts
- Easy to verify completion (does it do what docs say?)

**When to Apply**: Features with user-facing behavior or configuration.

---

## Architecture Patterns

### Pattern 1: Single Source of Truth
**Problem**: Scattered configuration and path logic across codebase
**Solution**: Centralized configuration module
**Example**: `project-config.ts`

### Pattern 2: Graceful Degradation
**Problem**: New feature shouldn't break existing deployments
**Solution**: Optional configuration with sensible defaults
**Example**: SPRINT_ROOT falls back to process.cwd()

### Pattern 3: Diagnostic Observability
**Problem**: Hard to debug configuration issues in production
**Solution**: Built-in diagnostic functions
**Example**: `getConfigSummary()` in project-config

### Pattern 4: Fail-Fast Validation
**Problem**: Invalid configuration causes confusing downstream errors
**Solution**: Validate early with clear error messages
**Example**: Absolute path validation for SPRINT_ROOT

---

## Anti-Patterns Avoided

### Anti-Pattern 1: Magic Global State
**Avoided**: Storing project root in module-level variable
**Why Bad**: Hard to test, hidden dependencies, global mutable state
**What We Did**: Pure functions that read environment on each call

### Anti-Pattern 2: Scattered Validation
**Avoided**: Validating SPRINT_ROOT in every file that uses it
**Why Bad**: Duplicated logic, inconsistent error messages, hard to maintain
**What We Did**: Validate once in `getProjectRoot()`, all other functions use it

### Anti-Pattern 3: Breaking Changes
**Avoided**: Making SPRINT_ROOT required
**Why Bad**: Forces migration work on all users, breaks existing deployments
**What We Did**: Made SPRINT_ROOT optional with backward-compatible fallback

---

## Process Learnings

### Sprint Protocol Effectiveness

**What Worked**:
1. **Planning approval gate**: Prevented premature implementation
2. **Incremental execution**: Reduced risk through phased migration
3. **Continuous validation**: Tests after each phase caught issues early
4. **Verification report**: Clear accounting of completed/deferred work
5. **Explicit completion**: Required artifacts ensure quality

**Improvement Opportunities**:
1. **Integration tests**: Should have clearer deferral criteria upfront
2. **Diagnostics**: Should be Day 1 requirement for configuration features

---

## Recommendations for Future Work

### For Similar Projects

1. **Start with diagnostics** - Build `getConfigSummary()` into new modules from the beginning
2. **Test isolation first** - Ensure tests can run in any environment before migration
3. **Document before implementing** - Clarifies requirements and prevents scope creep
4. **Migrate incrementally** - One module at a time, tests between each migration
5. **Prioritize backward compatibility** - Optional features with graceful fallback

### For This Codebase

1. **Add integration tests** - Multi-project scenarios (low priority, nice-to-have)
2. **Monitor user feedback** - SPRINT_ROOT usage patterns in production
3. **Consider config file** - Alternative to environment variable for persistent config
4. **Debug logging** - Add optional verbose logging for path resolution (nice-to-have)

---

## Applicability

**These learnings apply to**:
- Environment-based configuration
- Multi-tenant/multi-project systems
- Path resolution and filesystem operations
- Large refactoring efforts
- Backward compatibility requirements
- TypeScript projects with strict type checking

**Key Insight**: Centralized configuration with lazy validation, graceful fallback, and built-in diagnostics creates flexible, maintainable, debuggable systems.

---

**Lessons Captured By**: Lead Implementor (Claude)
**Date**: 2026-08-06
**Confidence**: High - all learnings validated through working implementation
