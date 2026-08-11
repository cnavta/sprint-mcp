/**
 * Tests for Hook Message Templates
 */

import {
  formatBlockingHookFailure,
  formatNonBlockingHookFailure,
  formatHookDebuggingGuidance,
  formatHookSuccess,
  createRecoveryAction,
  COMMON_RECOVERY_ACTIONS,
  type HookContext,
  type RecoveryAction,
} from '../hook-message-templates.js';

describe('hook-message-templates', () => {
  describe('formatBlockingHookFailure', () => {
    it('formats blocking hook failure with required recovery actions', () => {
      const context: HookContext = {
        name: 'pre-worktree-remove',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Uncommitted changes detected in worktree',
      };

      const recoveryActions: RecoveryAction[] = [
        {
          description: 'Commit or stash uncommitted changes',
          command: 'git add . && git commit -m "WIP"',
          required: true,
        },
      ];

      const result = formatBlockingHookFailure(
        context,
        'Worktree cleanup aborted',
        recoveryActions
      );

      expect(result).toContain('❌ BLOCKING HOOK FAILED: pre-worktree-remove');
      expect(result).toContain('**Impact**: Worktree cleanup aborted');
      expect(result).toContain('**Hook Error**:');
      expect(result).toContain('Uncommitted changes detected in worktree');
      expect(result).toContain('**Why This Blocked**:');
      expect(result).toContain('PRE-phase hooks are BLOCKING per Sprint Protocol §2.2.2');
      expect(result).toContain('**Resolution Path**:');
      expect(result).toContain('1. **Commit or stash uncommitted changes**');
      expect(result).toContain('git add . && git commit -m "WIP"');
      expect(result).toContain('**Debugging Hook**:');
      expect(result).toContain('.sprint-hooks/');
    });

    it('formats blocking hook failure with operation context', () => {
      const context: HookContext = {
        name: 'on-status-change',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Backlog validation failed',
        operationContext: 'planning → in-progress',
      };

      const result = formatBlockingHookFailure(
        context,
        'Status transition blocked',
        []
      );

      expect(result).toContain('**Operation Blocked**: planning → in-progress');
    });

    it('formats blocking hook failure with optional recovery actions', () => {
      const context: HookContext = {
        name: 'pre-archive',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Sprint not complete',
      };

      const recoveryActions: RecoveryAction[] = [
        {
          description: 'Complete sprint first',
          required: true,
        },
        {
          description: 'Force archive (not recommended)',
          command: 'archive-sprint --force',
          required: false,
        },
      ];

      const result = formatBlockingHookFailure(
        context,
        'Archival blocked',
        recoveryActions
      );

      expect(result).toContain('**Resolution Path**:');
      expect(result).toContain('1. **Complete sprint first**');
      expect(result).toContain('**Alternative Options**:');
      expect(result).toContain('- Force archive (not recommended)');
      expect(result).toContain('archive-sprint --force');
    });

    it('includes debugging guidance in all blocking failures', () => {
      const context: HookContext = {
        name: 'pre-worktree-create',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Permission denied',
      };

      const result = formatBlockingHookFailure(context, 'Creation failed', []);

      expect(result).toContain('**Debugging Hook**:');
      expect(result).toContain('Hook location: `.sprint-hooks/`');
      expect(result).toContain('Hook examples: `examples/sprint-hooks/`');
      expect(result).toContain('Check hook configuration');
    });
  });

  describe('formatNonBlockingHookFailure', () => {
    it('formats non-blocking hook failure with recovery action', () => {
      const context: HookContext = {
        name: 'post-worktree-create',
        phase: 'POST',
        exitCode: 1,
        stderr: 'npm ci failed: ENOENT package.json',
      };

      const recoveryActions: RecoveryAction[] = [
        {
          description: 'Manually run setup in worktree',
          command: 'cd .worktrees/sprint-18-y4v2xi && npm ci && npm run build',
          required: true,
        },
      ];

      const result = formatNonBlockingHookFailure(
        context,
        'Dependencies may not be installed, build may not have run',
        recoveryActions
      );

      expect(result).toContain('⚠️  post-worktree-create hook failed (non-blocking)');
      expect(result).toContain('**Error**:');
      expect(result).toContain('npm ci failed: ENOENT package.json');
      expect(result).toContain(
        '**Impact**: Dependencies may not be installed, build may not have run'
      );
      expect(result).toContain('**Recovery Action**:');
      expect(result).toContain('Manually run setup in worktree');
      expect(result).toContain('cd .worktrees/sprint-18-y4v2xi && npm ci && npm run build');
      expect(result).toContain('**Note**:');
      expect(result).toContain('Hook failure does not prevent operation completion');
      expect(result).toContain('POST-phase hooks are NON-BLOCKING per Sprint Protocol §2.2.2');
    });

    it('formats non-blocking hook failure without recovery actions', () => {
      const context: HookContext = {
        name: 'on-status-change',
        phase: 'POST',
        exitCode: 1,
        stderr: 'Notification service unavailable',
      };

      const result = formatNonBlockingHookFailure(
        context,
        'Status change notifications not sent',
        []
      );

      expect(result).toContain('⚠️  on-status-change hook failed (non-blocking)');
      expect(result).toContain('**Impact**: Status change notifications not sent');
      expect(result).not.toContain('**Recovery Action**:');
      expect(result).toContain('**Note**:');
    });

    it('handles multiple recovery actions', () => {
      const context: HookContext = {
        name: 'post-archive',
        phase: 'POST',
        exitCode: 1,
        stderr: 'Knowledge extraction failed',
      };

      const recoveryActions: RecoveryAction[] = [
        {
          description: 'Manually extract knowledge',
          command: 'npm run knowledge:extract',
          required: true,
        },
        {
          description: 'Check logs for details',
          command: 'cat .sprint-hooks/logs/post-archive.log',
          required: false,
        },
      ];

      const result = formatNonBlockingHookFailure(
        context,
        'Knowledge base not updated',
        recoveryActions
      );

      expect(result).toContain('Manually extract knowledge');
      expect(result).toContain('npm run knowledge:extract');
      expect(result).toContain('Check logs for details');
    });
  });

  describe('formatHookDebuggingGuidance', () => {
    it('formats complete debugging guidance for hook', () => {
      const result = formatHookDebuggingGuidance('pre-worktree-create');

      expect(result).toContain('**Hook Debugging Guidance**:');
      expect(result).toContain('To debug or modify this hook:');
      expect(result).toContain('1. **Check hook file**:');
      expect(result).toContain('cat .sprint-hooks/pre-worktree-create');
      expect(result).toContain('2. **Check hook permissions**:');
      expect(result).toContain('ls -la .sprint-hooks/pre-worktree-create');
      expect(result).toContain('3. **Test hook manually**:');
      expect(result).toContain('.sprint-hooks/pre-worktree-create');
      expect(result).toContain('4. **View hook examples**:');
      expect(result).toContain('ls examples/sprint-hooks/');
      expect(result).toContain('5. **Check hook configuration**:');
      expect(result).toContain('cat .sprint-hooks/config.yaml');
      expect(result).toContain('**Available Hooks**:');
      expect(result).toContain('pre-worktree-create');
      expect(result).toContain('post-worktree-create');
      expect(result).toContain('on-status-change');
      expect(result).toContain('pre-worktree-remove');
      expect(result).toContain('pre-archive');
      expect(result).toContain('**Hook Protocol**: Sprint Protocol §2.2.2');
    });

    it('handles different hook names', () => {
      const result = formatHookDebuggingGuidance('on-status-change');

      expect(result).toContain('cat .sprint-hooks/on-status-change');
      expect(result).toContain('ls -la .sprint-hooks/on-status-change');
    });
  });

  describe('formatHookSuccess', () => {
    it('formats success message for blocking hook', () => {
      const context: HookContext = {
        name: 'pre-worktree-create',
        phase: 'PRE',
        exitCode: 0,
        stderr: '',
        stdout: '',
      };

      const result = formatHookSuccess(context);

      expect(result).toBe(
        '✅ pre-worktree-create hook completed successfully (BLOCKING)'
      );
    });

    it('formats success message for non-blocking hook', () => {
      const context: HookContext = {
        name: 'post-worktree-create',
        phase: 'POST',
        exitCode: 0,
        stderr: '',
        stdout: '',
      };

      const result = formatHookSuccess(context);

      expect(result).toBe(
        '✅ post-worktree-create hook completed successfully (NON-BLOCKING)'
      );
    });

    it('includes stdout when present', () => {
      const context: HookContext = {
        name: 'post-worktree-create',
        phase: 'POST',
        exitCode: 0,
        stderr: '',
        stdout: 'Dependencies installed\nBuild completed successfully',
      };

      const result = formatHookSuccess(context);

      expect(result).toContain('✅ post-worktree-create hook completed successfully');
      expect(result).toContain('**Output**:');
      expect(result).toContain('Dependencies installed');
      expect(result).toContain('Build completed successfully');
    });

    it('omits stdout when empty or whitespace-only', () => {
      const context: HookContext = {
        name: 'pre-archive',
        phase: 'PRE',
        exitCode: 0,
        stderr: '',
        stdout: '   \n  \n',
      };

      const result = formatHookSuccess(context);

      expect(result).not.toContain('**Output**:');
    });
  });

  describe('createRecoveryAction', () => {
    it('creates required recovery action with command', () => {
      const action = createRecoveryAction(
        'Commit changes',
        'git commit -am "WIP"',
        true
      );

      expect(action.description).toBe('Commit changes');
      expect(action.command).toBe('git commit -am "WIP"');
      expect(action.required).toBe(true);
    });

    it('creates optional recovery action without command', () => {
      const action = createRecoveryAction(
        'Check documentation',
        undefined,
        false
      );

      expect(action.description).toBe('Check documentation');
      expect(action.command).toBeUndefined();
      expect(action.required).toBe(false);
    });

    it('defaults to required when not specified', () => {
      const action = createRecoveryAction('Do something', 'some-command');

      expect(action.required).toBe(true);
    });
  });

  describe('COMMON_RECOVERY_ACTIONS', () => {
    it('provides commitChanges action', () => {
      const action = COMMON_RECOVERY_ACTIONS.commitChanges;

      expect(action.description).toContain('Commit or stash');
      expect(action.command).toContain('git add');
      expect(action.command).toContain('git commit');
      expect(action.required).toBe(true);
    });

    it('provides forceOperation action factory', () => {
      const action = COMMON_RECOVERY_ACTIONS.forceOperation('cleanup');

      expect(action.description).toContain('force flag');
      expect(action.required).toBe(false);
    });

    it('provides checkHookConfig action', () => {
      const action = COMMON_RECOVERY_ACTIONS.checkHookConfig;

      expect(action.description).toContain('Check hook configuration');
      expect(action.command).toContain('.sprint-hooks/config.yaml');
      expect(action.required).toBe(false);
    });

    it('provides disableHook action factory', () => {
      const action = COMMON_RECOVERY_ACTIONS.disableHook('pre-worktree-create');

      expect(action.description).toContain('Temporarily disable hook');
      expect(action.command).toContain('chmod -x');
      expect(action.command).toContain('pre-worktree-create');
      expect(action.required).toBe(false);
    });

    it('provides manualSetup action factory', () => {
      const action = COMMON_RECOVERY_ACTIONS.manualSetup(
        '.worktrees/sprint-18-y4v2xi'
      );

      expect(action.description).toContain('Manually run setup');
      expect(action.command).toContain('cd .worktrees/sprint-18-y4v2xi');
      expect(action.command).toContain('npm ci');
      expect(action.command).toContain('npm run build');
      expect(action.required).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('formats complete blocking failure with common actions', () => {
      const context: HookContext = {
        name: 'pre-worktree-remove',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Error: Worktree has uncommitted changes',
        operationContext: 'cleanup sprint-18-y4v2xi',
      };

      const result = formatBlockingHookFailure(
        context,
        'Worktree cleanup aborted',
        [
          COMMON_RECOVERY_ACTIONS.commitChanges,
          COMMON_RECOVERY_ACTIONS.forceOperation('cleanup'),
        ]
      );

      expect(result).toContain('❌ BLOCKING HOOK FAILED');
      expect(result).toContain('**Operation Blocked**: cleanup sprint-18-y4v2xi');
      expect(result).toContain('Commit or stash uncommitted changes');
      expect(result).toContain('**Alternative Options**:');
      expect(result).toContain('force flag');
    });

    it('formats complete non-blocking failure with common actions', () => {
      const context: HookContext = {
        name: 'post-worktree-create',
        phase: 'POST',
        exitCode: 127,
        stderr: 'npm: command not found',
      };

      const result = formatNonBlockingHookFailure(
        context,
        'Worktree dependencies not installed',
        [
          COMMON_RECOVERY_ACTIONS.manualSetup('.worktrees/sprint-18-y4v2xi'),
          COMMON_RECOVERY_ACTIONS.checkHookConfig,
        ]
      );

      expect(result).toContain('⚠️  post-worktree-create hook failed');
      expect(result).toContain('npm: command not found');
      expect(result).toContain('Manually run setup in worktree');
      expect(result).toContain('Check hook configuration');
      expect(result).toContain('POST-phase hooks are NON-BLOCKING');
    });
  });

  describe('edge cases', () => {
    it('handles empty stderr gracefully', () => {
      const context: HookContext = {
        name: 'pre-archive',
        phase: 'PRE',
        exitCode: 1,
        stderr: '',
      };

      const result = formatBlockingHookFailure(context, 'Unknown error', []);

      expect(result).toContain('**Hook Error**:');
      // Should have code block even if empty
      expect(result).toContain('```');
    });

    it('handles multiline stderr', () => {
      const context: HookContext = {
        name: 'on-status-change',
        phase: 'PRE',
        exitCode: 1,
        stderr: 'Line 1: Error\nLine 2: More details\nLine 3: Stack trace',
      };

      const result = formatBlockingHookFailure(context, 'Validation failed', []);

      expect(result).toContain('Line 1: Error');
      expect(result).toContain('Line 2: More details');
      expect(result).toContain('Line 3: Stack trace');
    });

    it('handles very long hook names', () => {
      const hookName = 'pre-very-long-custom-hook-name-with-many-segments';
      const result = formatHookDebuggingGuidance(hookName);

      expect(result).toContain(hookName);
      expect(result).toContain(`.sprint-hooks/${hookName}`);
    });
  });
});
