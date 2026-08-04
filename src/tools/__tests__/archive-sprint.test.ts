/**
 * Integration tests for archive-sprint tool
 *
 * Uses real file system operations with temporary directories for isolation.
 */

import { archiveSprintTool } from '../archive-sprint.js';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import {
  isValidMCPResponse,
  isErrorResponse,
} from './test-helpers.js';
import type { SprintManifest } from '../../types/sprint.js';
import type { ArchiveConfig } from '../../types/archive-config.js';
import type { SprintIndex } from '../../types/sprint-index.js';

describe('archive-sprint - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Create planning directory structure with archive enabled
    await mkdir(join(testDir, 'planning', 'active'), { recursive: true });
    await mkdir(join(testDir, 'planning', 'archive', '2026'), { recursive: true });

    // Create archive-config.yaml to enable archive system
    const archiveConfig: { archive: ArchiveConfig } = {
      archive: {
        enabled: true,
        autoArchive: {
          enabled: false,
          criteria: 'hybrid',
          ageDays: 30,
          keepCount: 10,
          schedule: 'manual',
        },
        knowledge: {
          extractOnComplete: false,
          categories: ['lessons'],
          aggregateOnExtraction: false,
        },
        migration: {
          completed: true,
          backupPath: 'sprint-index-backup.yaml',
        },
      },
    };

    await writeFile(
      join(testDir, 'planning', 'archive-config.yaml'),
      stringifyYaml(archiveConfig)
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper: Create sprint in active directory with optional completion date
   */
  async function createActiveSprint(
    sprintId: string,
    completedAt?: string
  ): Promise<void> {
    const sprintDir = join(testDir, 'planning', 'active', sprintId);
    await mkdir(sprintDir, { recursive: true });

    // Create manifest
    const manifest: SprintManifest = {
      id: sprintId,
      title: `Test Sprint ${sprintId}`,
      goal: 'Test goal',
      owner: 'test-owner',
      status: 'complete',
      createdAt: '2026-07-15T12:00:00Z',
      links: {
        branch: `feature/${sprintId}-test`,
      },
    };
    await writeFile(
      join(sprintDir, 'sprint-manifest.yaml'),
      stringifyYaml(manifest)
    );

    // Create sprint index
    const index: SprintIndex = {
      version: '1.0',
      generatedAt: '2026-08-01T12:00:00Z',
      totalSprints: 1,
      activeSprints: 0,
      completedSprints: 1,
      sprints: [
        {
          id: sprintId,
          title: `Test Sprint ${sprintId}`,
          status: 'complete',
          owner: 'test-owner',
          createdAt: '2026-07-15T12:00:00Z',
          completedAt: completedAt || '2026-08-01T12:00:00Z',
          manifestPath: `planning/active/${sprintId}/sprint-manifest.yaml`,
          branch: `feature/${sprintId}-test`,
        },
      ],
      statistics: {
        byStatus: {
          planning: 0,
          'in-progress': 0,
          validating: 0,
          verifying: 0,
          published: 0,
          complete: 1,
        },
        byCompletionMode: {
          normal: 1,
          forced: 0,
        },
      },
    };

    await writeFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      stringifyYaml(index)
    );
  }

  describe('Successful Archival', () => {
    it('should archive a completed sprint to correct year directory', async () => {
      const sprintId = 'sprint-10-abc123';
      await createActiveSprint(sprintId, '2026-08-01T14:00:00Z');

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[0].text).toContain('archived successfully');
      expect(result.content[0].text).toContain('Archive Year: 2026');

      // Verify directory moved
      const activeDir = join(testDir, 'planning', 'active', sprintId);
      const archiveDir = join(testDir, 'planning', 'archive', '2026', sprintId);

      await expect(async () => {
        await readFile(join(activeDir, 'sprint-manifest.yaml'));
      }).rejects.toThrow();

      const archivedManifest = await readFile(
        join(archiveDir, 'sprint-manifest.yaml'),
        'utf-8'
      );
      expect(archivedManifest).toContain(sprintId);

      // Verify index updated
      const indexContent = await readFile(
        join(testDir, 'planning', 'sprint-index.yaml'),
        'utf-8'
      );
      const index = parseYaml(indexContent) as SprintIndex;
      expect(index.sprints[0].manifestPath).toBe(
        `planning/archive/2026/${sprintId}/sprint-manifest.yaml`
      );
    });
  });

  describe('Year Determination', () => {
    it('should use completedAt for archive year', async () => {
      const sprintId = 'sprint-11-def456';
      await createActiveSprint(sprintId, '2025-12-15T14:00:00Z');

      const result = await archiveSprintTool({
        sprintId,
        dryRun: true, // Dry-run to check year
      });

      expect(result.content[0].text).toContain('Archive Year: 2025');
    });

    it('should fallback to createdAt if completedAt is missing', async () => {
      const sprintId = 'sprint-12-ghi789';
      await createActiveSprint(sprintId); // No completedAt

      // Update index to remove completedAt
      const indexPath = join(testDir, 'planning', 'sprint-index.yaml');
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent) as SprintIndex;
      delete index.sprints[0].completedAt;
      await writeFile(indexPath, stringifyYaml(index));

      const result = await archiveSprintTool({
        sprintId,
        dryRun: true,
      });

      // Should use createdAt (2026-07-15)
      expect(result.content[0].text).toContain('Archive Year: 2026');
    });
  });

  describe('Validation Failures', () => {
    it('should fail if archive system is not enabled', async () => {
      // Remove archive-config.yaml
      await rm(join(testDir, 'planning', 'archive-config.yaml'), { force: true });

      const sprintId = 'sprint-13-jkl012';
      await createActiveSprint(sprintId);

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('Archive system is not enabled');
    });

    it('should fail if sprint not found in index', async () => {
      const sprintId = 'sprint-99-notfound';

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('Sprint not found in index');
    });

    it('should fail if sprint status is not complete', async () => {
      const sprintId = 'sprint-14-mno345';
      await createActiveSprint(sprintId);

      // Update index to mark as in-progress
      const indexPath = join(testDir, 'planning', 'sprint-index.yaml');
      const indexContent = await readFile(indexPath, 'utf-8');
      const index = parseYaml(indexContent) as SprintIndex;
      index.sprints[0].status = 'in-progress';
      await writeFile(indexPath, stringifyYaml(index));

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain("status is 'in-progress'");
      expect(result.content[0].text).toContain("must be 'complete'");
    });

    it('should fail if sprint directory not in active/', async () => {
      const sprintId = 'sprint-15-pqr678';
      await createActiveSprint(sprintId);

      // Move sprint out of active/ to simulate wrong location
      await mkdir(join(testDir, 'planning', sprintId), { recursive: true });
      await writeFile(
        join(testDir, 'planning', sprintId, 'sprint-manifest.yaml'),
        'test'
      );
      await rm(join(testDir, 'planning', 'active', sprintId), {
        recursive: true,
        force: true,
      });

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('not in active directory');
    });

    it('should fail if archive destination already exists', async () => {
      const sprintId = 'sprint-16-stu901';
      await createActiveSprint(sprintId);

      // Pre-create archive destination
      await mkdir(join(testDir, 'planning', 'archive', '2026', sprintId), {
        recursive: true,
      });
      await writeFile(
        join(testDir, 'planning', 'archive', '2026', sprintId, 'sprint-manifest.yaml'),
        'existing'
      );

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('destination already exists');
    });
  });

  describe('Dry-Run Mode', () => {
    it('should preview archival without making changes', async () => {
      const sprintId = 'sprint-17-vwx234';
      await createActiveSprint(sprintId);

      const result = await archiveSprintTool({
        sprintId,
        dryRun: true,
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      expect(result.content[0].text).toContain('🔍');
      expect(result.content[0].text).toContain('Dry-run');
      expect(result.content[0].text).toContain('Would archive sprint');
      expect(result.content[0].text).toContain('Source: ');
      expect(result.content[0].text).toContain('Destination: ');
      expect(result.content[0].text).toContain('planning/archive/2026');

      // Verify directory NOT moved
      const activeDir = join(testDir, 'planning', 'active', sprintId);
      const archiveDir = join(testDir, 'planning', 'archive', '2026', sprintId);

      await expect(
        readFile(join(activeDir, 'sprint-manifest.yaml'))
      ).resolves.toBeDefined();

      await expect(async () => {
        await readFile(join(archiveDir, 'sprint-manifest.yaml'));
      }).rejects.toThrow();

      // Verify index NOT updated
      const indexContent = await readFile(
        join(testDir, 'planning', 'sprint-index.yaml'),
        'utf-8'
      );
      const index = parseYaml(indexContent) as SprintIndex;
      expect(index.sprints[0].manifestPath).toBe(
        `planning/active/${sprintId}/sprint-manifest.yaml`
      );
    });
  });

  describe('Directory Creation', () => {
    it('should create archive year directory if it does not exist', async () => {
      const sprintId = 'sprint-18-yza567';
      await createActiveSprint(sprintId, '2025-06-01T14:00:00Z');

      // Verify 2025 archive dir doesn't exist yet
      await expect(async () => {
        await readFile(join(testDir, 'planning', 'archive', '2025', 'test.txt'));
      }).rejects.toThrow();

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      expect(result.content[0].text).toContain('Archive Year: 2025');

      // Verify 2025 archive dir was created
      const archiveDir = join(testDir, 'planning', 'archive', '2025', sprintId);
      const archivedManifest = await readFile(
        join(archiveDir, 'sprint-manifest.yaml'),
        'utf-8'
      );
      expect(archivedManifest).toContain(sprintId);
    });
  });

  describe('Index Path Updates', () => {
    it('should update sprint-index.yaml with new manifest path', async () => {
      const sprintId = 'sprint-19-bcd890';
      await createActiveSprint(sprintId);

      // Verify initial path
      let indexContent = await readFile(
        join(testDir, 'planning', 'sprint-index.yaml'),
        'utf-8'
      );
      let index = parseYaml(indexContent) as SprintIndex;
      expect(index.sprints[0].manifestPath).toBe(
        `planning/active/${sprintId}/sprint-manifest.yaml`
      );

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isValidMCPResponse(result)).toBe(true);

      // Verify updated path
      indexContent = await readFile(
        join(testDir, 'planning', 'sprint-index.yaml'),
        'utf-8'
      );
      index = parseYaml(indexContent) as SprintIndex;
      expect(index.sprints[0].manifestPath).toBe(
        `planning/archive/2026/${sprintId}/sprint-manifest.yaml`
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required argument', async () => {
      await expect(async () => {
        await archiveSprintTool({});
      }).rejects.toThrow('Missing required argument: sprintId');
    });

    it('should provide helpful error messages', async () => {
      const sprintId = 'sprint-20-efg123';

      const result = await archiveSprintTool({
        sprintId,
        dryRun: false,
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('Prerequisites');
      expect(result.content[0].text).toContain('Archive system must be enabled');
    });
  });
});
