# Sprint 16 Implementation Plan

**Sprint ID**: sprint-16-rgo90d
**Title**: Sprint Lifecycle Hooks Implementation
**Date**: 2026-08-07
**Owner**: Christopher Navta
**Priority**: P0 (Blocker for production use)

---

## Executive Summary

Implement the sprint lifecycle hooks system designed in Sprint 15 to automate worktree setup and enable project-specific automation at key sprint lifecycle events. This eliminates manual setup steps (npm ci, .env configuration, etc.) and unlocks the full potential of the unified worktree model.

**Estimated Effort**: 8-10 hours
**Complexity**: Medium
**Risk Level**: Low (additive feature, no breaking changes)

---

## Background

Sprint 15 identified that the unified worktree model requires manual setup in each worktree:
- `npm ci` to install dependencies
- Copy `.env.example` to `.env`
- Initial build
- Project-specific configuration

Without automation, this creates friction for both agents and humans. The hooks system solves this by allowing projects to define executable scripts that run at key sprint lifecycle events.

**Reference Documents**:
- `planning/sprint-15-dq6cg7/sprint-hooks-design.md` - Complete design specification
- `planning/sprint-15-dq6cg7/worktree-deployment-verification.md` - Deployment workflow analysis

---

## Goals

### Primary Goals
1. **Automate worktree setup**: Eliminate manual `npm ci` and configuration steps
2. **Enable project-specific workflows**: Support Node.js, Python, Go, and other stacks
3. **Add validation gates**: Pre-completion checks to ensure quality
4. **Support cleanup automation**: Stop services, backup data before worktree removal

### Success Criteria
- ✅ Hooks execute automatically at the right lifecycle events
- ✅ Hook failures are properly surfaced to users
- ✅ Blocking hooks (pre-complete, pre-cleanup, pre-archive) can abort operations
- ✅ Non-blocking hooks (post-start, post-complete, post-archive) log errors but continue
- ✅ Example hooks provided for common stacks (Node.js, Python)
- ✅ All tests passing (including new hook tests)
- ✅ Documentation updated (AGENTS.md, examples)

---

## Architecture

### Hook Types

| Hook Name | Event | Blocking? | Purpose |
|-----------|-------|-----------|---------|
| `post-start` | After worktree + planning dir created | No | Setup dependencies, environment |
| `pre-complete` | Before completion validation | Yes | Final checks, verify no uncommitted changes |
| `post-complete` | After sprint marked complete | No | Notifications, external system updates |
| `pre-cleanup` | Before worktree removed | Yes | Stop services, backup data |
| `pre-archive` | Before moving to archive | Yes | Generate reports, final validations |
| `post-archive` | After sprint archived | No | Update tracking systems, metrics |

### Hook Interface

**Environment Variables** (passed to all hooks):
```bash
SPRINT_ID="sprint-16-rgo90d"
SPRINT_WORKTREE="/path/to/.worktrees/sprint-16-rgo90d"
SPRINT_PLANNING_DIR="/path/to/.worktrees/sprint-16-rgo90d/planning/sprint-16-rgo90d"
SPRINT_BRANCH="feature/sprint-16-rgo90d-..."
SPRINT_EVENT="post-start"  # Hook name being executed
```

**Return Codes**:
- `0` - Success, continue operation
- `1-255` - Failure (blocking hooks abort, non-blocking hooks log error)

**Output Handling**:
- `stdout` - Captured and displayed to user
- `stderr` - Captured and logged as errors

### File Structure

```
.sprint-hooks/           # Project root
├── post-start          # Executable bash script
├── pre-complete        # Executable bash script
├── post-complete       # Executable bash script
├── pre-cleanup         # Executable bash script
├── pre-archive         # Executable bash script
└── post-archive        # Executable bash script

examples/sprint-hooks/   # Example hooks
├── node-typescript/
│   ├── post-start
│   ├── pre-complete
│   └── pre-cleanup
├── python-django/
│   └── post-start
└── README.md
```

---

## Implementation Phases

### Phase 1: Core Hook System (Tasks 1-7)

**Objective**: Implement hook discovery, execution, and integration with MCP tools

#### Task 1: Create Hook Types and Interfaces
**File**: `src/types/hooks.ts`

**Types to define**:
```typescript
export type HookName =
  | 'post-start'
  | 'pre-complete'
  | 'post-complete'
  | 'pre-cleanup'
  | 'pre-archive'
  | 'post-archive';

export interface HookContext {
  sprintId: string;
  worktreePath: string;
  planningDir: string;
  branch: string;
}

export interface HookResult {
  executed: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
}
```

**Acceptance Criteria**:
- Types exported from `src/types/hooks.ts`
- TypeScript compilation successful
- Types match design specification

---

#### Task 2: Implement Hook Discovery
**File**: `src/common/hook-manager.ts`

**Function**: `findHook(hookName: HookName): Promise<string | null>`

**Logic**:
1. Construct path: `.sprint-hooks/{hookName}`
2. Check if file exists
3. Check if file is executable (mode & 0o111)
4. Return path if executable, null otherwise

**Edge Cases**:
- Hook file doesn't exist → return null
- Hook file exists but not executable → return null (with warning log)
- .sprint-hooks directory doesn't exist → return null

**Acceptance Criteria**:
- Returns correct path for existing executable hooks
- Returns null for non-existent or non-executable hooks
- Logs warning when hook exists but isn't executable
- No errors thrown for missing directories

---

#### Task 3: Implement Hook Execution
**File**: `src/common/hook-manager.ts`

**Function**: `executeHook(hookName: HookName, context: HookContext): Promise<HookResult>`

**Logic**:
1. Call `findHook(hookName)`
2. If no hook found, return `{ executed: false }`
3. Build environment variables from context
4. Execute hook using `execSync` with:
   - `cwd: context.worktreePath`
   - `env: { ...process.env, ...hookEnv }`
   - `encoding: 'utf-8'`
   - `stdio: 'pipe'`
5. Capture stdout/stderr
6. Return result with exit code

**Error Handling**:
- Hook execution errors → Catch and return in HookResult
- Timeouts → Use execSync timeout option (default: 5 minutes)
- Permission errors → Log and return failure

**Acceptance Criteria**:
- Successfully executes hooks and captures output
- Handles hook failures gracefully
- Passes correct environment variables
- Respects execution timeout
- Returns proper HookResult in all cases

---

#### Task 4: Integrate post-start Hook with start-sprint
**File**: `src/tools/start-sprint.ts`

**Integration Point**: After worktree and planning directory created, before returning success

**Logic**:
```typescript
// After creating worktree and planning dir
logger.info('Checking for post-start hook...');
const hookResult = await executeHook('post-start', {
  sprintId,
  worktreePath,
  planningDir: sprintDir,
  branch: branchName,
});

if (hookResult.executed) {
  if (hookResult.exitCode === 0) {
    logger.info('Post-start hook completed successfully');
    resultText += `\n✅ Post-start hook executed\n`;
    if (hookResult.stdout) {
      resultText += `\n${hookResult.stdout}\n`;
    }
  } else {
    logger.warn('Post-start hook failed (non-blocking)', hookResult);
    resultText += `\n⚠️  Post-start hook failed (non-blocking)\n`;
    if (hookResult.stderr) {
      resultText += `Error: ${hookResult.stderr}\n`;
    }
  }
}
```

**Acceptance Criteria**:
- Hook executes after worktree creation
- Success output shown to user
- Failures logged but don't abort sprint creation
- Hook output included in result message

---

#### Task 5: Integrate pre-complete and post-complete Hooks
**File**: `src/tools/complete-sprint.ts`

**Integration Points**:
1. **pre-complete**: Before validation checks (BLOCKING)
2. **post-complete**: After status updated to 'complete' (NON-BLOCKING)

**pre-complete Logic**:
```typescript
// Before validation
logger.info('Checking for pre-complete hook...');
const preHook = await executeHook('pre-complete', context);

if (preHook.executed && preHook.exitCode !== 0) {
  return {
    content: [{
      type: 'text',
      text: `❌ Pre-completion hook failed:\n\n${preHook.stderr}\n\nFix issues and retry completion.`,
    }],
    isError: true,
  };
}
```

**post-complete Logic**:
```typescript
// After completion
const postHook = await executeHook('post-complete', context);
if (postHook.executed && postHook.exitCode !== 0) {
  logger.warn('Post-complete hook failed (non-blocking)', postHook);
}
```

**Acceptance Criteria**:
- pre-complete hook blocks completion on failure
- post-complete hook logs errors but doesn't block
- Clear error messages for hook failures
- Hook context includes correct sprint information

---

#### Task 6: Integrate pre-cleanup Hook with cleanup-sprint
**File**: `src/tools/cleanup-sprint.ts`

**Integration Point**: Before removing worktree (BLOCKING)

**Logic**:
```typescript
// Before worktree removal
logger.info('Checking for pre-cleanup hook...');
const hookResult = await executeHook('pre-cleanup', {
  sprintId,
  worktreePath,
  planningDir,
  branch,
});

if (hookResult.executed && hookResult.exitCode !== 0) {
  return {
    content: [{
      type: 'text',
      text: `❌ Pre-cleanup hook failed:\n\n${hookResult.stderr}\n\nFix issues before cleanup.`,
    }],
    isError: true,
  };
}
```

**Acceptance Criteria**:
- Hook executes before worktree removal
- Failure aborts cleanup operation
- Hook can stop services, backup data, etc.
- Clear error messages on failure

---

#### Task 7: Integrate pre-archive and post-archive Hooks
**File**: `src/tools/archive-sprint.ts`

**Integration Points**:
1. **pre-archive**: Before moving to archive (BLOCKING)
2. **post-archive**: After sprint archived (NON-BLOCKING)

**Similar logic to other tools**:
- pre-archive blocks on failure
- post-archive logs errors but continues

**Acceptance Criteria**:
- Hooks execute at correct points in archive workflow
- pre-archive can prevent archival
- post-archive runs after successful archive
- All hook output captured and displayed

---

### Phase 2: Templates & Documentation (Tasks 8-11)

**Objective**: Provide examples and update documentation

#### Task 8: Create Node.js/TypeScript Example Hooks
**Directory**: `examples/sprint-hooks/node-typescript/`

**Files to create**:
1. `post-start`:
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🔧 Setting up Node.js sprint environment..."
echo "📦 Installing dependencies..."
npm ci

if [ ! -f .env ]; then
  echo "🔐 Creating .env from template..."
  cp .env.example .env 2>/dev/null || true
fi

echo "🏗️  Running initial build..."
npm run build

echo "✅ Sprint worktree ready!"
```

2. `pre-complete`:
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🔍 Running pre-completion checks..."

if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Uncommitted changes detected!"
  git status
  exit 1
fi

echo "🧪 Running test suite..."
npm test

echo "✅ Pre-completion checks passed"
```

3. `pre-cleanup`:
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🧹 Preparing for cleanup..."

if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Uncommitted changes will be lost!"
  git status
fi

echo "✅ Ready for cleanup"
```

**Acceptance Criteria**:
- All hooks are executable (chmod +x)
- Hooks follow design spec exactly
- Comments explain each step
- Error handling included

---

#### Task 9: Create Python Example Hooks
**Directory**: `examples/sprint-hooks/python-django/`

**File**: `post-start`:
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🔧 Setting up Python sprint environment..."

echo "🐍 Creating virtual environment..."
python3 -m venv .venv

echo "📦 Installing dependencies..."
source .venv/bin/activate
pip install -r requirements.txt

echo "🗄️  Running database migrations..."
python manage.py migrate

echo "✅ Sprint worktree ready!"
```

**Acceptance Criteria**:
- Hook is executable
- Works for Python/Django projects
- Handles virtual environment creation
- Includes database migration

---

#### Task 10: Update AGENTS.md with Hooks Documentation
**File**: `AGENTS-uncompressed.md` (then regenerate AGENTS.md)

**Section to add**: 2.2.2 Sprint Lifecycle Hooks

**Content**:
```markdown
## 2.2.2 Sprint Lifecycle Hooks

Projects can define optional hooks in `.sprint-hooks/` to automate sprint workflows:

### Available Hooks

- **post-start** - After worktree created (setup dependencies, environment)
  - Non-blocking: errors logged but sprint creation succeeds
  - Use for: npm ci, .env setup, initial build, starting services

- **pre-complete** - Before completion validation (final checks)
  - Blocking: failures abort sprint completion
  - Use for: verify tests pass, check for uncommitted changes, linting

- **post-complete** - After sprint completed (notifications, metrics)
  - Non-blocking: errors logged but completion succeeds
  - Use for: send notifications, update external systems, generate reports

- **pre-cleanup** - Before worktree removed (backup, stop services)
  - Blocking: failures abort cleanup
  - Use for: stop Docker containers, backup databases, verify no uncommitted work

- **pre-archive** / **post-archive** - Before/after archiving sprint
  - pre-archive: blocking, post-archive: non-blocking
  - Use for: generate archive reports, update tracking systems

### Hook Environment Variables

All hooks receive these environment variables:
- `SPRINT_ID` - Sprint identifier (e.g., sprint-16-rgo90d)
- `SPRINT_WORKTREE` - Worktree path (e.g., /path/.worktrees/sprint-16-rgo90d)
- `SPRINT_PLANNING_DIR` - Planning directory path
- `SPRINT_BRANCH` - Feature branch name
- `SPRINT_EVENT` - Hook name being executed

### Example Hook (post-start for Node.js)

```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"
npm ci
npm run build
echo "✅ Worktree ready"
```

See `examples/sprint-hooks/` for complete examples.
```

**Acceptance Criteria**:
- Section added to AGENTS-uncompressed.md
- AGENTS.md regenerated with compressed version
- Clear explanation of each hook type
- Examples included

---

#### Task 11: Update start-sprint Output Messaging
**File**: `src/tools/start-sprint.ts`

**Update**: Modify "Next Steps" section to mention hooks

**New output**:
```
**Next Steps**:
1. cd .worktrees/sprint-16-rgo90d/
2. [If post-start hook ran] Worktree setup automated ✅
   [If no hook] Run: npm ci && npm run build
3. Create implementation-plan.md
4. Get user approval
```

**Acceptance Criteria**:
- Output adapts based on whether hook executed
- Clear guidance for projects with and without hooks
- Maintains existing output format

---

### Phase 3: Testing (Tasks 12-15)

**Objective**: Comprehensive test coverage for hooks system

#### Task 12: Unit Tests for Hook Discovery
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Finds executable hook in .sprint-hooks/
2. ✅ Returns null when hook doesn't exist
3. ✅ Returns null when hook exists but isn't executable
4. ✅ Logs warning for non-executable hooks
5. ✅ Returns null when .sprint-hooks directory doesn't exist
6. ✅ Handles all hook names (post-start, pre-complete, etc.)

**Acceptance Criteria**:
- All test cases passing
- Uses isolated test directory
- Cleans up test files after each test

---

#### Task 13: Unit Tests for Hook Execution
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Executes hook and captures stdout
2. ✅ Captures stderr on hook failure
3. ✅ Returns exit code correctly
4. ✅ Passes environment variables to hook
5. ✅ Returns executed: false when no hook found
6. ✅ Handles hook timeouts
7. ✅ Handles permission errors gracefully

**Acceptance Criteria**:
- All test cases passing
- Creates temporary test hooks
- Tests both success and failure scenarios
- Verifies environment variables passed correctly

---

#### Task 14: Integration Tests for Sprint Lifecycle
**File**: `src/__tests__/integration/hooks-lifecycle.test.ts`

**Test scenarios**:
1. ✅ start-sprint executes post-start hook
2. ✅ start-sprint continues if post-start fails
3. ✅ complete-sprint blocks on pre-complete failure
4. ✅ complete-sprint executes post-complete after completion
5. ✅ cleanup-sprint blocks on pre-cleanup failure
6. ✅ archive-sprint blocks on pre-archive failure
7. ✅ archive-sprint executes post-archive after archival

**Acceptance Criteria**:
- All integration scenarios passing
- Uses real tool functions (not mocks)
- Verifies blocking vs non-blocking behavior
- Tests complete workflows end-to-end

---

#### Task 15: Error Handling and Edge Case Tests
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Hook with syntax error (non-zero exit)
2. ✅ Hook that times out
3. ✅ Hook that writes to both stdout and stderr
4. ✅ Hook with permission errors
5. ✅ Multiple hooks executing in sequence
6. ✅ Hook execution from different working directories

**Acceptance Criteria**:
- All edge cases covered
- Error messages are clear and actionable
- No crashes or uncaught exceptions
- Timeouts handled gracefully

---

## Validation Strategy

### Manual Validation

1. **Create test hook**:
```bash
mkdir -p .sprint-hooks
cat > .sprint-hooks/post-start << 'EOF'
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"
echo "Hook executing for $SPRINT_ID"
npm ci
npm run build
echo "✅ Setup complete"
EOF
chmod +x .sprint-hooks/post-start
```

2. **Start new sprint** and verify:
   - Hook executes automatically
   - Output displayed to user
   - Dependencies installed in worktree
   - Build completes successfully

3. **Test blocking hooks**:
   - Create pre-complete hook that fails
   - Verify completion blocked
   - Fix hook and verify completion succeeds

### Automated Validation

- All unit tests passing (15+ tests for hook system)
- All integration tests passing (7+ scenarios)
- Overall test suite: 350+ tests passing

---

## Risks and Mitigations

### Risk 1: Hook Execution Security
**Risk**: Malicious hooks could execute arbitrary code
**Likelihood**: Low (user controls .sprint-hooks directory)
**Impact**: High (could compromise system)
**Mitigation**:
- Hooks must be in project .sprint-hooks/ directory (not system-wide)
- Hooks must be executable (explicit user action)
- Document security considerations in README
- Future: Consider hook signing/verification

### Risk 2: Hook Failures Breaking Workflow
**Risk**: Buggy hooks could prevent sprint operations
**Likelihood**: Medium (during initial setup)
**Impact**: Medium (user can fix or remove hook)
**Mitigation**:
- Clear error messages with hook output
- Non-blocking hooks (post-*) don't stop operations
- Users can chmod -x to disable hook temporarily
- Documentation includes troubleshooting guide

### Risk 3: Platform Compatibility
**Risk**: Bash hooks don't work on Windows
**Likelihood**: Medium (Windows users exist)
**Impact**: Medium (Windows users can't use hooks)
**Mitigation**:
- Document requirement: Bash available (Git Bash on Windows)
- Future: Support .ps1 PowerShell hooks on Windows
- Future: Support Node.js hooks (.mjs files)

---

## Dependencies

**Internal**:
- `src/common/file-utils.ts` - fileExists, stat functions
- `src/common/project-config.ts` - getProjectRoot
- `src/common/logger.ts` - Logging
- All MCP tools (start-sprint, complete-sprint, cleanup-sprint, archive-sprint)

**External**:
- Node.js `child_process.execSync` - Hook execution
- Node.js `fs/promises.stat` - Check executable permissions

**No new external dependencies required** ✅

---

## Rollout Plan

### Phase 1: Implementation (This Sprint)
- Implement core hook system
- Add integration to all tools
- Create examples and documentation
- Comprehensive testing

### Phase 2: Dogfooding (Immediate)
- Create post-start hook for sprint-mcp project
- Use hooks in Sprint 17 and beyond
- Gather feedback and iterate

### Phase 3: Production Readiness (Sprint 17?)
- Add hook configuration file support (.sprint-hooks/config.yaml)
- Add timeout configuration per hook
- Add hook template system
- Consider multi-language hook support (Node.js, Python, etc.)

---

## Success Metrics

**Quantitative**:
- ✅ 6 hook types implemented and integrated
- ✅ 4+ MCP tools with hook support
- ✅ 20+ tests for hooks system
- ✅ 2+ example hook sets (Node.js, Python)
- ✅ 0 breaking changes to existing functionality

**Qualitative**:
- ✅ No manual setup needed when starting sprint (with post-start hook)
- ✅ Clear error messages when hooks fail
- ✅ Examples easy to understand and adapt
- ✅ Documentation comprehensive and clear

---

## Open Questions

1. **Hook discovery**: Check parent directories like git? → **Decision**: No, only .sprint-hooks in project root for security
2. **Hook language**: Support Node.js/Python in addition to Bash? → **Decision**: Bash only for Sprint 16, others in future
3. **Hook timeout**: Default timeout for hooks? → **Decision**: 5 minutes (configurable in future)
4. **Hook output**: Stream output in real-time or show after completion? → **Decision**: Show after completion (simpler implementation)
5. **Hook sharing**: Registry for common hooks? → **Decision**: Defer to future sprint

---

## Appendix: Task Dependency Graph

```
Phase 1: Core System
  Task 1 (Types)
    ↓
  Task 2 (Discovery) ← Task 3 (Execution)
    ↓                     ↓
  Task 4 (start-sprint)
  Task 5 (complete-sprint)
  Task 6 (cleanup-sprint)
  Task 7 (archive-sprint)

Phase 2: Templates & Docs
  Task 8 (Node.js examples)
  Task 9 (Python examples)
  Task 10 (AGENTS.md update)
  Task 11 (Output messaging)

Phase 3: Testing
  Task 12 (Discovery tests) ← depends on Task 2
  Task 13 (Execution tests) ← depends on Task 3
  Task 14 (Integration tests) ← depends on Tasks 4-7
  Task 15 (Edge case tests) ← depends on Tasks 2-3
```

**Critical Path**: Tasks 1 → 2 → 3 → 4-7 → 14

---

## Timeline Estimate

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Core System | 1-7 | 4-5 hours |
| Phase 2: Templates & Docs | 8-11 | 2-3 hours |
| Phase 3: Testing | 12-15 | 2-3 hours |
| **Total** | **15 tasks** | **8-11 hours** |

**Recommendation**: Complete in single sprint (1-2 days)

---

**Plan Status**: Ready for Approval
**Next Step**: User approval, then update backlog status and begin implementation
