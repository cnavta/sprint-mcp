/**
 * Integration tests for Sprint Lifecycle Hooks
 *
 * Tests end-to-end integration of hooks with actual sprint operations
 * (start-sprint, update-sprint-status, cleanup-sprint, archive-sprint)
 */

import { mkdtemp, rm, writeFile, chmod, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { startSprintTool } from '../../tools/start-sprint.js';
import { updateSprintStatusTool } from '../../tools/update-sprint-status.js';
import { cleanupSprintTool } from '../../tools/cleanup-sprint.js';
import { archiveSprintTool } from '../../tools/archive-sprint.js';

describe('Sprint Lifecycle Hooks - Integration Tests', () => {
  let testDir: string;
  let hooksDir: string;
  let originalCwd: string;
  let originalSprintRoot: string | undefined;

  beforeEach(async () => {
    // Save original state
    originalCwd = process.cwd();
    originalSprintRoot = process.env.SPRINT_ROOT;

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'hooks-lifecycle-test-'));
    hooksDir = join(testDir, '.sprint-hooks');
    await mkdir(hooksDir, { recursive: true });

    // Initialize git repo
    process.chdir(testDir);
    execSync('git init');
    execSync('git config user.email "test@example.com"');
    execSync('git config user.name "Test User"');

    // Create initial commit on main
    await writeFile(join(testDir, 'README.md'), '# Test Project', 'utf-8');
    execSync('git add README.md');
    execSync('git commit -m "Initial commit"');
    execSync('git branch -M main');

    // Create planning directory structure
    await mkdir(join(testDir, 'planning'), { recursive: true });

    // Set SPRINT_ROOT
    process.env.SPRINT_ROOT = testDir;
  });

  afterEach(async () => {
    // Restore original state
    process.chdir(originalCwd);
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

  // ==========================================================================
  // TEST: post-worktree-create Hook
  // ==========================================================================

  describe('start-sprint with post-worktree-create hook', () => {
    it('should execute post-worktree-create hook after worktree creation', async () => {
      // Create post-worktree-create hook
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Hook executed for sprint: $SPRINT_ID"
echo "Worktree path: $SPRINT_WORKTREE"
touch "$SPRINT_WORKTREE/.hook-executed"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Start sprint
      const result = await startSprintTool({
        title: 'Test Sprint with Hooks',
        goal: 'Test post-worktree-create hook execution',
        owner: 'Test User',
      });

      // Verify hook executed
      expect(result.content[0].text).toContain('Worktree setup automated');
      expect(result.content[0].text).toContain('Hook executed for sprint');

      // Verify hook created marker file
      const sprintId = result.content[0].text.match(/sprint-\d+-\w+/)?.[0];
      expect(sprintId).toBeDefined();

      const markerFile = join(testDir, '.worktrees', sprintId!, '.hook-executed');
      const { stat } = await import('fs/promises');
      await expect(stat(markerFile)).resolves.toBeDefined();
    });

    it('should continue sprint creation if post-worktree-create hook fails', async () => {
      // Create failing hook
      const hookPath = join(hooksDir, 'post-worktree-create');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Hook starting..."
echo "ERROR: Hook failed intentionally" >&2
exit 1`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Start sprint - should still succeed
      const result = await startSprintTool({
        title: 'Test Sprint with Failing Hook',
        goal: 'Test non-blocking hook behavior',
        owner: 'Test User',
      });

      // Verify sprint created despite hook failure
      expect(result.content[0].text).toContain('Sprint started successfully');
      expect(result.content[0].text).toContain('Post-worktree-create hook failed (non-blocking)');

      // Sprint should still be created
      const sprintId = result.content[0].text.match(/sprint-\d+-\w+/)?.[0];
      expect(sprintId).toBeDefined();
    });
  });

  // ==========================================================================
  // TEST: on-status-change Hook
  // ==========================================================================

  describe('update-sprint-status with on-status-change hook', () => {
    let sprintId: string;

    beforeEach(async () => {
      // Create a sprint first
      const result = await startSprintTool({
        title: 'Test Sprint for Status Changes',
        goal: 'Test on-status-change hook',
        owner: 'Test User',
      });

      sprintId = result.content[0].text.match(/sprint-\d+-\w+/)?.[0]!;
      expect(sprintId).toBeDefined();
    });

    it('should execute on-status-change hook in pre and post phases', async () => {
      // Create on-status-change hook that logs phase
      const hookPath = join(hooksDir, 'on-status-change');
      const logFile = join(testDir, 'hook-log.txt');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "$SPRINT_LIFECYCLE_PHASE: $SPRINT_STATUS_FROM -> $SPRINT_STATUS_TO" >> "${logFile}"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Update status
      await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      // Read log file
      const { readFile } = await import('fs/promises');
      const log = await readFile(logFile, 'utf-8');

      // Should have both pre and post entries
      expect(log).toContain('pre: planning -> in-progress');
      expect(log).toContain('post: planning -> in-progress');
    });

    it('should block status update on pre-phase hook failure', async () => {
      // Create hook that fails in pre-phase
      const hookPath = join(hooksDir, 'on-status-change');
      await writeFile(
        hookPath,
        `#!/bin/bash
if [ "$SPRINT_LIFECYCLE_PHASE" = "pre" ]; then
  echo "ERROR: Pre-phase validation failed" >&2
  exit 1
fi
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Attempt status update - should fail
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      // Verify update was blocked
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Pre-phase hook failed');
      expect(result.content[0].text).toContain('Pre-phase validation failed');
    });

    it('should continue on post-phase hook failure', async () => {
      // Create hook that fails in post-phase
      const hookPath = join(hooksDir, 'on-status-change');
      await writeFile(
        hookPath,
        `#!/bin/bash
if [ "$SPRINT_LIFECYCLE_PHASE" = "post" ]; then
  echo "ERROR: Post-phase failed (non-blocking)" >&2
  exit 1
fi
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Update status - should succeed despite post-phase failure
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      // Verify update succeeded
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Status updated successfully');
    });

    it('should handle multiple status transitions correctly', async () => {
      // Create hook that logs all transitions
      const hookPath = join(hooksDir, 'on-status-change');
      const logFile = join(testDir, 'transitions.log');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "$SPRINT_LIFECYCLE_PHASE: $SPRINT_STATUS_FROM -> $SPRINT_STATUS_TO" >> "${logFile}"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Multiple status updates
      await updateSprintStatusTool({ sprintId, status: 'in-progress' });
      await updateSprintStatusTool({ sprintId, status: 'validating' });
      await updateSprintStatusTool({ sprintId, status: 'complete' });

      // Read log
      const { readFile } = await import('fs/promises');
      const log = await readFile(logFile, 'utf-8');
      const lines = log.trim().split('\n');

      // Should have 6 entries (pre + post for each transition)
      expect(lines).toHaveLength(6);
      expect(log).toContain('pre: planning -> in-progress');
      expect(log).toContain('post: planning -> in-progress');
      expect(log).toContain('pre: in-progress -> validating');
      expect(log).toContain('post: in-progress -> validating');
      expect(log).toContain('pre: validating -> complete');
      expect(log).toContain('post: validating -> complete');
    });
  });

  // ==========================================================================
  // TEST: pre-worktree-remove Hook
  // ==========================================================================

  describe('cleanup-sprint with pre-worktree-remove hook', () => {
    let sprintId: string;

    beforeEach(async () => {
      // Create and complete a sprint
      const result = await startSprintTool({
        title: 'Test Sprint for Cleanup',
        goal: 'Test pre-worktree-remove hook',
        owner: 'Test User',
      });

      sprintId = result.content[0].text.match(/sprint-\d+-\w+/)?.[0]!;
      expect(sprintId).toBeDefined();

      // Mark as complete
      await updateSprintStatusTool({ sprintId, status: 'complete' });
    });

    it('should block cleanup on pre-worktree-remove hook failure', async () => {
      // Create hook that blocks cleanup
      const hookPath = join(hooksDir, 'pre-worktree-remove');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "ERROR: Cannot remove worktree - uncommitted changes detected" >&2
exit 1`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Attempt cleanup - should be blocked
      const result = await cleanupSprintTool({ sprintId });

      // Verify cleanup was blocked
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Pre-worktree-remove hook failed');
      expect(result.content[0].text).toContain('uncommitted changes detected');
    });
  });

  // ==========================================================================
  // TEST: pre-archive and post-archive Hooks
  // ==========================================================================

  describe('archive-sprint with archive hooks', () => {
    let sprintId: string;

    beforeEach(async () => {
      // Create and complete a sprint
      const result = await startSprintTool({
        title: 'Test Sprint for Archive',
        goal: 'Test archive hooks',
        owner: 'Test User',
      });

      sprintId = result.content[0].text.match(/sprint-\d+-\w+/)?.[0]!;
      expect(sprintId).toBeDefined();

      // Mark as complete
      await updateSprintStatusTool({ sprintId, status: 'complete' });

      // Create archive directory
      await mkdir(join(testDir, 'planning', 'archive'), { recursive: true });
    });

    it('should block archival on pre-archive hook failure', async () => {
      // Create hook that blocks archival
      const hookPath = join(hooksDir, 'pre-archive');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "ERROR: Sprint validation failed - cannot archive" >&2
exit 1`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Attempt archive - should be blocked
      const result = await archiveSprintTool({ sprintId });

      // Verify archival was blocked
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Pre-archive hook failed');
      expect(result.content[0].text).toContain('Sprint validation failed');
    });

    it('should execute post-archive hook after successful archival', async () => {
      // Create post-archive hook
      const hookPath = join(hooksDir, 'post-archive');
      const markerFile = join(testDir, '.post-archive-executed');
      await writeFile(
        hookPath,
        `#!/bin/bash
echo "Sprint $SPRINT_ID archived successfully"
touch "${markerFile}"
exit 0`,
        'utf-8'
      );
      await chmod(hookPath, 0o755);

      // Archive sprint
      const result = await archiveSprintTool({ sprintId });

      // Verify archival succeeded
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Sprint archived successfully');

      // Verify post-archive hook executed
      const { stat } = await import('fs/promises');
      await expect(stat(markerFile)).resolves.toBeDefined();
    });
  });
});
