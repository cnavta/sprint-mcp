/**
 * Integration tests for cleanup-sprint tool
 *
 * Uses real file system operations with temporary directories for isolation.
 */

import {
  cleanupSprintTool,
  executeCleanupSprintTool,
} from '../cleanup-sprint.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { stringify as stringifyYaml } from 'yaml';
import {
  isValidMCPResponse,
  isErrorResponse,
} from './test-helpers.js';
import type { SprintManifest } from '../../types/sprint.js';

describe('cleanup-sprint - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Create planning directory structure
    await mkdir(join(testDir, 'planning'), { recursive: true });
    await mkdir(join(testDir, '.worktrees'), { recursive: true });

    // Initialize git repo
    execSync('git init', { stdio: 'pipe' });
    execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
    execSync('git config user.name "Test User"', { stdio: 'pipe' });
    execSync('git branch -M main', { stdio: 'pipe' });
    await writeFile('README.md', '# Test');
    execSync('git add README.md', { stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { stdio: 'pipe' });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper: Create sprint with manifest and index
   */
  async function createSprint(
    sprintId: string,
    status: 'planning' | 'in-progress' | 'complete'
  ): Promise<void> {
    const sprintDir = join(testDir, 'planning', sprintId);
    await mkdir(sprintDir, { recursive: true });

    // Create manifest
    const manifest: SprintManifest = {
      id: sprintId,
      title: `Test Sprint ${sprintId}`,
      goal: 'Test goal',
      owner: 'test-owner',
      status,
      createdAt: '2026-08-01T12:00:00Z',
      links: {
        branch: `feature/${sprintId}-test`,
      },
    };
    await writeFile(
      join(sprintDir, 'sprint-manifest.yaml'),
      stringifyYaml(manifest)
    );
  }

  /**
   * Helper: Create sprint index
   */
  async function createSprintIndex(sprints: Array<{
    id: string;
    status: 'planning' | 'in-progress' | 'complete';
  }>): Promise<void> {
    const index = {
      version: '1.0',
      generatedAt: '2026-08-01T12:00:00Z',
      totalSprints: sprints.length,
      activeSprints: sprints.filter(s => s.status !== 'complete').length,
      completedSprints: sprints.filter(s => s.status === 'complete').length,
      sprints: sprints.map(s => ({
        id: s.id,
        title: `Test Sprint ${s.id}`,
        status: s.status,
        owner: 'test-owner',
        createdAt: '2026-08-01T12:00:00Z',
        manifestPath: `planning/${s.id}/sprint-manifest.yaml`,
        branch: `feature/${s.id}-test`,
        ...(s.status === 'complete' && {
          completedAt: '2026-08-01T14:00:00Z',
          completionMode: 'normal' as const,
        }),
      })),
      statistics: {
        byStatus: {
          planning: sprints.filter(s => s.status === 'planning').length,
          'in-progress': sprints.filter(s => s.status === 'in-progress').length,
          validating: 0,
          verifying: 0,
          published: 0,
          complete: sprints.filter(s => s.status === 'complete').length,
        },
        byCompletionMode: {
          normal: sprints.filter(s => s.status === 'complete').length,
          forced: 0,
        },
        averageSprintDuration: 'PT6H',
      },
    };

    await writeFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      stringifyYaml(index)
    );
  }

  /**
   * Helper: Create git worktree
   */
  async function createWorktree(
    sprintId: string,
    withUncommittedChanges = false
  ): Promise<string> {
    const worktreePath = join(testDir, '.worktrees', sprintId);
    const branchName = `feature/${sprintId}-test`;

    // Create worktree
    execSync(`git worktree add "${worktreePath}" -b "${branchName}"`, {
      stdio: 'pipe',
    });

    // Add uncommitted changes if requested
    if (withUncommittedChanges) {
      await writeFile(join(worktreePath, 'uncommitted.txt'), 'test');
    }

    return worktreePath;
  }

  describe('cleanupSprintTool() - Preview Mode', () => {
    it('should list all cleanup candidates', async () => {
      // Create completed sprint with worktree
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');
      await createWorktree('sprint-1-test');

      const result = await cleanupSprintTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('sprint-1-test');
      expect(text).toContain('Sprint Cleanup');
    });

    it('should filter to specific sprintId', async () => {
      // Create 2 completed sprints with worktrees
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
        { id: 'sprint-2-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');
      await createSprint('sprint-2-test', 'complete');
      await createWorktree('sprint-1-test');
      await createWorktree('sprint-2-test');

      const result = await cleanupSprintTool({ sprintId: 'sprint-1-test' });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('sprint-1-test');
      expect(text).not.toContain('sprint-2-test');
    });

    it('should return message when no candidates found', async () => {
      // Create completed sprint without worktree
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');

      const result = await cleanupSprintTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('No');
      expect(text).toMatch(/worktree|cleanup/i);
    });

    it('should warn about uncommitted changes', async () => {
      // Create completed sprint with uncommitted changes
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');
      await createWorktree('sprint-1-test', true); // with uncommitted changes

      const result = await cleanupSprintTool({
        sprintId: 'sprint-1-test',
        force: false,
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(true); // Should error when uncommitted changes
      const text = result.content[0].text;
      expect(text).toContain('uncommitted changes');
    });
  });

  describe('executeCleanupSprintTool() - Execution Mode', () => {
    it('should successfully cleanup completed sprint', async () => {
      // Create completed sprint with worktree
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');
      const worktreePath = await createWorktree('sprint-1-test');

      const result = await executeCleanupSprintTool({
        sprintId: 'sprint-1-test',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Cleanup complete');
      expect(text).toContain('Successfully cleaned: 1');

      // Verify worktree is removed
      try {
        execSync(`test -d "${worktreePath}"`, { stdio: 'pipe' });
        fail('Worktree should have been removed');
      } catch {
        // Expected - worktree doesn't exist
      }
    });

    it('should skip non-completed sprints (no errors)', async () => {
      // Create in-progress sprint (won't be in cleanup candidates)
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'in-progress' },
      ]);
      await createSprint('sprint-1-test', 'in-progress');
      await createWorktree('sprint-1-test');

      const result = await executeCleanupSprintTool({
        sprintId: 'sprint-1-test',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      // In-progress sprints are not cleanup candidates, so no cleanup happens
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('No worktrees to cleanup');
    });

    it('should cleanup multiple sprints', async () => {
      // Create 2 completed sprints with worktrees
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
        { id: 'sprint-2-test', status: 'complete' },
      ]);
      await createSprint('sprint-1-test', 'complete');
      await createSprint('sprint-2-test', 'complete');
      const worktree1 = await createWorktree('sprint-1-test');
      const worktree2 = await createWorktree('sprint-2-test');

      const result = await executeCleanupSprintTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('Successfully cleaned: 2');

      // Verify both worktrees are removed
      try {
        execSync(`test -d "${worktree1}"`, { stdio: 'pipe' });
        fail('Worktree 1 should have been removed');
      } catch {
        // Expected
      }
      try {
        execSync(`test -d "${worktree2}"`, { stdio: 'pipe' });
        fail('Worktree 2 should have been removed');
      } catch {
        // Expected
      }
    });
  });
});
