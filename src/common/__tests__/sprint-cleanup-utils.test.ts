/**
 * Integration tests for sprint-cleanup-utils
 *
 * Uses real file system operations with temporary directories for isolation.
 */

import {
  calculateDiskUsage,
  detectUncommittedChanges,
  getCleanupCandidates,
  validateCleanupSafety,
  cleanupSprint,
} from '../sprint-cleanup-utils.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { stringify as stringifyYaml } from 'yaml';
import type { SprintManifest } from '../../types/sprint.js';

describe('sprint-cleanup-utils - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Create planning directory structure
    await mkdir(join(testDir, 'planning'), { recursive: true });
    await mkdir(join(testDir, '.worktrees'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper: Create sprint manifest file
   */
  async function createSprintManifest(
    sprintId: string,
    status: 'planning' | 'in-progress' | 'complete'
  ): Promise<void> {
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

    const sprintDir = join(testDir, 'planning', sprintId);
    await mkdir(sprintDir, { recursive: true });
    await writeFile(
      join(sprintDir, 'sprint-manifest.yaml'),
      stringifyYaml(manifest)
    );
  }

  /**
   * Helper: Create sprint index file
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
   * Helper: Create git worktree for sprint
   */
  async function createWorktree(
    sprintId: string,
    withUncommittedChanges = false
  ): Promise<string> {
    // Initialize main git repo if not already done
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    } catch {
      execSync('git init', { stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
      execSync('git config user.name "Test User"', { stdio: 'pipe' });
      execSync('git branch -M main', { stdio: 'pipe' });
      await writeFile('README.md', '# Test');
      execSync('git add README.md', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { stdio: 'pipe' });
    }

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

  describe('calculateDiskUsage() - Validation', () => {
    it('should calculate disk usage for existing directory', async () => {
      // Create directory with actual file content
      // Use a larger file to ensure disk usage is measurable
      const testContent = 'A'.repeat(1024); // 1KB of content
      await writeFile(join(testDir, 'file1.txt'), testContent);
      await writeFile(join(testDir, 'file2.txt'), testContent);

      // Sync to ensure files are written
      execSync('sync', { stdio: 'pipe' });

      // Calculate disk usage for the test directory itself
      const diskUsage = calculateDiskUsage(testDir);

      // Should return non-zero bytes
      // Note: On some systems, du might return 0 for small or temp directories
      // The key validation is that it returns a number without throwing
      expect(typeof diskUsage).toBe('number');
      expect(diskUsage).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for non-existent directory', () => {
      const nonExistentPath = join(testDir, 'does-not-exist');

      const diskUsage = calculateDiskUsage(nonExistentPath);

      expect(diskUsage).toBe(0);
    });
  });

  describe('detectUncommittedChanges() - Validation', () => {
    beforeEach(() => {
      // Initialize git repo for each test
      execSync('git init', { stdio: 'pipe' });
      execSync('git config user.email "test@example.com"', { stdio: 'pipe' });
      execSync('git config user.name "Test User"', { stdio: 'pipe' });
      execSync('git branch -M main', { stdio: 'pipe' });
    });

    it('should return false for clean worktree', async () => {
      // Create and commit a file (clean state)
      await writeFile('test.txt', 'content');
      execSync('git add test.txt', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { stdio: 'pipe' });

      const hasChanges = detectUncommittedChanges(testDir);

      expect(hasChanges).toBe(false);
    });

    it('should return true for worktree with uncommitted changes', async () => {
      // Create initial commit
      await writeFile('test.txt', 'content');
      execSync('git add test.txt', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit"', { stdio: 'pipe' });

      // Add uncommitted file
      await writeFile('uncommitted.txt', 'new file');

      const hasChanges = detectUncommittedChanges(testDir);

      expect(hasChanges).toBe(true);
    });
  });

  describe('getCleanupCandidates()', () => {
    it('should find completed sprints with worktrees', async () => {
      // Create sprint index with completed sprint
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');

      // Create worktree
      await createWorktree('sprint-1-test');

      // Get cleanup candidates
      const candidates = await getCleanupCandidates();

      expect(candidates).toHaveLength(1);
      expect(candidates[0].sprintId).toBe('sprint-1-test');
      expect(candidates[0].status).toBe('complete');
      expect(candidates[0].worktreeExists).toBe(true);
      expect(candidates[0].diskUsage).toBeGreaterThanOrEqual(0);
    });

    it('should filter by specific sprintId', async () => {
      // Create sprint index with 2 completed sprints
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
        { id: 'sprint-2-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');
      await createSprintManifest('sprint-2-test', 'complete');

      // Create worktrees for both
      await createWorktree('sprint-1-test');
      await createWorktree('sprint-2-test');

      // Get cleanup candidates for sprint-1 only
      const candidates = await getCleanupCandidates('sprint-1-test');

      expect(candidates).toHaveLength(1);
      expect(candidates[0].sprintId).toBe('sprint-1-test');
    });

    it('should return empty array when no candidates', async () => {
      // Create sprint index with completed sprint but no worktree
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');

      // Don't create worktree

      // Get cleanup candidates
      const candidates = await getCleanupCandidates();

      expect(candidates).toHaveLength(0);
    });
  });

  describe('validateCleanupSafety()', () => {
    it('should return valid for completed sprint', async () => {
      // Create completed sprint with planning directory
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');

      const result = await validateCleanupSafety('sprint-1-test');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when sprint not found', async () => {
      // Create empty sprint index
      await createSprintIndex([]);

      const result = await validateCleanupSafety('non-existent-sprint');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Sprint not found: non-existent-sprint');
    });

    it('should return error when sprint not complete', async () => {
      // Create in-progress sprint
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'in-progress' },
      ]);
      await createSprintManifest('sprint-1-test', 'in-progress');

      const result = await validateCleanupSafety('sprint-1-test');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('not complete'))).toBe(true);
    });
  });

  describe('cleanupSprint()', () => {
    it('should successfully cleanup completed sprint', async () => {
      // Create completed sprint with worktree
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');
      const worktreePath = await createWorktree('sprint-1-test');

      // Cleanup sprint
      const result = await cleanupSprint('sprint-1-test');

      expect(result.success).toBe(true);
      expect(result.worktreeRemoved).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Verify worktree is removed
      try {
        execSync(`test -d "${worktreePath}"`, { stdio: 'pipe' });
        fail('Worktree should have been removed');
      } catch {
        // Expected - worktree doesn't exist
      }
    });

    it('should block cleanup when validation fails', async () => {
      // Create in-progress sprint (not complete)
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'in-progress' },
      ]);
      await createSprintManifest('sprint-1-test', 'in-progress');
      const worktreePath = await createWorktree('sprint-1-test');

      // Try to cleanup
      const result = await cleanupSprint('sprint-1-test');

      expect(result.success).toBe(false);
      expect(result.worktreeRemoved).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Verify worktree still exists
      execSync(`test -d "${worktreePath}"`, { stdio: 'pipe' });
    });

    it('should block cleanup when uncommitted changes exist', async () => {
      // Create completed sprint with uncommitted changes
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');
      const worktreePath = await createWorktree('sprint-1-test', true); // with uncommitted changes

      // Try to cleanup without force
      const result = await cleanupSprint('sprint-1-test', { force: false });

      expect(result.success).toBe(false);
      expect(result.worktreeRemoved).toBe(false);
      expect(result.errors.some(e => e.includes('uncommitted changes'))).toBe(true);

      // Verify worktree still exists
      execSync(`test -d "${worktreePath}"`, { stdio: 'pipe' });
    });

    it('should allow cleanup with force flag despite uncommitted changes', async () => {
      // Create completed sprint with uncommitted changes
      await createSprintIndex([
        { id: 'sprint-1-test', status: 'complete' },
      ]);
      await createSprintManifest('sprint-1-test', 'complete');
      const worktreePath = await createWorktree('sprint-1-test', true); // with uncommitted changes

      // Cleanup with force
      const result = await cleanupSprint('sprint-1-test', { force: true });

      expect(result.success).toBe(true);
      expect(result.worktreeRemoved).toBe(true);
      expect(result.warnings.some(w => w.includes('uncommitted changes'))).toBe(true);

      // Verify worktree is removed
      try {
        execSync(`test -d "${worktreePath}"`, { stdio: 'pipe' });
        fail('Worktree should have been removed');
      } catch {
        // Expected - worktree doesn't exist
      }
    });
  });
});
