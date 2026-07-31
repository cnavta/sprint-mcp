/**
 * Unit tests for sprint-index-validator
 *
 * Tests all validation checks using temporary directories and fixture data
 */

import { validateSprintIndex } from '../sprint-index-validator.js';
import { saveSprintIndex } from '../sprint-index-manager.js';
import { mkdtemp, rm, mkdir, writeFile as fsWriteFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';
import type { SprintIndex } from '../../types/sprint-index.js';
import type { SprintManifest } from '../../types/sprint.js';

describe('sprint-index-validator', () => {
  let testDir: string;
  let originalCwd: string;
  let planningDir: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'sprint-validator-test-'));

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

  describe('valid index', () => {
    it('should pass validation for a valid index with no sprints', async () => {
      // Create empty but valid index
      const validIndex: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 0,
        activeSprints: 0,
        completedSprints: 0,
        sprints: [],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: {
            normal: 0,
            forced: 0,
          },
        },
      };

      await saveSprintIndex(validIndex);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.validatedAt).toBeDefined();
    });

    it('should pass validation for a valid index with complete sprint', async () => {
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
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      // Create valid index
      const validIndex: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 0,
        completedSprints: 1,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'complete',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            completedAt: '2026-07-30T18:00:00Z',
            completionMode: 'normal',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
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

      await saveSprintIndex(validIndex);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('schema validation', () => {
    it('should detect missing version field', async () => {
      const invalidIndex = {
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 0,
        activeSprints: 0,
        completedSprints: 0,
        sprints: [],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await fsWriteFile(
        join(planningDir, 'sprint-index.yaml'),
        stringifyYaml(invalidIndex)
      );

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.code === 'MISSING_VERSION')).toBe(true);
    });

    it('should detect missing required fields', async () => {
      const invalidIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        // Missing: totalSprints, activeSprints, completedSprints, sprints, statistics
      };

      await fsWriteFile(
        join(planningDir, 'sprint-index.yaml'),
        stringifyYaml(invalidIndex)
      );

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.code === 'MISSING_FIELD')).toBe(true);
    });

    it('should detect invalid version format', async () => {
      const invalidIndex: SprintIndex = {
        version: 'invalid',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 0,
        activeSprints: 0,
        completedSprints: 0,
        sprints: [],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(invalidIndex);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_VERSION')).toBe(true);
    });
  });

  describe('entry validation', () => {
    it('should detect missing entry fields', async () => {
      const invalidIndex: any = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            // Missing: title, status, owner, createdAt, manifestPath, branch
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await fsWriteFile(
        join(planningDir, 'sprint-index.yaml'),
        stringifyYaml(invalidIndex)
      );

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.filter((e) => e.code === 'MISSING_ENTRY_FIELD').length).toBeGreaterThan(0);
    });

    it('should detect invalid status value', async () => {
      const invalidIndex: any = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'invalid-status',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await fsWriteFile(
        join(planningDir, 'sprint-index.yaml'),
        stringifyYaml(invalidIndex)
      );

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_STATUS')).toBe(true);
    });

    it('should warn about complete sprint missing completedAt', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 0,
        completedSprints: 1,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'complete',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            // Missing: completedAt
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
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
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.warnings.some((w) => w.code === 'MISSING_COMPLETED_AT')).toBe(true);
    });

    it('should warn about complete sprint missing completionMode', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 0,
        completedSprints: 1,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'complete',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            completedAt: '2026-07-30T18:00:00Z',
            // Missing: completionMode
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
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
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.warnings.some((w) => w.code === 'MISSING_COMPLETION_MODE')).toBe(true);
    });
  });

  describe('manifest file existence', () => {
    it('should detect missing manifest file', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'in-progress',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);
      // Note: We don't create the manifest file

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MANIFEST_NOT_FOUND')).toBe(true);
    });
  });

  describe('data consistency', () => {
    it('should detect ID mismatch between index and manifest', async () => {
      // Create sprint directory and manifest
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-1-xyz789', // Different ID
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'in-progress',
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'in-progress',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DATA_MISMATCH_ID')).toBe(true);
    });

    it('should detect status mismatch between index and manifest', async () => {
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-1-abc123',
        title: 'Test Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'complete', // Different status
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'in-progress', // Different status
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DATA_MISMATCH_STATUS')).toBe(true);
    });

    it('should warn about title mismatch between index and manifest', async () => {
      const sprintDir = join(planningDir, 'sprint-1-abc123');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-1-abc123',
        title: 'Updated Title', // Different title
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'in-progress',
        links: {
          branch: 'feature/sprint-1-abc123-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Original Title',
            status: 'in-progress',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.warnings.some((w) => w.code === 'DATA_MISMATCH_TITLE')).toBe(true);
    });
  });

  describe('orphaned manifests', () => {
    it('should warn about manifests not in index', async () => {
      // Create a sprint directory with manifest
      const sprintDir = join(planningDir, 'sprint-2-orphan');
      await mkdir(sprintDir, { recursive: true });

      const manifest: SprintManifest = {
        id: 'sprint-2-orphan',
        title: 'Orphaned Sprint',
        goal: 'Test goal',
        owner: 'Test Owner',
        createdAt: '2026-07-30T12:00:00Z',
        status: 'in-progress',
        links: {
          branch: 'feature/sprint-2-orphan-test',
        },
      };

      await fsWriteFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(manifest)
      );

      // Create index without this sprint
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 0,
        activeSprints: 0,
        completedSprints: 0,
        sprints: [],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.warnings.some((w) => w.code === 'ORPHANED_MANIFEST')).toBe(true);
      expect(result.warnings.some((w) => w.sprintId === 'sprint-2-orphan')).toBe(true);
    });
  });

  describe('statistics validation', () => {
    it('should detect totalSprints mismatch', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 5, // Wrong count
        activeSprints: 0,
        completedSprints: 0,
        sprints: [],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'STATS_MISMATCH_TOTAL')).toBe(true);
    });

    it('should detect activeSprints mismatch', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 5, // Wrong count
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'in-progress',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 1,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'STATS_MISMATCH_ACTIVE')).toBe(true);
    });

    it('should detect byStatus count mismatch', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 1,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'in-progress',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 5, // Wrong count
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'STATS_MISMATCH_BY_STATUS')).toBe(true);
    });

    it('should detect byCompletionMode count mismatch', async () => {
      const index: SprintIndex = {
        version: '1.0',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 1,
        activeSprints: 0,
        completedSprints: 1,
        sprints: [
          {
            id: 'sprint-1-abc123',
            title: 'Test Sprint',
            status: 'complete',
            owner: 'Test Owner',
            createdAt: '2026-07-30T12:00:00Z',
            completedAt: '2026-07-30T18:00:00Z',
            completionMode: 'normal',
            manifestPath: 'planning/sprint-1-abc123/sprint-manifest.yaml',
            branch: 'feature/sprint-1-abc123-test',
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
            normal: 5, // Wrong count
            forced: 0,
          },
        },
      };

      await saveSprintIndex(index);

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'STATS_MISMATCH_COMPLETION_MODE')).toBe(true);
    });
  });

  describe('multiple issues', () => {
    it('should report multiple errors and warnings together', async () => {
      const index: any = {
        version: 'invalid',
        generatedAt: '2026-07-31T12:00:00Z',
        totalSprints: 10, // Wrong
        activeSprints: 0,
        completedSprints: 0,
        sprints: [
          {
            id: 'sprint-1-abc123',
            // Missing required fields
          },
        ],
        statistics: {
          byStatus: {
            planning: 0,
            'in-progress': 0,
            validating: 0,
            verifying: 0,
            published: 0,
            complete: 0,
          },
          byCompletionMode: { normal: 0, forced: 0 },
        },
      };

      await fsWriteFile(
        join(planningDir, 'sprint-index.yaml'),
        stringifyYaml(index)
      );

      const result = await validateSprintIndex();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
