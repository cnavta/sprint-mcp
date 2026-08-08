# Sprint Lifecycle Hooks - Node.js/TypeScript Examples

Example hooks for Node.js/TypeScript projects demonstrating sprint lifecycle automation.

## Quick Start

```bash
# Copy hooks to your project's .sprint-hooks/ directory
cp -r examples/sprint-hooks/node-typescript/* .sprint-hooks/

# Ensure hooks are executable
chmod +x .sprint-hooks/*
```

## Available Hooks

### 1. `post-worktree-create`

**When it runs**: After sprint worktree and planning directory are created (during `start-sprint`)

**Behavior**: NON-BLOCKING - Failures logged but don't prevent sprint creation

**What it does**:
- Installs dependencies (`npm ci`)
- Creates `.env` file from template (`.env.template` or `.env.example`)
- Builds the project (`npm run build`)
- Runs setup scripts if configured (`npm run setup`)

**Environment Variables**:
- `SPRINT_ID` - Sprint identifier (e.g., `sprint-16-rgo90d`)
- `SPRINT_WORKTREE` - Absolute path to worktree (e.g., `.worktrees/sprint-16-rgo90d`)
- `SPRINT_PLANNING_DIR` - Absolute path to planning directory
- `SPRINT_BRANCH` - Feature branch name (e.g., `feature/sprint-16-rgo90d-hooks`)
- `SPRINT_EVENT` - Always `post-worktree-create`

**Example output**:
```
🚀 post-worktree-create: Automating worktree setup for sprint-16-rgo90d
   Worktree: /path/.worktrees/sprint-16-rgo90d
   Branch: feature/sprint-16-rgo90d-hooks

📦 Installing dependencies...
✅ Dependencies installed
📝 Setting up environment file...
✅ Created .env from .env.template
🔨 Building project...
✅ Build completed
✅ Worktree setup complete! Ready for sprint work.
```

---

### 2. `on-status-change`

**When it runs**: BEFORE (PRE phase) and AFTER (POST phase) ANY status change (during `update-sprint-status`)

**Behavior**:
- **PRE phase**: BLOCKING - Failures prevent status update
- **POST phase**: NON-BLOCKING - Failures logged but don't prevent status update

**What it does**:

**PRE phase (before status update)**:
- Checks for uncommitted changes before starting sprint (`planning` → `in-progress`)
- Runs test suite before validation/completion (`* → validating` or `* → complete`)
- Verifies build succeeds before completion (`* → complete`)

**POST phase (after status update)**:
- Sends notifications on sprint completion
- Logs metrics to external systems

**Environment Variables**:
- `SPRINT_ID` - Sprint identifier
- `SPRINT_WORKTREE` - Absolute path to worktree
- `SPRINT_PLANNING_DIR` - Absolute path to planning directory
- `SPRINT_BRANCH` - Feature branch name
- `SPRINT_EVENT` - Always `on-status-change`
- **`SPRINT_STATUS_FROM`** - Previous status (e.g., `planning`)
- **`SPRINT_STATUS_TO`** - New status (e.g., `in-progress`)
- **`SPRINT_LIFECYCLE_PHASE`** - Either `pre` (before update) or `post` (after update)

**Status Transition Examples**:

| Transition | PRE Phase Actions | POST Phase Actions |
|------------|-------------------|-------------------|
| `planning` → `in-progress` | Check for uncommitted changes | - |
| `in-progress` → `validating` | Run tests | - |
| `validating` → `complete` | Run tests, verify build | Send notification, log metrics |
| `complete` → `published` | - | Trigger deployment (optional) |

**Example PRE phase (BLOCKING)**:
```bash
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  if [ "$SPRINT_STATUS_TO" = "in-progress" ]; then
    if ! git diff-index --quiet HEAD --; then
      echo "❌ ERROR: Cannot start sprint with uncommitted changes"
      exit 1  # BLOCKS status update
    fi
  fi
fi
```

**Example POST phase (NON-BLOCKING)**:
```bash
if [ "$SPRINT_LIFECYCLE_PHASE" = "post" ]; then
  if [ "$SPRINT_STATUS_TO" = "complete" ]; then
    echo "🎉 Sprint completed! Sending notification..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -d "{\"text\": \"Sprint $SPRINT_ID completed!\"}"
  fi
fi
```

**Example output (PRE phase blocking)**:
```
🔄 on-status-change: Status transition detected
   Sprint: sprint-16-rgo90d
   Transition: in-progress → complete
   Phase: pre

🔒 PRE phase: Validating status transition...
   Running test suite before completion...
   ✅ All tests passed
   Verifying build succeeds...
   ✅ Build successful
✅ PRE phase validation passed - status update will proceed
```

---

### 3. `pre-worktree-remove`

**When it runs**: BEFORE worktree removal (during `cleanup-sprint`)

**Behavior**: BLOCKING - Failures prevent worktree removal

**What it does**:
- Checks for uncommitted changes (safety check)
- Checks for unpushed commits
- Stops running services (`docker-compose down`)
- Warns about temporary data that might need backup

**Environment Variables**:
- `SPRINT_ID` - Sprint identifier
- `SPRINT_WORKTREE` - Absolute path to worktree
- `SPRINT_PLANNING_DIR` - Absolute path to planning directory
- `SPRINT_BRANCH` - Feature branch name
- `SPRINT_EVENT` - Always `pre-worktree-remove`

**Example output**:
```
🧹 pre-worktree-remove: Preparing for worktree cleanup
   Sprint: sprint-16-rgo90d
   Worktree: /path/.worktrees/sprint-16-rgo90d

🔍 Checking for uncommitted changes...
✅ No uncommitted changes
🔍 Checking for unpushed commits...
✅ All commits pushed
🛑 Stopping running services...
   Stopping docker-compose services...
   ✅ Docker services stopped
✅ Pre-cleanup checks passed - worktree is safe to remove
```

**Example blocking (uncommitted changes)**:
```
🔍 Checking for uncommitted changes...
⚠️  WARNING: Uncommitted changes detected!

 M src/tools/start-sprint.ts
?? new-file.ts

❌ ERROR: Cannot remove worktree with uncommitted changes
   Options:
   1. Commit changes: git add . && git commit -m 'message'
   2. Stash changes: git stash
   3. Force cleanup (loses changes): cleanup-sprint --force

# Hook exits with code 1 - cleanup is blocked
```

---

## Sprint Status Reference

Sprint statuses follow this lifecycle:

```
planning → in-progress → validating → verifying → published → complete
```

### Status Definitions

- **planning**: Initial state, creating implementation plan
- **in-progress**: Active development work
- **validating**: Running validation script (`validate_deliverable.sh`)
- **verifying**: Creating verification report
- **published**: Pull request created
- **complete**: Sprint finished, ready for archive/cleanup

---

## Customization

### Adding Slack Notifications

Uncomment the Slack webhook section in `on-status-change`:

```bash
if [ "$SPRINT_STATUS_TO" = "complete" ]; then
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"Sprint $SPRINT_ID completed! 🎉\"}"
  fi
fi
```

Set webhook URL in your environment:
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

### Adding Custom Services

Stop your project-specific services in `pre-worktree-remove`:

```bash
# Example: Stop PM2 processes
pm2 delete "$SPRINT_ID" 2>/dev/null || true

# Example: Stop custom local server
pkill -f "my-server --port 3000" || true
```

### Adding Database Migrations

Run migrations in `post-worktree-create`:

```bash
# Example: Run database migrations
if grep -q '"migrate":' package.json; then
  npm run migrate
fi
```

---

## Best Practices

1. **Always exit 0 for success**: Hooks should return exit code 0 on success
2. **Exit 1 to block**: In PRE phase or BLOCKING hooks, exit 1 prevents operation
3. **Use set -e**: Exit immediately on error to prevent partial executions
4. **Log clearly**: Use emojis and clear messages for visibility
5. **Handle missing files**: Check if package.json/docker-compose.yml exists before using
6. **Test your hooks**: Run manually before deploying to team

## Testing Hooks

Test hooks manually before committing:

```bash
# Test post-worktree-create
cd .worktrees/sprint-X/
SPRINT_ID="sprint-test-123" \
SPRINT_WORKTREE="$(pwd)" \
SPRINT_PLANNING_DIR="$(pwd)/planning/sprint-test-123" \
SPRINT_BRANCH="feature/test" \
SPRINT_EVENT="post-worktree-create" \
.sprint-hooks/post-worktree-create

# Test on-status-change (PRE phase)
SPRINT_ID="sprint-test-123" \
SPRINT_WORKTREE="$(pwd)" \
SPRINT_STATUS_FROM="planning" \
SPRINT_STATUS_TO="in-progress" \
SPRINT_LIFECYCLE_PHASE="pre" \
.sprint-hooks/on-status-change

# Test pre-worktree-remove
.sprint-hooks/pre-worktree-remove
```

---

## Troubleshooting

### Hook not executing

1. Check hook is executable: `ls -la .sprint-hooks/`
2. Make executable: `chmod +x .sprint-hooks/*`
3. Check hook exists in project root (not worktree): `.sprint-hooks/` should be in main repo

### Hook blocking status update unexpectedly

Check logs to see which validation failed:
```bash
# Logs show which check failed in PRE phase
# Fix the issue and try again
```

### Hook not blocking when it should

Ensure you're using `exit 1` in PRE phase or BLOCKING hooks:
```bash
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  if <condition>; then
    echo "❌ ERROR: Reason..."
    exit 1  # This blocks the operation
  fi
fi
```

---

## Learn More

- [Sprint Protocol Documentation](../../../AGENTS.md) - Section 2.2.2
- [Hook Manager Implementation](../../../src/common/hook-manager.ts)
- [Python/Django Examples](../python-django/) - Alternative stack examples
