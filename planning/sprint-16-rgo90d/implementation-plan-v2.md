# Sprint 16 Implementation Plan (v2 - Revised Hook Model)

**Sprint ID**: sprint-16-rgo90d
**Title**: Sprint Lifecycle Hooks Implementation
**Date**: 2026-08-07
**Owner**: Christopher Navta
**Priority**: P0 (Blocker for production use)
**Version**: 2.0 (Revised: Separate lifecycle and status hooks)

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

## Revised Hook Model (Option A)

**Key Design Decision**: Separate **lifecycle hooks** (explicit) from **status change hooks** (generic).

### Hook Types

#### Lifecycle Hooks (Explicit - Tied to Specific Events)
| Hook Name | Event | Blocking? | Purpose |
|-----------|-------|-----------|---------|
| `post-worktree-create` | After worktree + planning dir created | No | Setup dependencies, environment |
| `pre-worktree-remove` | Before worktree removed | Yes | Stop services, backup data |
| `pre-archive` | Before moving to archive | Yes | Generate reports, final validations |
| `post-archive` | After sprint archived | No | Update tracking systems, metrics |

#### Status Change Hook (Generic - Handles All Status Transitions)
| Hook Name | Event | Blocking? | Purpose |
|-----------|-------|-----------|---------|
| `on-status-change` | Before/after ANY status change | Pre: Yes, Post: No | Universal validation gates and notifications |

**Status transitions handled by on-status-change**:
- `planning → in-progress` (start working)
- `in-progress → validating` (begin validation)
- `validating → verifying` (validation passed)
- `verifying → published` (verification passed)
- `published → complete` (PR merged)
- Any other future status transitions

### Environment Variables

**All hooks receive**:
```bash
SPRINT_ID="sprint-16-rgo90d"
SPRINT_WORKTREE="/path/to/.worktrees/sprint-16-rgo90d"
SPRINT_PLANNING_DIR="/path/to/.worktrees/sprint-16-rgo90d/planning/sprint-16-rgo90d"
SPRINT_BRANCH="feature/sprint-16-rgo90d-..."
SPRINT_EVENT="post-worktree-create"  # Hook name being executed
```

**on-status-change also receives**:
```bash
SPRINT_STATUS_FROM="in-progress"      # Previous status
SPRINT_STATUS_TO="complete"           # New status
SPRINT_LIFECYCLE_PHASE="pre"          # or "post"
```

### File Structure

```
.sprint-hooks/                   # Project root
├── post-worktree-create        # Executable bash script
├── on-status-change            # Executable bash script
├── pre-worktree-remove         # Executable bash script
├── pre-archive                 # Executable bash script
└── post-archive                # Executable bash script

examples/sprint-hooks/          # Example hooks
├── node-typescript/
│   ├── post-worktree-create
│   ├── on-status-change
│   └── pre-worktree-remove
├── python-django/
│   └── post-worktree-create
└── README.md
```

---

## Example Hook Usage

### post-worktree-create (Node.js)
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🔧 Setting up sprint worktree: $SPRINT_ID"
echo "📦 Installing dependencies..."
npm ci

if [ ! -f .env ]; then
  echo "🔐 Creating .env from template..."
  cp .env.example .env 2>/dev/null || true
fi

echo "🏗️  Running initial build..."
npm run build

echo "✅ Worktree ready!"
```

### on-status-change (Pre-completion validation)
```bash
#!/bin/bash
set -e

# Pre-completion validation
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ] && [ "$SPRINT_STATUS_TO" = "complete" ]; then
  echo "🔍 Running pre-completion checks..."
  cd "$SPRINT_WORKTREE"

  # Check for uncommitted changes
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes detected!"
    git status
    exit 1
  fi

  # Run tests
  npm test
  echo "✅ Pre-completion checks passed"
fi

# Post-completion notification
if [ "$SPRINT_LIFECYCLE_PHASE" = "post" ] && [ "$SPRINT_STATUS_TO" = "complete" ]; then
  echo "🎉 Sprint $SPRINT_ID completed!"
fi
```

### pre-worktree-remove (Cleanup)
```bash
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"

echo "🧹 Preparing for worktree cleanup: $SPRINT_ID"

# Stop Docker services
if command -v docker-compose &> /dev/null; then
  echo "🐳 Stopping Docker services..."
  docker-compose down || true
fi

# Warn about uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: Uncommitted changes will be lost!"
  git status
fi

echo "✅ Ready for cleanup"
```

---

## Goals

### Primary Goals
1. **Automate worktree setup**: Eliminate manual `npm ci` and configuration steps
2. **Enable project-specific workflows**: Support Node.js, Python, Go, and other stacks
3. **Add validation gates**: Universal status change hook for quality checks
4. **Support cleanup automation**: Stop services, backup data before worktree removal

### Success Criteria
- ✅ Hooks execute automatically at the right lifecycle events
- ✅ Hook failures are properly surfaced to users
- ✅ Blocking hooks can abort operations
- ✅ Non-blocking hooks log errors but continue
- ✅ on-status-change hook receives correct status transition info
- ✅ Example hooks provided for common stacks (Node.js, Python)
- ✅ All tests passing (including new hook tests)
- ✅ Documentation updated (AGENTS.md, examples)

---

## Implementation Phases

### Phase 1: Core Hook System (Tasks 1-6)

**Objective**: Implement hook discovery, execution, and integration with MCP tools

#### Task 1: Create Hook Types and Interfaces
**File**: `src/types/hooks.ts`

**Types to define**:
```typescript
export type HookName =
  | 'post-worktree-create'
  | 'on-status-change'
  | 'pre-worktree-remove'
  | 'pre-archive'
  | 'post-archive';

export interface HookContext {
  sprintId: string;
  worktreePath: string;
  planningDir: string;
  branch: string;
  // For on-status-change only:
  statusFrom?: string;
  statusTo?: string;
  lifecyclePhase?: 'pre' | 'post';
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
- All 5 hook types defined
- HookContext supports both lifecycle and status change hooks

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
3. Build environment variables from context:
   - Base: `SPRINT_ID`, `SPRINT_WORKTREE`, `SPRINT_PLANNING_DIR`, `SPRINT_BRANCH`, `SPRINT_EVENT`
   - Status change: `SPRINT_STATUS_FROM`, `SPRINT_STATUS_TO`, `SPRINT_LIFECYCLE_PHASE`
4. Execute hook using `execSync` with proper options
5. Capture stdout/stderr
6. Return result with exit code

**Error Handling**:
- Hook execution errors → Catch and return in HookResult
- Timeouts → Use execSync timeout option (default: 5 minutes)
- Permission errors → Log and return failure

**Acceptance Criteria**:
- Successfully executes hooks and captures output
- Handles hook failures gracefully
- Passes correct environment variables (including status change vars)
- Returns proper HookResult in all cases

---

#### Task 4: Integrate post-worktree-create Hook
**File**: `src/tools/start-sprint.ts`

**Integration Point**: After worktree and planning directory created

**Logic**:
```typescript
// After creating worktree and planning dir
logger.info('Checking for post-worktree-create hook...');
const hookResult = await executeHook('post-worktree-create', {
  sprintId,
  worktreePath,
  planningDir: sprintDir,
  branch: branchName,
});

if (hookResult.executed) {
  if (hookResult.exitCode === 0) {
    logger.info('Post-worktree-create hook completed successfully');
    resultText += `\n✅ Worktree setup automated via post-worktree-create hook\n`;
    if (hookResult.stdout) {
      resultText += `\n${hookResult.stdout}\n`;
    }
  } else {
    logger.warn('Post-worktree-create hook failed (non-blocking)', hookResult);
    resultText += `\n⚠️  Post-worktree-create hook failed (non-blocking)\n`;
    if (hookResult.stderr) {
      resultText += `Error: ${hookResult.stderr}\n`;
    }
  }
}
```

**Acceptance Criteria**:
- Hook executes after worktree creation
- Success output shown to user
- Failures logged but don't abort sprint creation (non-blocking)
- Hook stdout included in result message

---

#### Task 5: Integrate on-status-change Hook
**File**: `src/tools/update-sprint-status.ts`

**Integration Points**:
1. **PRE phase**: Before updating status (BLOCKING)
2. **POST phase**: After status updated (NON-BLOCKING)

**Logic**:
```typescript
// PRE: Before status update (blocking)
const preHook = await executeHook('on-status-change', {
  sprintId,
  worktreePath,
  planningDir,
  branch,
  statusFrom: currentStatus,
  statusTo: newStatus,
  lifecyclePhase: 'pre',
});

if (preHook.executed && preHook.exitCode !== 0) {
  return {
    content: [{
      type: 'text',
      text: `❌ Pre-status-change hook failed:\n\n${preHook.stderr}\n\nFix issues and retry.`,
    }],
    isError: true,
  };
}

// Update status in manifest...

// POST: After status update (non-blocking)
const postHook = await executeHook('on-status-change', {
  sprintId,
  worktreePath,
  planningDir,
  branch,
  statusFrom: currentStatus,
  statusTo: newStatus,
  lifecyclePhase: 'post',
});

if (postHook.executed && postHook.exitCode !== 0) {
  logger.warn('Post-status-change hook failed (non-blocking)', postHook);
}
```

**Acceptance Criteria**:
- Pre-phase hook blocks status update on failure
- Post-phase hook logs errors but doesn't block
- Hook receives correct statusFrom, statusTo, lifecyclePhase
- Works for ALL status transitions (not just completion)

---

#### Task 6: Integrate Lifecycle Hooks (cleanup, archive)
**Files**:
- `src/tools/cleanup-sprint.ts` - pre-worktree-remove
- `src/tools/archive-sprint.ts` - pre-archive, post-archive

**cleanup-sprint.ts**:
```typescript
// Before worktree removal
const hookResult = await executeHook('pre-worktree-remove', {
  sprintId,
  worktreePath,
  planningDir,
  branch,
});

if (hookResult.executed && hookResult.exitCode !== 0) {
  return {
    content: [{
      type: 'text',
      text: `❌ Pre-worktree-remove hook failed:\n\n${hookResult.stderr}\n\nFix issues before cleanup.`,
    }],
    isError: true,
  };
}
```

**archive-sprint.ts** (similar for pre-archive, post-archive):
- pre-archive: BLOCKING
- post-archive: NON-BLOCKING

**Acceptance Criteria**:
- Hooks execute at correct points
- Blocking hooks can prevent operations
- Non-blocking hooks log but continue

---

### Phase 2: Templates & Documentation (Tasks 7-10)

#### Task 7: Create Node.js/TypeScript Example Hooks
**Directory**: `examples/sprint-hooks/node-typescript/`

**Files**:
1. `post-worktree-create` - npm ci, .env setup, npm run build
2. `on-status-change` - Pre-completion: check uncommitted, run tests; Post-completion: notification
3. `pre-worktree-remove` - Warn about uncommitted changes
4. `README.md` - Usage instructions

**Acceptance Criteria**:
- All hooks are executable (chmod +x)
- Hooks follow design examples
- Well-commented with clear purpose

---

#### Task 8: Create Python Example Hooks
**Directory**: `examples/sprint-hooks/python-django/`

**Files**:
1. `post-worktree-create` - venv, pip install, migrate
2. `README.md` - Django-specific setup

**Acceptance Criteria**:
- Hook is executable
- Follows Python best practices

---

#### Task 9: Update AGENTS.md with Hooks Documentation
**File**: `AGENTS-uncompressed.md` (then regenerate AGENTS.md)

**Section to add**: 2.2.2 Sprint Lifecycle Hooks

**Content**:
- Describe all 5 hook types
- Explain lifecycle vs status hooks
- List environment variables
- Explain blocking vs non-blocking
- Include example hooks
- Reference examples/ directory

**Acceptance Criteria**:
- Clear explanation of hook model
- All hooks documented with purpose
- Examples accurate

---

#### Task 10: Update start-sprint Output Messaging
**File**: `src/tools/start-sprint.ts`

**Update "Next Steps" section**:
```
**Next Steps**:
1. cd .worktrees/sprint-16-rgo90d/
2. [If hook ran] Worktree setup automated ✅
   [If no hook] Run: npm ci && npm run build
3. Create implementation-plan.md
4. Get user approval
```

**Acceptance Criteria**:
- Output adapts based on whether hook executed
- Clear guidance for projects with and without hooks

---

### Phase 3: Testing (Tasks 11-14)

#### Task 11: Unit Tests for Hook Discovery
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Finds executable hook
2. ✅ Returns null when hook doesn't exist
3. ✅ Returns null for non-executable hooks
4. ✅ Tests all 5 hook names
5. ✅ Handles missing .sprint-hooks directory

**Acceptance Criteria**:
- All test cases passing
- Uses isolated test directory
- 100% coverage for findHook()

---

#### Task 12: Unit Tests for Hook Execution
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Executes hook and captures stdout
2. ✅ Captures stderr on failure
3. ✅ Passes environment variables correctly
4. ✅ Tests status change variables (statusFrom, statusTo, lifecyclePhase)
5. ✅ Handles timeouts
6. ✅ Returns executed: false when no hook

**Acceptance Criteria**:
- All test cases passing
- Tests both lifecycle and status change hooks
- 100% coverage for executeHook()

---

#### Task 13: Integration Tests for Sprint Lifecycle
**File**: `src/__tests__/integration/hooks-lifecycle.test.ts`

**Test scenarios**:
1. ✅ start-sprint executes post-worktree-create
2. ✅ start-sprint continues if hook fails
3. ✅ update-sprint-status executes on-status-change (pre + post)
4. ✅ on-status-change blocks on pre-phase failure
5. ✅ cleanup-sprint blocks on pre-worktree-remove failure
6. ✅ archive-sprint blocks on pre-archive failure
7. ✅ archive-sprint executes post-archive

**Acceptance Criteria**:
- All integration scenarios passing
- Uses real tool functions
- Verifies status transition variables
- Tests complete workflows

---

#### Task 14: Error Handling and Edge Case Tests
**File**: `src/common/__tests__/hook-manager.test.ts`

**Test cases**:
1. ✅ Hook with syntax error
2. ✅ Hook timeout
3. ✅ Hook writing to both stdout and stderr
4. ✅ Multiple status transitions in sequence
5. ✅ Execution from different working directories

**Acceptance Criteria**:
- All edge cases covered
- Error messages clear
- No uncaught exceptions

---

## Validation Strategy

### Manual Validation

1. **Create test hooks**:
```bash
mkdir -p .sprint-hooks

# post-worktree-create
cat > .sprint-hooks/post-worktree-create << 'EOF'
#!/bin/bash
set -e
cd "$SPRINT_WORKTREE"
echo "Setting up $SPRINT_ID..."
npm ci
npm run build
echo "✅ Setup complete"
EOF
chmod +x .sprint-hooks/post-worktree-create

# on-status-change
cat > .sprint-hooks/on-status-change << 'EOF'
#!/bin/bash
set -e
echo "Status change: $SPRINT_STATUS_FROM → $SPRINT_STATUS_TO ($SPRINT_LIFECYCLE_PHASE)"
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ] && [ "$SPRINT_STATUS_TO" = "complete" ]; then
  cd "$SPRINT_WORKTREE"
  npm test
fi
EOF
chmod +x .sprint-hooks/on-status-change
```

2. **Test workflow**:
   - Start new sprint → Verify post-worktree-create runs
   - Update status → Verify on-status-change runs (pre + post)
   - Complete sprint → Verify pre-completion tests run
   - Cleanup → Verify pre-worktree-remove runs

---

## Summary

**Revised Hook Model Benefits**:
- ✅ **Cleaner separation**: Lifecycle events vs status transitions
- ✅ **Scales better**: Single on-status-change handles all transitions
- ✅ **Simpler**: 5 hooks instead of 6+
- ✅ **More flexible**: on-status-change can handle any status transition
- ✅ **Easier to implement**: Fewer integration points

**Total: 5 hooks, 14 tasks, 8-10 hours**

---

**Plan Status**: Ready for Approval (v2 - Revised Hook Model)
**Next Step**: User approval, then update backlog and begin implementation
