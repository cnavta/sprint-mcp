# Sprint 8 Key Learnings

**Sprint ID**: sprint-8-xksnd8
**Title**: Sprint Cleanup Tool - Git Worktree and Artifact Management
**Date**: 2026-08-01T14:00:00Z

---

## Overview

This document extracts durable, transferable insights from Sprint 8 that should inform future sprints and tool development.

---

## Learning 1: Dual Interface Design Requires Shared Core Utilities

### Observation

Building both npm script (humans) and MCP tool (agents) from shared core utilities (`sprint-cleanup-utils.ts`) eliminated code duplication and ensured consistent behavior across interfaces.

### Why This Matters

- **Zero duplication**: Business logic written once, used by both interfaces
- **Consistent behavior**: Same validation, same cleanup, same errors
- **Easier maintenance**: Fix bugs in one place
- **Faster development**: UI layers are thin wrappers

### Application to Future Sprints

✅ **DO**:
- Identify core business logic separate from UI concerns
- Write shared utilities first (e.g., `sprint-X-utils.ts`)
- Make UI layers (CLI, MCP, web) thin wrappers
- Export clean interfaces from core utilities

❌ **DON'T**:
- Implement same logic twice in npm script and MCP tool
- Mix business logic with UI formatting
- Build npm script first, then "port" to MCP tool

### Transferability

**High**. This applies to:
- All dual-interface features (npm + MCP)
- Multi-platform tools (CLI + web + API)
- Any feature with multiple UIs

---

## Learning 2: Safety Checks Should Be Layered and Explicit

### Observation

Multiple safety checks prevented accidental data loss:
1. Only cleanup completed sprints (status check)
2. Never delete planning directories (path check)
3. Warn about uncommitted changes (git status check)
4. Require explicit confirmation (interactive prompt or --yes flag)

### Why This Matters

- **Defense in depth**: Multiple safety barriers, not single point of failure
- **Clear warnings**: Users know exactly what will happen
- **Explicit confirmation**: No accidental destructive operations
- **Confidence**: Safe to run on production data

### Application to Future Sprints

✅ **DO**:
- Layer multiple safety checks for destructive operations
- Validate prerequisites before performing actions
- Show exactly what will be deleted/modified
- Require explicit confirmation (prompt or --yes flag)
- Preserve valuable data (planning directories, artifacts)

❌ **DON'T**:
- Rely on single safety check
- Assume user knows what will happen
- Make destructive operations easy to trigger accidentally
- Delete data without showing what will be lost

### Safety Check Template

```typescript
async function performDestructiveOperation() {
  // Layer 1: Validate prerequisites
  const validation = await validatePrerequisites();
  if (!validation.valid) {
    return { errors: validation.errors };
  }

  // Layer 2: Identify what will be affected
  const affectedItems = await identifyAffectedItems();

  // Layer 3: Show warnings
  console.log('⚠️  WARNING: This will delete:', affectedItems);
  console.log('✓ This will preserve:', preservedItems);

  // Layer 4: Require confirmation
  if (!confirmed) {
    return { cancelled: true };
  }

  // Layer 5: Perform operation
  return await execute();
}
```

### Transferability

**High**. This applies to:
- Any destructive operation (delete, cleanup, reset)
- Data migrations
- Deployment tools
- Administrative commands

---

## Learning 3: Immediate Dogfooding Validates Design Decisions

### Observation

Sprints 6 and 7 had orphaned worktrees that needed cleanup, providing perfect real-world test cases immediately after tool completion.

### Why This Matters

- **Real data**: Validates tool works on actual production data, not synthetic examples
- **Edge cases**: Reveals issues unit tests might miss
- **User perspective**: Experience tool as users will
- **Immediate value**: Tool provides value within minutes of completion

### Application to Future Sprints

✅ **DO**:
- Use tools on real data immediately after development
- Test with actual production scenarios when possible
- Dogfood features on the sprint that creates them (when applicable)
- Look for opportunities to solve your own problems

❌ **DON'T**:
- Only test with synthetic/mock data
- Wait days before using tool on real data
- Assume tool works without trying it yourself
- Build features you don't need yourself

### Transferability

**Medium-High**. This applies to:
- Developer tools and CLI utilities
- Internal automation tools
- Sprint management features

Does **not** apply well to:
- Customer-facing features (different user persona)
- Features requiring specific production environment

---

## Learning 4: Disk Usage Calculation Needs Real-World Testing

### Observation

`du -sb` returned 0 bytes for Sprint 6 and 7 worktrees, making disk space savings calculation misleading. This should have been caught before finalizing.

### Why This Matters

- **User value proposition**: Can't show how much space they'll free
- **False advertising**: "~0 B" makes tool seem useless
- **Edge cases**: Worktrees with hardlinks or symlinks behave differently

### Application to Future Sprints

✅ **DO**:
- Test calculations on real data before finalizing
- Add fallback methods if primary approach fails
- Warn user when calculation fails (vs showing misleading 0)
- Validate assumptions about file system operations

❌ **DON'T**:
- Assume command-line tools work as expected without testing
- Return 0 silently when calculation fails
- Skip validation on production data
- Rely on single method without fallbacks

### Disk Usage Template

```typescript
function calculateDiskUsage(path: string): number {
  // Try method 1: du -sb
  let bytes = tryDu(path);
  if (bytes > 0) return bytes;

  // Try method 2: fs.statSync recursive
  bytes = tryFsRecursive(path);
  if (bytes > 0) return bytes;

  // Fallback: warn user
  logger.warn(`Could not calculate disk usage for ${path}`);
  return -1; // -1 indicates "unknown", not 0
}
```

### Transferability

**High**. This applies to:
- Any file system operations
- Calculations based on external commands
- System resource measurements

---

## Learning 5: Two-Step MCP Tool Flow is Confusing

### Observation

Splitting MCP tool into `cleanupSprintTool()` (preview) and `executeCleanupSprintTool()` (execute) creates confusion about which function to call.

### Why This Matters

- **User confusion**: Calling tool doesn't actually do anything
- **Extra step**: Requires two tool calls instead of one
- **Inconsistency**: Other MCP tools don't have this pattern

### Application to Future Sprints

✅ **DO**:
- Use single tool with `confirmed: boolean` parameter
- Show preview when confirmed=false
- Execute when confirmed=true
- Document confirmation flow clearly in tool description

❌ **DON'T**:
- Split into separate preview and execute functions
- Make tool name misleading (cleanup vs preview-cleanup)
- Create multi-step flows without clear documentation

### Better MCP Tool Pattern

```typescript
async function actionTool(args: {
  confirmed?: boolean;
  ...otherParams
}): Promise<Result> {
  // Find what would be affected
  const affected = await findAffected(args);

  if (!args.confirmed) {
    // Preview mode: show warnings
    return {
      content: [{
        type: 'text',
        text: buildWarningMessage(affected)
      }]
    };
  }

  // Execute mode: perform action
  return await executeAction(affected);
}
```

### Transferability

**High**. This applies to:
- All MCP tools requiring confirmation
- Destructive operations via API
- Workflow tools with preview capability

---

## Learning 6: ANSI Colors Significantly Improve CLI UX

### Observation

Adding ANSI color codes to npm script output made it dramatically easier to scan and understand output at a glance.

### Why This Matters

- **Visual hierarchy**: Important information stands out
- **Semantic meaning**: Red=error, Yellow=warning, Green=success (universal)
- **Accessibility**: Works in all terminals, no external dependencies
- **Cost**: Minimal code (ANSI escape sequences)

### Application to Future Sprints

✅ **DO**:
- Use colors for CLI output (green=success, yellow=warning, red=error, blue=info)
- Use ANSI escape codes directly (no external dependency)
- Provide --no-color flag for non-interactive environments
- Use color to highlight important information

❌ **DON'T**:
- Output plain text when colors would help
- Use colors inconsistently (red for success, green for error)
- Add external dependency just for colors
- Assume colors work (check if stdout is TTY)

### ANSI Color Template

```typescript
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Usage
console.log(`${colors.green}✓ Success${colors.reset}`);
console.log(`${colors.yellow}⚠️  Warning${colors.reset}`);
console.log(`${colors.red}✗ Error${colors.reset}`);
```

### Transferability

**High**. This applies to:
- All CLI tools
- npm scripts
- Build/deployment scripts
- Interactive prompts

---

## Learning 7: P0/P1 Prioritization Enables Fast Shipping

### Observation

Deferring 6 P1 items (unit tests, JSDoc, README) allowed sprint to complete in 2.5 hours with 100% P0 delivery.

### Why This Matters

- **Focus**: Clear distinction between must-have (P0) and nice-to-have (P1)
- **Velocity**: Ship working feature quickly
- **Pragmatism**: Can iterate later with P1 items
- **Transparency**: Deferred items tracked, not forgotten

### Application to Future Sprints

✅ **DO**:
- Classify backlog items as P0 (critical path) or P1 (quality/polish)
- Allow P1 deferrals with documented rationale
- Ship P0-complete sprints even with P1 items deferred
- Track deferred items for future work

❌ **DON'T**:
- Make everything P0
- Defer P0 items
- Complete sprints with partial P0 work
- Forget about deferred P1 items

### Prioritization Criteria

**P0** (Critical Path):
- Feature doesn't work without it
- User can't accomplish goal without it
- Safety/security requirement
- Protocol compliance requirement

**P1** (Quality/Polish):
- Feature works without it but less polished
- Tests for already-validated code
- Documentation when tool has --help
- Performance optimization

### Transferability

**High**. This applies to:
- All sprint planning
- Feature prioritization
- Release planning
- Technical debt management

---

## Learning 8: Execution Plan Investment Pays Off

### Observation

400-line execution plan created upfront made implementation straightforward and prevented mid-sprint surprises.

### Why This Matters

- **No surprises**: Open questions resolved before coding
- **Clear roadmap**: Know what to build and in what order
- **Faster coding**: Less decision-making during implementation
- **Better estimates**: Timeline was accurate (2.5hrs vs 3-4hr estimate)

### Application to Future Sprints

✅ **DO**:
- Create detailed execution plan before P0 implementation
- Identify and resolve open questions upfront
- Include workflow diagrams for complex features
- Get human approval on plan before coding

❌ **DON'T**:
- Start coding without clear plan
- Leave open questions to figure out during implementation
- Assume requirements are clear without documenting them
- Skip planning for "simple" features

### Transferability

**High**. This applies to all non-trivial feature development.

---

## Summary

Sprint 8 reinforced that **shared core utilities**, **layered safety checks**, and **immediate dogfooding** lead to successful tool development. The sprint also highlighted gaps in **disk usage calculation** and **MCP tool confirmation flow** that need addressing in future iterations.

**Most Transferable Learnings**:
1. Dual interface design requires shared core utilities
2. Safety checks should be layered and explicit
3. Immediate dogfooding validates design decisions
4. ANSI colors significantly improve CLI UX
5. P0/P1 prioritization enables fast shipping
6. Execution plan investment pays off

**Apply These Immediately** in the next sprint.
