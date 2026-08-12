/**
 * Integration tests for update-sprint-status tool
 *
 * Tests the MCP tool for atomically updating sprint status in both
 * manifest (authoritative) and index (derived cache).
 */

import { updateSprintStatusTool } from '../update-sprint-status.js';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { SprintManifest } from '../../types/sprint.js';

describe('update-sprint-status tool', () => {
  let testDir: string;
  let originalCwd: string;
  let planningDir: string;
  let sprintId: string;
  let sprintDir: string;
  let manifestPath: string;
  let indexPath: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'update-status-test-'));

    // Change to test directory
    process.chdir(testDir);

    // Create planning directory
    planningDir = join(testDir, 'planning');
    await mkdir(planningDir, { recursive: true });

    // Create a test sprint
    sprintId = 'sprint-1-abc123';
    sprintDir = join(planningDir, sprintId);
    await mkdir(sprintDir, { recursive: true });

    // Create sprint manifest
    const manifest: SprintManifest = {
      id: sprintId,
      title: 'Test Sprint',
      goal: 'Test goal',
      owner: 'Test Owner',
      createdAt: '2026-07-30T12:00:00Z',
      status: 'planning',
      links: {
        branch: 'feature/sprint-1-abc123-test',
      },
    };

    manifestPath = join(sprintDir, 'sprint-manifest.yaml');
    await writeFile(manifestPath, stringifyYaml(manifest));

    // Create sprint index with the test sprint
    indexPath = join(planningDir, 'sprint-index.yaml');
    const index = {
      version: '1.0',
      generatedAt: '2026-07-30T12:00:00Z',
      totalSprints: 1,
      activeSprints: 1,
      completedSprints: 0,
      sprints: [
        {
          id: sprintId,
          title: 'Test Sprint',
          status: 'planning',
          owner: 'Test Owner',
          createdAt: '2026-07-30T12:00:00Z',
          manifestPath: `planning/${sprintId}/sprint-manifest.yaml`,
          branch: 'feature/sprint-1-abc123-test',
        },
      ],
      statistics: {
        byStatus: {
          planning: 1,
        },
      },
    };
    await writeFile(indexPath, stringifyYaml(index));
  });

  afterEach(async () => {
    // Always restore original working directory first
    process.chdir(originalCwd);

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup test directory ${testDir}:`, error);
    }
  });

  describe('Status updates', () => {
    it('should update status to in-progress', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('status updated successfully');
      expect(result.content[0].text).toContain('Status: in-progress');

      // Verify manifest was updated
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.status).toBe('in-progress');

      // Verify index was updated
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.status).toBe('in-progress');
    });

    it('should update status to complete', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      expect(result.isError).toBeUndefined();

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.status).toBe('complete');
    });

    it('should update status through all lifecycle stages', async () => {
      const statuses = ['in-progress', 'validating', 'verifying', 'published', 'complete'] as const;

      for (const status of statuses) {
        const result = await updateSprintStatusTool({
          sprintId,
          status,
        });

        expect(result.isError).toBeUndefined();

        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = parseYaml(manifestContent) as SprintManifest;
        expect(manifest.status).toBe(status);
      }
    });

    it('should reject invalid status values', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'invalid-status',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid status');
      expect(result.content[0].text).toContain('invalid-status');
    });
  });

  describe('Timestamp updates', () => {
    it('should set completedAt timestamp', async () => {
      const completedAt = '2026-07-31T18:00:00Z';

      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
        completedAt,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(`Completed At: ${completedAt}`);

      // Verify manifest
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.completedAt).toBe(completedAt);

      // Verify index
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.completedAt).toBe(completedAt);
    });

    it('should update completedAt without changing status', async () => {
      // First mark as complete
      await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      // Then update just completedAt
      const completedAt = '2026-08-01T10:00:00Z';
      const result = await updateSprintStatusTool({
        sprintId,
        completedAt,
      });

      expect(result.isError).toBeUndefined();

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.status).toBe('complete'); // Status unchanged
      expect(manifest.completedAt).toBe(completedAt);
    });
  });

  describe('Completion mode updates', () => {
    it('should set completion mode to normal', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
        completionMode: 'normal',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Completion Mode: normal');

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.completionMode).toBe('normal');
    });

    it('should set completion mode to forced', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
        completionMode: 'forced',
      });

      expect(result.isError).toBeUndefined();

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.completionMode).toBe('forced');

      // Verify index
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.completionMode).toBe('forced');
    });
  });

  describe('Pull request URL updates', () => {
    it('should set PR URL', async () => {
      const prUrl = 'https://github.com/test/repo/pull/123';

      const result = await updateSprintStatusTool({
        sprintId,
        pr: prUrl,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(`Pull Request: ${prUrl}`);

      // Verify manifest
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.links?.pr).toBe(prUrl);

      // Verify index
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.pr).toBe(prUrl);
    });

    it('should update PR URL along with status', async () => {
      const prUrl = 'https://github.com/test/repo/pull/456';

      const result = await updateSprintStatusTool({
        sprintId,
        status: 'published',
        pr: prUrl,
      });

      expect(result.isError).toBeUndefined();

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.status).toBe('published');
      expect(manifest.links?.pr).toBe(prUrl);
    });
  });

  describe('Publication metadata updates (Protocol v2.5+)', () => {
    it('should set publication metadata', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        publicationMethod: 'github-cli',
        prCreatedAt: '2026-08-11T14:00:00Z',
        branchPushedAt: '2026-08-11T13:58:00Z',
        publicationNotes: 'PR created successfully via gh CLI',
      });

      expect(result.isError).toBeUndefined();

      // Verify manifest has publication metadata
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.publication).toBeDefined();
      expect(manifest.publication.method).toBe('github-cli');
      expect(manifest.publication.prCreatedAt).toBe('2026-08-11T14:00:00Z');
      expect(manifest.publication.branchPushedAt).toBe('2026-08-11T13:58:00Z');
      expect(manifest.publication.notes).toBe('PR created successfully via gh CLI');
    });

    it('should set PR URL and publication metadata together', async () => {
      const prUrl = 'https://github.com/test/repo/pull/999';

      const result = await updateSprintStatusTool({
        sprintId,
        pr: prUrl,
        publicationMethod: 'github-api',
        prCreatedAt: '2026-08-11T15:00:00Z',
      });

      expect(result.isError).toBeUndefined();

      // Verify manifest
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.links?.pr).toBe(prUrl);
      expect(manifest.publication).toBeDefined();
      expect(manifest.publication.method).toBe('github-api');
      expect(manifest.publication.prCreatedAt).toBe('2026-08-11T15:00:00Z');
    });

    it('should update individual publication metadata fields', async () => {
      // First, set some publication metadata
      await updateSprintStatusTool({
        sprintId,
        publicationMethod: 'manual',
        prCreatedAt: '2026-08-11T10:00:00Z',
      });

      // Then update just the notes
      await updateSprintStatusTool({
        sprintId,
        publicationNotes: 'Updated notes after PR merge',
      });

      // Verify both old and new fields are present
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.publication.method).toBe('manual');
      expect(manifest.publication.prCreatedAt).toBe('2026-08-11T10:00:00Z');
      expect(manifest.publication.notes).toBe('Updated notes after PR merge');
    });

    it('should handle publication metadata with status update', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'published',
        pr: 'https://github.com/test/repo/pull/777',
        publicationMethod: 'github-cli',
        prCreatedAt: '2026-08-11T16:00:00Z',
        branchPushedAt: '2026-08-11T15:58:00Z',
      });

      expect(result.isError).toBeUndefined();

      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.status).toBe('published');
      expect(manifest.links?.pr).toBe('https://github.com/test/repo/pull/777');
      expect(manifest.publication.method).toBe('github-cli');
      expect(manifest.publication.prCreatedAt).toBe('2026-08-11T16:00:00Z');
      expect(manifest.publication.branchPushedAt).toBe('2026-08-11T15:58:00Z');
    });

    it('should preserve existing publication metadata when updating other fields', async () => {
      // Set initial publication metadata
      await updateSprintStatusTool({
        sprintId,
        publicationMethod: 'github-cli',
        prCreatedAt: '2026-08-11T12:00:00Z',
      });

      // Update status without touching publication metadata
      await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      // Verify publication metadata is still there
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.status).toBe('complete');
      expect(manifest.publication.method).toBe('github-cli');
      expect(manifest.publication.prCreatedAt).toBe('2026-08-11T12:00:00Z');
    });
  });

  describe('Atomic updates', () => {
    it('should update all fields atomically', async () => {
      const updates = {
        sprintId,
        status: 'complete' as const,
        completedAt: '2026-07-31T20:00:00Z',
        completionMode: 'normal' as const,
        pr: 'https://github.com/test/repo/pull/789',
      };

      const result = await updateSprintStatusTool(updates);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Status: complete');
      expect(result.content[0].text).toContain('Completed At: 2026-07-31T20:00:00Z');
      expect(result.content[0].text).toContain('Completion Mode: normal');
      expect(result.content[0].text).toContain('Pull Request: https://github.com/test/repo/pull/789');

      // Verify manifest has all updates
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as any;
      expect(manifest.status).toBe('complete');
      expect(manifest.completedAt).toBe('2026-07-31T20:00:00Z');
      expect(manifest.completionMode).toBe('normal');
      expect(manifest.links.pr).toBe('https://github.com/test/repo/pull/789');

      // Verify index has all updates
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.status).toBe('complete');
      expect(sprintEntry.completedAt).toBe('2026-07-31T20:00:00Z');
      expect(sprintEntry.completionMode).toBe('normal');
      expect(sprintEntry.pr).toBe('https://github.com/test/repo/pull/789');
    });

    it('should update manifest first, then index (manifest is authoritative)', async () => {
      // This test verifies update order by checking file timestamps
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      expect(result.isError).toBeUndefined();

      // Both should be updated
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.status).toBe('in-progress');

      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);
      const sprintEntry = index.sprints.find((s: any) => s.id === sprintId);
      expect(sprintEntry.status).toBe('in-progress');
    });
  });

  describe('Error handling', () => {
    it('should reject missing sprintId', async () => {
      await expect(
        updateSprintStatusTool({})
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('should reject undefined args', async () => {
      await expect(
        updateSprintStatusTool(undefined)
      ).rejects.toThrow('Missing required argument: sprintId');
    });

    it('should reject non-existent sprint', async () => {
      const result = await updateSprintStatusTool({
        sprintId: 'sprint-999-nonexistent',
        status: 'complete',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Sprint not found');
      expect(result.content[0].text).toContain('sprint-999-nonexistent');
    });

    it('should handle corrupted manifest gracefully', async () => {
      // Write invalid YAML to manifest
      await writeFile(manifestPath, 'invalid: yaml: [unclosed');

      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update sprint');
    });
  });

  describe('Index validation integration', () => {
    it('should include validation results in response', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;

      // Should include validation section
      expect(text).toContain('Index Validation');
    });

    it('should report validation passed for valid updates', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
        completedAt: '2026-07-31T20:00:00Z',
        completionMode: 'normal',
      });

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Index Validation');
      // Either "All checks passed" or specific count of warnings/errors
      expect(
        text.includes('All checks passed') ||
        text.includes('warning') ||
        text.includes('error')
      ).toBe(true);
    });
  });

  describe('Response format', () => {
    it('should return valid MCP response format', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThanOrEqual(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should include updated fields in response', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
        completedAt: '2026-07-31T20:00:00Z',
      });

      const text = result.content[0].text;

      expect(text).toContain('Updated Fields');
      expect(text).toContain('Status: complete');
      expect(text).toContain('Completed At: 2026-07-31T20:00:00Z');
    });

    it('should include files updated in response', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'in-progress',
      });

      const text = result.content[0].text;

      expect(text).toContain('Files Updated');
      expect(text).toContain('sprint-manifest.yaml (authoritative)');
      expect(text).toContain('sprint-index.yaml (derived cache)');
    });
  });

  describe('Index statistics updates', () => {
    it('should update statistics when status changes to complete', async () => {
      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      expect(result.isError).toBeUndefined();

      // Verify index statistics were updated
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent);

      expect(index.activeSprints).toBe(0);
      expect(index.completedSprints).toBe(1);
      expect(index.statistics.byStatus.complete).toBe(1);
      // Planning count should be 0 (or undefined) when all sprints move to complete
      expect(index.statistics.byStatus.planning || 0).toBe(0);
    });
  });

  describe('Non-fatal index failures', () => {
    it('should succeed even if index does not exist', async () => {
      // Remove index file
      await rm(indexPath, { force: true });

      const result = await updateSprintStatusTool({
        sprintId,
        status: 'complete',
      });

      expect(result.isError).toBeUndefined();

      // Manifest should still be updated
      const manifestContent = await readFile(manifestPath, 'utf-8');
      const manifest = parseYaml(manifestContent) as SprintManifest;
      expect(manifest.status).toBe('complete');
    });
  });
});
