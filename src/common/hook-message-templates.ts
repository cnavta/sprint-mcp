/**
 * Hook Failure Message Templates
 *
 * Provides standardized, actionable messaging for hook execution failures
 * across all sprint-mcp tools with lifecycle hook integration.
 *
 * Addresses architecture recommendation §1.3: "Improve hook failure actionability"
 * and "Standardize hook failure messaging".
 */

/**
 * Hook execution phase (PRE = blocking, POST = non-blocking)
 */
export type HookPhase = 'PRE' | 'POST';

/**
 * Hook execution context
 */
export interface HookContext {
  /** Hook name (e.g., "pre-worktree-create", "on-status-change") */
  name: string;
  /** Hook phase (PRE = blocking, POST = non-blocking) */
  phase: HookPhase;
  /** Hook exit code */
  exitCode: number;
  /** Hook stderr output */
  stderr: string;
  /** Hook stdout output (may be empty for failures) */
  stdout?: string;
  /** Optional context about what operation was attempted */
  operationContext?: string;
}

/**
 * Recovery action suggestion
 */
export interface RecoveryAction {
  /** Action description */
  description: string;
  /** Optional bash command to run */
  command?: string;
  /** Whether this action is required vs optional */
  required: boolean;
}

/**
 * Format a blocking (PRE-phase) hook failure message
 *
 * Blocking hooks prevent the operation from completing and require resolution.
 * Per Sprint Protocol §2.2.2, PRE-phase hooks are BLOCKING.
 *
 * @param context - Hook execution context
 * @param impact - Description of what was blocked
 * @param recoveryActions - Suggested recovery actions
 * @returns Formatted error message for blocking hook failure
 *
 * @example
 * formatBlockingHookFailure({
 *   name: 'pre-worktree-remove',
 *   phase: 'PRE',
 *   exitCode: 1,
 *   stderr: 'Uncommitted changes detected in worktree',
 *   operationContext: 'planning → in-progress'
 * }, 'Worktree cleanup aborted', [
 *   { description: 'Commit or stash uncommitted changes', required: true },
 *   { description: 'Use force flag to override (loses changes)', required: false }
 * ])
 */
export function formatBlockingHookFailure(
  context: HookContext,
  impact: string,
  recoveryActions: RecoveryAction[]
): string {
  const sections: string[] = [];

  // Header
  sections.push(`❌ BLOCKING HOOK FAILED: ${context.name}`);
  sections.push('');

  // Impact
  sections.push(`**Impact**: ${impact}`);
  sections.push('');

  // Operation context (if provided)
  if (context.operationContext) {
    sections.push(`**Operation Blocked**: ${context.operationContext}`);
    sections.push('');
  }

  // Hook error
  sections.push('**Hook Error**:');
  sections.push('```');
  sections.push(context.stderr.trim());
  sections.push('```');
  sections.push('');

  // Why this blocked
  sections.push('**Why This Blocked**:');
  sections.push(
    `PRE-phase hooks are BLOCKING per Sprint Protocol §2.2.2. The hook detected issues that must be resolved before proceeding.`
  );
  sections.push('');

  // Recovery path
  if (recoveryActions.length > 0) {
    sections.push('**Resolution Path**:');
    const requiredActions = recoveryActions.filter((a) => a.required);
    const optionalActions = recoveryActions.filter((a) => !a.required);

    if (requiredActions.length > 0) {
      requiredActions.forEach((action, index) => {
        sections.push(`${index + 1}. **${action.description}**`);
        if (action.command) {
          sections.push('   ```bash');
          sections.push(`   ${action.command}`);
          sections.push('   ```');
        }
      });
    }

    if (optionalActions.length > 0) {
      sections.push('');
      sections.push('**Alternative Options**:');
      optionalActions.forEach((action) => {
        sections.push(`- ${action.description}`);
        if (action.command) {
          sections.push('  ```bash');
          sections.push(`  ${action.command}`);
          sections.push('  ```');
        }
      });
    }
    sections.push('');
  }

  // Debugging guidance
  sections.push('**Debugging Hook**:');
  sections.push('- Hook location: `.sprint-hooks/`');
  sections.push('- Hook examples: `examples/sprint-hooks/`');
  sections.push(
    '- Check hook configuration in `.sprint-hooks/config.yaml` (if exists)'
  );

  return sections.join('\n');
}

/**
 * Format a non-blocking (POST-phase) hook failure message
 *
 * Non-blocking hooks warn but don't prevent operation completion.
 * Per Sprint Protocol §2.2.2, POST-phase hooks are NON-BLOCKING.
 *
 * @param context - Hook execution context
 * @param impact - Description of potential consequences
 * @param recoveryActions - Suggested recovery actions
 * @returns Formatted warning message for non-blocking hook failure
 *
 * @example
 * formatNonBlockingHookFailure({
 *   name: 'post-worktree-create',
 *   phase: 'POST',
 *   exitCode: 1,
 *   stderr: 'npm ci failed: ENOENT package.json'
 * }, 'Dependencies may not be installed, build may not have run', [
 *   {
 *     description: 'Manually run setup in worktree',
 *     command: 'cd .worktrees/sprint-18-y4v2xi && npm ci && npm run build',
 *     required: true
 *   }
 * ])
 */
export function formatNonBlockingHookFailure(
  context: HookContext,
  impact: string,
  recoveryActions: RecoveryAction[]
): string {
  const sections: string[] = [];

  // Header
  sections.push(`⚠️  ${context.name} hook failed (non-blocking)`);
  sections.push('');

  // Error
  sections.push('**Error**:');
  sections.push('```');
  sections.push(context.stderr.trim());
  sections.push('```');
  sections.push('');

  // Impact
  sections.push(`**Impact**: ${impact}`);
  sections.push('');

  // Recovery actions
  if (recoveryActions.length > 0) {
    sections.push('**Recovery Action**:');
    recoveryActions.forEach((action) => {
      sections.push(action.description);
      if (action.command) {
        sections.push('```bash');
        sections.push(action.command);
        sections.push('```');
      }
    });
    sections.push('');
  }

  // Note
  sections.push('**Note**:');
  sections.push(
    `Hook failure does not prevent operation completion. POST-phase hooks are NON-BLOCKING per Sprint Protocol §2.2.2.`
  );
  sections.push('Fix hook for future operations or continue as-is.');

  return sections.join('\n');
}

/**
 * Generate hook debugging guidance section
 *
 * Provides standard troubleshooting steps for hook issues.
 *
 * @param hookName - Name of the hook to debug
 * @returns Formatted debugging guidance
 *
 * @example
 * formatHookDebuggingGuidance('pre-worktree-create')
 */
export function formatHookDebuggingGuidance(hookName: string): string {
  const sections: string[] = [];

  sections.push('**Hook Debugging Guidance**:');
  sections.push('');
  sections.push('To debug or modify this hook:');
  sections.push('');
  sections.push('1. **Check hook file**:');
  sections.push('   ```bash');
  sections.push(`   cat .sprint-hooks/${hookName}`);
  sections.push('   ```');
  sections.push('');
  sections.push('2. **Check hook permissions**:');
  sections.push('   ```bash');
  sections.push(`   ls -la .sprint-hooks/${hookName}`);
  sections.push('   ```');
  sections.push('');
  sections.push('3. **Test hook manually**:');
  sections.push('   ```bash');
  sections.push(
    `   .sprint-hooks/${hookName} [hook-specific-args]  # Check hook source for args`
  );
  sections.push('   ```');
  sections.push('');
  sections.push('4. **View hook examples**:');
  sections.push('   ```bash');
  sections.push('   ls examples/sprint-hooks/');
  sections.push('   ```');
  sections.push('');
  sections.push('5. **Check hook configuration**:');
  sections.push('   ```bash');
  sections.push('   cat .sprint-hooks/config.yaml  # If exists');
  sections.push('   ```');
  sections.push('');
  sections.push('**Available Hooks**:');
  sections.push('- `pre-worktree-create` - Runs before worktree creation (BLOCKING)');
  sections.push('- `post-worktree-create` - Runs after worktree creation (NON-BLOCKING)');
  sections.push('- `on-status-change` (PRE) - Runs before status update (BLOCKING)');
  sections.push('- `on-status-change` (POST) - Runs after status update (NON-BLOCKING)');
  sections.push('- `pre-worktree-remove` - Runs before cleanup (BLOCKING)');
  sections.push('- `pre-archive` - Runs before archival (BLOCKING)');
  sections.push('');
  sections.push('**Hook Protocol**: Sprint Protocol §2.2.2');

  return sections.join('\n');
}

/**
 * Format hook success message (optional, for verbose modes)
 *
 * @param context - Hook execution context
 * @returns Formatted success message
 *
 * @example
 * formatHookSuccess({
 *   name: 'post-worktree-create',
 *   phase: 'POST',
 *   exitCode: 0,
 *   stderr: '',
 *   stdout: 'Dependencies installed, build completed'
 * })
 */
export function formatHookSuccess(context: HookContext): string {
  const phase = context.phase === 'PRE' ? 'BLOCKING' : 'NON-BLOCKING';
  let message = `✅ ${context.name} hook completed successfully (${phase})`;

  if (context.stdout && context.stdout.trim()) {
    message += `\n\n**Output**:\n\`\`\`\n${context.stdout.trim()}\n\`\`\``;
  }

  return message;
}

/**
 * Create recovery action
 *
 * Helper function to create RecoveryAction objects with consistent structure.
 *
 * @param description - Action description
 * @param command - Optional bash command
 * @param required - Whether action is required (default: true)
 * @returns RecoveryAction object
 *
 * @example
 * createRecoveryAction('Commit your changes', 'git add . && git commit -m "WIP"')
 */
export function createRecoveryAction(
  description: string,
  command?: string,
  required = true
): RecoveryAction {
  return { description, command, required };
}

/**
 * Common recovery actions for reuse across tools
 */
export const COMMON_RECOVERY_ACTIONS = {
  commitChanges: createRecoveryAction(
    'Commit or stash uncommitted changes',
    'git add . && git commit -m "WIP: Save changes before cleanup"'
  ),
  forceOperation: (operation: string) =>
    createRecoveryAction(
      `Use force flag to override ${operation} (may lose data)`,
      undefined,
      false
    ),
  checkHookConfig: createRecoveryAction(
    'Check hook configuration',
    'cat .sprint-hooks/config.yaml',
    false
  ),
  disableHook: (hookName: string) =>
    createRecoveryAction(
      'Temporarily disable hook',
      `chmod -x .sprint-hooks/${hookName}`,
      false
    ),
  manualSetup: (worktreePath: string) =>
    createRecoveryAction(
      'Manually run setup in worktree',
      `cd ${worktreePath} && npm ci && npm run build`
    ),
};
