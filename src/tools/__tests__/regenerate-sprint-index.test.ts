/**
 * Integration tests for regenerate-sprint-index MCP tool
 *
 * Tests the MCP tool wrapper and core regeneration functionality
 */

import { regenerateSprintIndexTool } from '../regenerate-sprint-index.js';
import { mkdtemp, rm, mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';
import type { SprintManifest } from '../../types/sprint.js';

describe('regenerate-sprint-index tool', () => {
  let testDir: string;
  let originalCwd: string;
  let planningDir: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'regenerate-tool-test-'));

    // Change to test directory
    process.chdir(testDir);

    // Create planning directory
    planningDir = join(testDir, 'planning');
    await mkdir(planningDir, { recursive: true });
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

  describe('regeneration with zero sprints', () => {
    it('should generate empty index when no sprints exist', async () => {
      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text;
      expect(text).toContain('✅ Sprint index regenerated successfully');
      expect(text).toContain('Total sprints: 0');
      expect(text).toContain('Active sprints: 0');
      expect(text).toContain('Completed sprints: 0');
    });
  });

  describe('regeneration with single sprint', () => {
    it('should index one complete sprint correctly', async () => {
      // Create sprint directory and manifest
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-1-abc123',
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'complete',
        links: {
          branch: 'feature/sprint-1-abc123-test',
          pr: 'https://github.com/test/repo/pull/1',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Total sprints: 1');
      expect(text).toContain('Active sprints: 0');
      expect(text).toContain('Completed sprints: 1');
      expect(text).toContain('sprint-1-abc123');
      expect(text).toContain('Test Sprint');
      expect(text).toContain('complete');
    });

    it('should index one in-progress sprint correctly', async () => {
      const sprintDir = join(planningDir, 'sprint-2-def456');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-2-def456',
        title: 'Active Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'in-progress',
        links: {
          branch: 'feature/sprint-2-def456-active',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Total sprints: 1');
      expect(text).toContain('Active sprints: 1');
      expect(text).toContain('Completed sprints: 0');
      expect(text).toContain('sprint-2-def456');
      expect(text).toContain('in-progress');
    });
  });

  describe('regeneration with multiple sprints', () => {
    it('should index 5 sprints with correct statistics', async () => {
      // Create 5 sprint manifests
      const sprints = [
        { id: 'sprint-1-aaa', status: 'complete' as const },
        { id: 'sprint-2-bbb', status: 'complete' as const },
        { id: 'sprint-3-ccc', status: 'complete' as const },
        { id: 'sprint-4-ddd', status: 'in-progress' as const },
        { id: 'sprint-5-eee', status: 'planning' as const },
      ];

      for (const sprint of sprints) {
        const sprintDir = join(planningDir, sprint.id);
        await mkdir(sprintDir, { recursive: true });

        const manifest: SprintManifest = {
          id: sprint.id,
          title: `Sprint ${sprint.id}`,
          goal: 'Test goal',
          owner: 'Test Owner',
          createdAt: '2026-07-30T12:00:00Z',
          status: sprint.status,
          links: {
            branch: `feature/${sprint.id}`,
          },
        };

        await fsWriteFile(
          join(sprintDir, 'sprint-manifest.yaml'),
          stringifyYaml(manifest)
        );
      }

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Total sprints: 5');
      expect(text).toContain('Active sprints: 2'); // in-progress + planning
      expect(text).toContain('Completed sprints: 3');

      // Verify statistics section
      expect(text).toContain('planning: 1');
      expect(text).toContain('in-progress: 1');
      expect(text).toContain('complete: 3');

      // Verify all sprints are listed
      for (const sprint of sprints) {
        expect(text).toContain(sprint.id);
      }
    });

    it('should sort sprints by number', async () => {
      // Create sprints out of order
      const sprints = [
        { id: 'sprint-5-zzz', num: 5 },
        { id: 'sprint-1-aaa', num: 1 },
        { id: 'sprint-3-ccc', num: 3 },
        { id: 'sprint-2-bbb', num: 2 },
      ];

      for (const sprint of sprints) {
        const sprintDir = join(planningDir, sprint.id);
        await mkdir(sprintDir, { recursive: true });

        const manifest: SprintManifest = {
          id: sprint.id,
          title: `Sprint ${sprint.num}`,
          goal: 'Test goal',
          owner: 'Test Owner',
          createdAt: '2026-07-30T12:00:00Z',
          status: 'complete',
          links: {
            branch: `feature/${sprint.id}`,
          },
        };

        await fsWriteFile(
          join(sprintDir, 'sprint-manifest.yaml'),
          stringifyYaml(manifest)
        );
      }

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;

      // Find positions of sprint IDs in output
      const pos1 = text.indexOf('sprint-1-aaa');
      const pos2 = text.indexOf('sprint-2-bbb');
      const pos3 = text.indexOf('sprint-3-ccc');
      const pos5 = text.indexOf('sprint-5-zzz');

      // Verify they appear in sorted order
      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
      expect(pos3).toBeLessThan(pos5);
    });
  });

  describe('handling corrupted manifests', () => {
    it('should skip corrupted manifest and index valid ones', async () => {
      // Create valid sprint
      const validSprintDir = join(planningDir, 'sprint-1-valid');
      await mkdir(validSprintDir, { recursive: true });

      const validManifest: SprintManifest = {
        id: 'sprint-1-valid',
        title: 'Valid Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'complete',
        links: {
          branch: 'feature/sprint-1-valid',
        },
      };

      await fsWriteFile(
        join(validSprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(validManifest)
      );

      // Create corrupted sprint manifest
      const corruptedSprintDir = join(planningDir, 'sprint-2-corrupted');
      await mkdir(corruptedSprintDir, { recursive: true });
      await fsWriteFile(
        join(corruptedSprintDir, 'sprint-manifest.yaml'),
        'invalid: yaml: content: [unclosed'
      );

      const result = await regenerateSprintIndexTool();

      // Should succeed with the valid sprint only
      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Total sprints: 1');
      expect(text).toContain('sprint-1-valid');
      expect(text).not.toContain('sprint-2-corrupted');
    });
  });

  describe('statistics computation', () => {
    it('should compute byCompletionMode statistics correctly', async () => {
      // Create completed sprints with different completion modes
      const sprints = [
        { id: 'sprint-1-aaa', completionMode: 'normal' as const },
        { id: 'sprint-2-bbb', completionMode: 'normal' as const },
        { id: 'sprint-3-ccc', completionMode: 'forced' as const },
      ];

      for (const sprint of sprints) {
        const sprintDir = join(planningDir, sprint.id);
        await mkdir(sprintDir, { recursive: true });

        const manifest: any = {
          id: sprint.id,
          title: `Sprint ${sprint.id}`,
          goal: 'Test goal',
          owner: 'Test Owner',
          createdAt: '2026-07-30T12:00:00Z',
          status: 'complete',
          completionMode: sprint.completionMode,
          links: {
            branch: `feature/${sprint.id}`,
          },
        };

        await fsWriteFile(
          join(sprintDir, 'sprint-manifest.yaml'),
          stringifyYaml(manifest)
        );
      }

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('normal: 2');
      expect(text).toContain('forced: 1');
    });

    it('should compute average sprint duration when timestamps present', async () => {
      // Create completed sprints with timestamps
      const sprintDir1 = join(planningDir, 'sprint-1-aaa');
      await mkdir(sprintDir1, { recursive: true });

      const manifest1: any = {
        id: 'sprint-1-aaa',
        title: 'Sprint 1',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        startedAt: '2026-07-30T12:00:00Z',
        completedAt: '2026-07-30T18:00:00Z', // 6 hours
        status: 'complete',
        links: {
          branch: 'feature/sprint-1-aaa',
        },
      };

      await fsWriteFile(
        join(sprintDir1, 'sprint-manifest.yaml'),
        stringifyYaml(manifest1)
      );

      const sprintDir2 = join(planningDir, 'sprint-2-bbb');
      await mkdir(sprintDir2, { recursive: true });

      const manifest2: any = {
        id: 'sprint-2-bbb',
        title: 'Sprint 2',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        startedAt: '2026-07-30T12:00:00Z',
        completedAt: '2026-07-30T20:00:00Z', // 8 hours
        status: 'complete',
        links: {
          branch: 'feature/sprint-2-bbb',
        },
      };

      await fsWriteFile(
        join(sprintDir2, 'sprint-manifest.yaml'),
        stringifyYaml(manifest2)
      );

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      // Average of 6h and 8h is 7h = PT7H
      expect(text).toContain('Average sprint duration: PT7H');
    });
  });

  describe('validation integration', () => {
    it('should report validation passed for valid index', async () => {
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: any = {
        id: 'sprint-1-abc123',
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        startedAt: '2026-07-30T12:00:00Z',
        completedAt: '2026-07-30T18:00:00Z',
        status: 'complete',
        completionMode: 'normal',
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Validation:');
      expect(text).toContain('✅');
    });

    it('should report validation warnings when present', async () => {
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      // Create manifest without completedAt (will trigger warning)
      const manifest: SprintManifest = {
        id: 'sprint-1-abc123',
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'complete', // Complete but missing completedAt
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const result = await regenerateSprintIndexTool();

      expect(result.isError).toBeUndefined();

      const text = result.content[0].text;
      expect(text).toContain('Validation:');
      expect(text).toContain('warning');
      expect(text).toContain('MISSING_COMPLETED_AT');
    });
  });

  describe('file I/O operations', () => {
    it('should create index file at correct path', async () => {
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-1-abc123',
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'complete',
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      await regenerateSprintIndexTool();

      // Verify index file was created
      const { readFile } = await import('fs/promises');
      const indexPath = join(planningDir, 'sprint-index.yaml');
      const indexContent = await readFile(indexPath, 'utf-8');

      expect(indexContent).toContain('version: "1.0"');
      expect(indexContent).toContain('DO NOT EDIT THIS FILE MANUALLY');
      expect(indexContent).toContain('sprint-1-abc123');
    });
  });

  describe('MCP tool interface', () => {
    it('should return correct structure with content array', async () => {
      const result = await regenerateSprintIndexTool();

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should accept undefined args parameter', async () => {
      const result = await regenerateSprintIndexTool(undefined);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('✅');
    });

    it('should accept empty object as args parameter', async () => {
      const result = await regenerateSprintIndexTool({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('✅');
    });
  });
});
