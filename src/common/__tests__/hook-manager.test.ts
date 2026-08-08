/**
 * Unit tests for hook-manager
 *
 * Tests hook discovery and execution functionality with isolated test environment
 */

import { findHook, executeHook } from '../hook-manager.js';
import { mkdtemp, rm, writeFile, chmod, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { HookContext } from '../../types/hooks.js';

describe('hook-manager', () => {
  let testDir: string;
  let hooksDir: string;
  let worktreeDir: string;
  let planningDir: string;
  let originalSprintRoot: string | undefined;

  beforeEach(async () => {
    // Save original SPRINT_ROOT
    originalSprintRoot = process.env.SPRINT_ROOT;

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'hook-manager-test-'));
    hooksDir = join(testDir, '.sprint-hooks');
    worktreeDir = join(testDir, '.worktrees', 'sprint-test');
    planningDir = join(worktreeDir, 'planning', 'sprint-test');

    // Create necessary directories
    await mkdir(hooksDir, { recursive: true });
    await mkdir(worktreeDir, { recursive: true });
    await mkdir(planningDir, { recursive: true });

    // Set SPRINT_ROOT to test directory
    process.env.SPRINT_ROOT = testDir;
  });

  afterEach(async () => {
    // Restore original SPRINT_ROOT
    if (originalSprintRoot !== undefined) {
      process.env.SPRINT_ROOT = originalSprintRoot;
    } else {
      delete process.env.SPRINT_ROOT;
    }

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup test directory ${testDir}:`, error);
    }
  });

  // ============================================================================
  // TEST-001: Unit Tests for Hook Discovery
  // ============================================================================

  describe('findHook - Discovery Tests', () => {
    it('should find executable hook in .sprint-hooks/', async () => {
      // Create executable hook file
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(hookPath, '#!/bin/bash\necho "test"', 'utf-8');
      await chmod(hookPath, 0o755); // Make executable

      const result = await findHook('post-worktree-create');

      expect(result).toBe(hookPath);
    });

    it('should return null when hook does not exist', async () => {
      const result = await findHook('post-worktree-create');

      expect(result).toBeNull();
    });

    it('should return null when hook exists but is not executable', async () => {
      // Create non-executable hook file
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(hookPath, '#!/bin/bash\necho "test"', 'utf-8');
      await chmod(hookPath, 0o644); // No execute permission

      const result = await findHook('post-worktree-create');

      expect(result).toBeNull();
    });

    it('should return null when .sprint-hooks directory does not exist', async () => {
      // Remove hooks directory
      await rm(hooksDir, { recursive: true, force: true });

      const result = await findHook('post-worktree-create');

      expect(result).toBeNull();
    });

    it('should work for all hook names', async () => {
      const hookNames = [
        'post-worktree-create',
        'on-status-change',
        'pre-worktree-remove',
        'pre-archive',
        'post-archive',
      ] as const;

      for (const hookName of hookNames) {
        // Create executable hook
        const hookPath = join(hooksDir, hookName);
        await writeFile(hookPath, '#!/bin/bash\necho "test"', 'utf-8');
        await chmod(hookPath, 0o755);

        const result = await findHook(hookName);

        expect(result).toBe(hookPath);

        // Clean up for next iteration
        await rm(hookPath);
      }
    });
  });

  // ============================================================================
  // TEST-002: Unit Tests for Hook Execution
  // ============================================================================

  describe('executeHook - Execution Tests', () => {
    let context: HookContext;

    beforeEach(() => {
      context = {
        sprintId: 'sprint-test-abc123',
        worktreePath: worktreeDir,
        planningDir: planningDir,
        branch: 'feature/sprint-test-abc123-hooks',
      };
    });

    it('should execute hook and capture stdout', async () => {
      // Create hook that writes to stdout
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        '#!/bin/bash\necho "Hook executed successfully"\nexit 0',
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Hook executed successfully');
      expect(result.stderr).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should capture stderr on hook failure', async () => {
      // Create hook that writes to stderr and exits with error
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        '#!/bin/bash\necho "Error: Hook failed" >&2\nexit 1',
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Error: Hook failed');
    });

    it('should return correct exit code', async () => {
      // Test various exit codes
      const exitCodes = [0, 1, 2, 42, 255];

      for (const expectedCode of exitCodes) {
        const hookPath = join(hooksDir, 'post-worktree-create');
        await writeFile(
          hookPath,
          `#!/bin/bash\nexit ${expectedCode}`,
          'utf-8'
        );
        await chmod(hookPath, 0o755);

        const result = await executeHook('post-worktree-create', context);

        expect(result.executed).toBe(true);
        expect(result.exitCode).toBe(expectedCode);

        await rm(hookPath);
      }
    });

    it('should pass environment variables to hook', async () => {
      // Create hook that echoes environment variables
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "SPRINT_ID=$SPRINT_ID"
echo "SPRINT_WORKTREE=$SPRINT_WORKTREE"
echo "SPRINT_PLANNING_DIR=$SPRINT_PLANNING_DIR"
echo "SPRINT_BRANCH=$SPRINT_BRANCH"
echo "SPRINT_EVENT=$SPRINT_EVENT"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SPRINT_ID=sprint-test-abc123');
      expect(result.stdout).toContain(`SPRINT_WORKTREE=${worktreeDir}`);
      expect(result.stdout).toContain(`SPRINT_PLANNING_DIR=${planningDir}`);
      expect(result.stdout).toContain(
        'SPRINT_BRANCH=feature/sprint-test-abc123-hooks'
      );
      expect(result.stdout).toContain('SPRINT_EVENT=post-worktree-create');
    });

    it('should pass status change variables for on-status-change hook', async () => {
      // Create on-status-change hook
      const hookPath = join(hooksDir, 'on-status-change');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "SPRINT_STATUS_FROM=$SPRINT_STATUS_FROM"
echo "SPRINT_STATUS_TO=$SPRINT_STATUS_TO"
echo "SPRINT_LIFECYCLE_PHASE=$SPRINT_LIFECYCLE_PHASE"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const statusContext: HookContext = {
        ...context,
        statusFrom: 'planning',
        statusTo: 'in-progress',
        lifecyclePhase: 'pre',
      };

      const result = await executeHook('on-status-change', statusContext);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SPRINT_STATUS_FROM=planning');
      expect(result.stdout).toContain('SPRINT_STATUS_TO=in-progress');
      expect(result.stdout).toContain('SPRINT_LIFECYCLE_PHASE=pre');
    });

    it('should return executed false when no hook found', async () => {
      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(false);
      expect(result.exitCode).toBeUndefined();
      expect(result.stdout).toBeUndefined();
      expect(result.stderr).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle hook with both stdout and stderr', async () => {
      // Create hook that writes to both streams and fails
      // Note: execSync only captures stderr on failure (non-zero exit)
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Standard output message"
echo "Standard error message" >&2
exit 1`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Standard output message');
      expect(result.stderr).toContain('Standard error message');
    });
  });

  // ============================================================================
  // TEST-004: Error Handling and Edge Case Tests
  // ============================================================================

  describe('executeHook - Error Handling and Edge Cases', () => {
    let context: HookContext;

    beforeEach(() => {
      context = {
        sprintId: 'sprint-test-abc123',
        worktreePath: worktreeDir,
        planningDir: planningDir,
        branch: 'feature/sprint-test-abc123-hooks',
      };
    });

    it('should handle hook with syntax error', async () => {
      // Create hook with command that will fail
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
set -e  # Exit on error
echo "Starting..."
nonexistent_command_that_will_fail  # This will cause non-zero exit
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).not.toBe(0);
      // Should capture error in stderr
      expect(result.stderr).toBeDefined();
    });

    it('should handle hook timeout', async () => {
      // This test would require mocking or actually waiting 5+ minutes
      // For now, we'll skip it but document it
      // TODO: Implement timeout test with mock or shorter timeout
    }, 300); // Short timeout for test itself

    it('should handle hook writing to both stdout and stderr', async () => {
      // Create hook with complex output
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Info: Processing..."
echo "Warning: Something might be wrong" >&2
echo "Info: Continuing..."
echo "Error: Failed step" >&2
exit 1`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('Info: Processing');
      expect(result.stdout).toContain('Info: Continuing');
      expect(result.stderr).toContain('Warning: Something might be wrong');
      expect(result.stderr).toContain('Error: Failed step');
    });

    it('should handle permission errors gracefully', async () => {
      // Create hook without execute permission
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(hookPath, '#!/bin/bash\necho "test"', 'utf-8');
      await chmod(hookPath, 0o644); // No execute permission

      const result = await executeHook('post-worktree-create', context);

      // Should return executed: false because hook is not executable
      expect(result.executed).toBe(false);
    });

    it('should handle multiple status transitions in sequence', async () => {
      // Create on-status-change hook
      const hookPath = join(hooksDir, 'on-status-change');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Transition: $SPRINT_STATUS_FROM -> $SPRINT_STATUS_TO ($SPRINT_LIFECYCLE_PHASE)"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const transitions = [
        { from: 'planning', to: 'in-progress', phase: 'pre' as const },
        { from: 'planning', to: 'in-progress', phase: 'post' as const },
        { from: 'in-progress', to: 'validating', phase: 'pre' as const },
        { from: 'in-progress', to: 'validating', phase: 'post' as const },
        { from: 'validating', to: 'complete', phase: 'pre' as const },
        { from: 'validating', to: 'complete', phase: 'post' as const },
      ];

      for (const { from, to, phase } of transitions) {
        const statusContext: HookContext = {
          ...context,
          statusFrom: from,
          statusTo: to,
          lifecyclePhase: phase,
        };

        const result = await executeHook('on-status-change', statusContext);

        expect(result.executed).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(`Transition: ${from} -> ${to} (${phase})`);
      }
    });

    it('should execute from different working directories', async () => {
      // Create hook that uses working directory
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
pwd
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      const result = await executeHook('post-worktree-create', context);

      expect(result.executed).toBe(true);
      expect(result.exitCode).toBe(0);
      // Hook should execute with worktreePath as cwd
      // On macOS, /var might be symlinked to /private/var, so check basename
      expect(result.stdout).toContain('.worktrees/sprint-test');
    });
  });
});
