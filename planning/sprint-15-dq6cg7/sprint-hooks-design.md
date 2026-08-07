# Sprint Lifecycle Hooks - Design Proposal

**Sprint**: sprint-15-dq6cg7
**Date**: 2026-08-07
**Status**: Design Proposal (Not Implemented)
**Priority**: P0 (Blocker for production use)

## Problem Statement

The unified worktree model creates isolated sprint environments, but each worktree needs project-specific setup:

### Current Pain Points

1. **Manual dependency installation**: Must remember to run `npm ci` in every new worktree
2. **Environment configuration**: Must manually copy `.env.example` → `.env` and configure
3. **Database setup**: Projects with local databases need initialization
4. **IDE configuration**: Workspace settings, debugger configs
5. **Git hooks**: Project-specific hooks (pre-commit, commit-msg) not propagated
6. **Build artifacts**: Initial build may be needed before tests run
7. **Service dependencies**: Docker containers, local APIs, mock servers

### Why This Matters

Without automated setup, the unified worktree model:
- ❌ Requires manual steps (error-prone)
- ❌ Breaks automation promises
- ❌ Creates friction for agents and humans
- ❌ Varies by project (no standard workflow)

## Proposed Solution: Sprint Lifecycle Hooks

### Overview

Add optional, executable hook scripts at key sprint lifecycle events:

```
.sprint-hooks/
├── post-start           # After worktree + planning dir created
├── pre-complete         # Before sprint completion validation
├── post-complete        # After sprint marked complete
├── pre-archive          # Before archiving sprint
├── post-archive         # After sprint archived
└── pre-cleanup          # Before worktree removed
```

### Hook Interface

**Execution context**:
```bash
# Environment variables passed to hook
export SPRINT_ID="sprint-15-dq6cg7"
export SPRINT_WORKTREE="/path/to/.worktrees/sprint-15-dq6cg7"
export SPRINT_PLANNING_DIR="/path/to/.worktrees/sprint-15-dq6cg7/planning/sprint-15-dq6cg7"
export SPRINT_BRANCH="feature/sprint-15-dq6cg7-worktree-aware-tool-remediatio"
export SPRINT_EVENT="post-start"  # or pre-complete, post-complete, etc.

# Hook script is executed
.sprint-hooks/post-start
```

**Return codes**:
- `0` - Success, continue
- `1-255` - Failure, abort operation (except post-* hooks which only log errors)

**Output**:
- `stdout` - Logged and shown to user
- `stderr` - Logged as errors

### Hook Types

#### 1. `post-start` (After Sprint Created)

**When**: Immediately after `start-sprint` creates worktree and planning directory
**Purpose**: Set up worktree for development
**Blocking**: No (errors logged but sprint creation succeeds)

**Example** (Node.js project):
```bash
#!/bin/bash
# .sprint-hooks/post-start

set -e
cd "$SPRINT_WORKTREE"

echo "🔧 Setting up sprint worktree: $SPRINT_ID"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Configure environment
if [ ! -f .env ]; then
    echo "🔐 Creating .env from template..."
    cp .env.example .env
fi

# Initial build
echo "🏗️  Running initial build..."
npm run build

# Start local services (if needed)
if command -v docker-compose &> /dev/null; then
    echo "🐳 Starting Docker services..."
    docker-compose up -d
fi

echo "✅ Worktree setup complete!"
```

**Example** (Python project):
```bash
#!/bin/bash
# .sprint-hooks/post-start

set -e
cd "$SPRINT_WORKTREE"

echo "🔧 Setting up sprint worktree: $SPRINT_ID"

# Create virtual environment
python -m venv .venv

# Activate and install dependencies
source .venv/bin/activate
pip install -r requirements.txt

# Initialize database
python manage.py migrate

echo "✅ Worktree setup complete!"
```

#### 2. `pre-complete` (Before Sprint Completion Validation)

**When**: Before `complete-sprint` runs validation checks
**Purpose**: Run custom pre-completion checks, cleanup
**Blocking**: Yes (non-zero exit aborts completion)

**Example**:
```bash
#!/bin/bash
# .sprint-hooks/pre-complete

set -e
cd "$SPRINT_WORKTREE"

echo "🔍 Running pre-completion checks..."

# Ensure no uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Uncommitted changes detected!"
    git status
    exit 1
fi

# Verify all tests pass
npm test

# Check for TODO comments in new code
if git diff main --name-only | xargs grep -n "TODO"; then
    echo "⚠️  TODO comments found in changed files"
    echo "Please resolve or document in verification-report.md"
    # Don't fail, just warn
fi

echo "✅ Pre-completion checks passed"
```

#### 3. `post-complete` (After Sprint Completion)

**When**: After sprint status changed to 'complete'
**Purpose**: Trigger post-completion automation
**Blocking**: No (errors logged but completion succeeds)

**Example**:
```bash
#!/bin/bash
# .sprint-hooks/post-complete

set -e

echo "🎉 Sprint $SPRINT_ID completed!"

# Send notification
if command -v notify-send &> /dev/null; then
    notify-send "Sprint Complete" "$SPRINT_ID is done!"
fi

# Update external tracking system
if [ -n "$JIRA_API_TOKEN" ]; then
    curl -X POST "https://api.jira.com/..." \
        -H "Authorization: Bearer $JIRA_API_TOKEN" \
        -d "{\"status\": \"completed\", \"sprint\": \"$SPRINT_ID\"}"
fi

# Generate metrics report
cd "$SPRINT_PLANNING_DIR"
python ../../scripts/generate-metrics.py
```

#### 4. `pre-cleanup` (Before Worktree Removed)

**When**: Before `cleanup-sprint` removes worktree
**Purpose**: Backup artifacts, stop services
**Blocking**: Yes (non-zero exit aborts cleanup)

**Example**:
```bash
#!/bin/bash
# .sprint-hooks/pre-cleanup

set -e
cd "$SPRINT_WORKTREE"

echo "🧹 Preparing for worktree cleanup: $SPRINT_ID"

# Stop any running services
if command -v docker-compose &> /dev/null; then
    echo "🐳 Stopping Docker services..."
    docker-compose down || true
fi

# Backup any local databases
if [ -f local.db ]; then
    echo "💾 Backing up local database..."
    cp local.db "$SPRINT_PLANNING_DIR/local.db.backup"
fi

# Verify all changes committed
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: Uncommitted changes will be lost!"
    git status
    read -p "Continue cleanup? (y/N) " -n 1 -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "✅ Ready for cleanup"
```

#### 5. `pre-archive` / `post-archive`

**When**: Before/after moving sprint to archive
**Purpose**: Generate reports, update external systems
**Blocking**: pre-archive: Yes, post-archive: No

**Example** (post-archive):
```bash
#!/bin/bash
# .sprint-hooks/post-archive

echo "📦 Sprint $SPRINT_ID archived"

# Update sprint database/tracking
python scripts/update-sprint-metrics.py --archived "$SPRINT_ID"

# Generate archive report
cd "$SPRINT_PLANNING_DIR"
pandoc retro.md -o retro.pdf
```

## Implementation Plan

### Phase 1: Core Hook System (Sprint 16)

1. **Hook discovery**:
   ```typescript
   async function findHook(hookName: string): Promise<string | null> {
     const hookPath = join(getProjectRoot(), '.sprint-hooks', hookName);
     if (await fileExists(hookPath)) {
       // Check if executable
       const stats = await stat(hookPath);
       if (stats.mode & 0o111) {
         return hookPath;
       }
     }
     return null;
   }
   ```

2. **Hook execution**:
   ```typescript
   async function executeHook(
     hookName: string,
     context: HookContext
   ): Promise<HookResult> {
     const hookPath = await findHook(hookName);
     if (!hookPath) {
       return { executed: false };
     }

     const env = {
       ...process.env,
       SPRINT_ID: context.sprintId,
       SPRINT_WORKTREE: context.worktreePath,
       SPRINT_PLANNING_DIR: context.planningDir,
       SPRINT_BRANCH: context.branch,
       SPRINT_EVENT: hookName,
     };

     try {
       const result = execSync(hookPath, {
         cwd: context.worktreePath,
         env,
         encoding: 'utf-8',
         stdio: 'pipe',
       });

       return {
         executed: true,
         exitCode: 0,
         stdout: result,
       };
     } catch (error) {
       return {
         executed: true,
         exitCode: error.status || 1,
         stdout: error.stdout,
         stderr: error.stderr,
         error: error.message,
       };
     }
   }
   ```

3. **Integration with tools**:

   **start-sprint.ts** (after worktree creation):
   ```typescript
   // After creating worktree and planning dir
   logger.info('Executing post-start hook...');
   const hookResult = await executeHook('post-start', {
     sprintId,
     worktreePath,
     planningDir,
     branch: branchName,
   });

   if (hookResult.executed) {
     if (hookResult.exitCode === 0) {
       logger.info('Post-start hook succeeded');
       resultText += `\n✅ Post-start hook executed successfully\n`;
     } else {
       logger.warn('Post-start hook failed (non-blocking)', hookResult);
       resultText += `\n⚠️  Post-start hook failed: ${hookResult.error}\n`;
       resultText += `See logs for details\n`;
     }
   }
   ```

   **complete-sprint.ts** (before validation):
   ```typescript
   // Before validation
   const hookResult = await executeHook('pre-complete', context);
   if (hookResult.executed && hookResult.exitCode !== 0) {
     return {
       content: [{
         type: 'text',
         text: `❌ Pre-completion hook failed:\n\n${hookResult.stderr}\n\nFix issues and retry completion.`,
       }],
       isError: true,
     };
   }
   ```

### Phase 2: Hook Templates & Documentation (Sprint 16)

1. **Create hook templates**:
   ```
   examples/sprint-hooks/
   ├── node-typescript/
   │   ├── post-start
   │   ├── pre-complete
   │   └── pre-cleanup
   ├── python-django/
   │   └── post-start
   ├── go-microservice/
   │   └── post-start
   └── README.md
   ```

2. **Update AGENTS.md**:
   ```markdown
   ## 2.2.2 Sprint Lifecycle Hooks

   Projects can define optional hooks in `.sprint-hooks/`:

   - `post-start` - After worktree created (setup dependencies, environment)
   - `pre-complete` - Before completion validation (final checks)
   - `post-complete` - After sprint completed (notifications, metrics)
   - `pre-cleanup` - Before worktree removed (backup, stop services)

   Hooks receive environment variables:
   - `SPRINT_ID` - Sprint identifier
   - `SPRINT_WORKTREE` - Worktree path
   - `SPRINT_PLANNING_DIR` - Planning directory path
   - `SPRINT_BRANCH` - Feature branch name
   ```

3. **Add to start-sprint output**:
   ```
   **Next Steps**:
   1. cd .worktrees/sprint-N/
   2. Worktree setup automated via post-start hook ✅
   3. Create implementation-plan.md
   4. Get user approval
   ```

### Phase 3: Advanced Features (Future)

1. **Hook configuration** (`.sprint-hooks/config.yaml`):
   ```yaml
   hooks:
     post-start:
       enabled: true
       timeout: 300  # 5 minutes
       continueOnError: true
     pre-complete:
       enabled: true
       timeout: 600
       continueOnError: false  # Block completion on failure
   ```

2. **Hook templates with variable substitution**:
   ```bash
   # Can use template variables
   echo "Setting up {{SPRINT_ID}}"
   ```

3. **Conditional hooks**:
   ```yaml
   hooks:
     post-start:
       when: "project.type == 'node'"
       script: node-setup.sh
   ```

4. **Hook composition**:
   ```yaml
   hooks:
     post-start:
       scripts:
         - install-deps.sh
         - setup-database.sh
         - configure-env.sh
   ```

## Benefits

### For Agents
- ✅ Automated worktree setup (no manual steps)
- ✅ Consistent environment across all sprints
- ✅ Validation gates prevent incomplete work
- ✅ Clear error messages when setup fails

### For Humans
- ✅ One-time hook configuration per project
- ✅ No manual setup when switching sprints
- ✅ Project-specific workflows codified
- ✅ Easier onboarding (hooks document setup)

### For Projects
- ✅ Customizable to any stack (Node, Python, Go, etc.)
- ✅ Integrates with existing tooling (Docker, databases, etc.)
- ✅ Enforces quality gates (pre-complete checks)
- ✅ Automates repetitive tasks

## Migration Path

### For Existing Projects

1. **Sprint 16**: Implement core hook system
2. **Sprint 17**: Create hook templates for common stacks
3. **For this project** (sprint-mcp):
   ```bash
   mkdir -p .sprint-hooks
   cat > .sprint-hooks/post-start << 'EOF'
   #!/bin/bash
   set -e
   cd "$SPRINT_WORKTREE"
   npm ci
   cp .env.example .env 2>/dev/null || true
   npm run build
   echo "✅ Sprint worktree ready"
   EOF
   chmod +x .sprint-hooks/post-start
   ```

### Backward Compatibility

- Hooks are **optional** (projects without hooks work as before)
- No breaking changes to existing tools
- Progressive enhancement (add hooks when needed)

## Open Questions

1. **Hook discovery**: Should we check parent directories for hooks? (like git)
2. **Hook inheritance**: Should hooks be project-wide or per-sprint?
3. **Hook language**: Bash-only or support Node.js/Python scripts?
4. **Hook security**: How to prevent malicious hooks? (signing, verification)
5. **Hook sharing**: Should there be a hook registry/marketplace?

## Recommendation

**Implement in Sprint 16** as P0 priority because:

1. Without hooks, unified worktree model has significant friction
2. Manual setup steps break automation promises
3. Every project using sprint-mcp needs this
4. Design is straightforward, implementation is ~1 day
5. Unlocks full potential of unified worktree model

## References

- Git hooks: https://git-scm.com/docs/githooks
- npm scripts lifecycle: https://docs.npmjs.com/cli/v8/using-npm/scripts
- Husky (Git hooks tool): https://typicode.github.io/husky/
- Tooling in sprint-mcp: `src/common/git-utils.ts`

---

**Status**: Design proposal, ready for implementation
**Next**: Add to Sprint 16 backlog as TOOL-006
