/**
 * Integration tests for complete-sprint tool
 *
 * Uses real file system operations with temporary directories for isolation.
 */

import { completeSprintTool } from '../complete-sprint.js';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';
import {
  isValidMCPResponse,
  isErrorResponse,
} from './test-helpers.js';
import type { SprintManifest } from '../../types/sprint.js';

describe('complete-sprint - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));
    process.chdir(testDir);

    // Create planning directory structure
    await mkdir(join(testDir, 'planning'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper: Create sprint with artifacts
   */
  async function createSprint(
    sprintId: string,
    status: 'planning' | 'in-progress' | 'complete',
    artifacts: {
      verification?: boolean;
      retro?: boolean;
      keyLearnings?: boolean;
      publication?: boolean;
    } = {}
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

    // Create artifacts
    if (artifacts.verification !== false) {
      await writeFile(join(sprintDir, 'verification-report.md'), '# Verification');
    }
    if (artifacts.retro !== false) {
      await writeFile(join(sprintDir, 'retro.md'), '# Retro');
    }
    if (artifacts.keyLearnings !== false) {
      await writeFile(join(sprintDir, 'key-learnings.md'), '# Key Learnings');
    }
    if (artifacts.publication !== false) {
      await writeFile(join(sprintDir, 'publication.yaml'), 'pr: null');
    }

    // Create sprint index
    const index = {
      version: '1.0',
      generatedAt: '2026-08-01T12:00:00Z',
      totalSprints: 1,
      activeSprints: status !== 'complete' ? 1 : 0,
      completedSprints: status === 'complete' ? 1 : 0,
      sprints: [{
        id: sprintId,
        title: `Test Sprint ${sprintId}`,
        status,
        owner: 'test-owner',
        createdAt: '2026-08-01T12:00:00Z',
        manifestPath: `planning/${sprintId}/sprint-manifest.yaml`,
        branch: `feature/${sprintId}-test`,
      }],
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
        averageSprintDuration: 'PT6H',
      },
    };
    await writeFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      stringifyYaml(index)
    );
  }

  describe('completeSprintTool()', () => {
    // Tests for validation mode behavior
    it('should reject invalid completion mode', async () => {
      await createSprint('sprint-1-test', 'in-progress');

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'invalid' as any,
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(true);
      const text = result.content[0].text;
      expect(text).toContain('Invalid completion mode');
    });

    // Tests for artifact validation (normal mode)
    it('should validate all artifacts exist in normal mode', async () => {
      await createSprint('sprint-1-test', 'in-progress', {
        verification: false, // Missing
        retro: true,
        keyLearnings: true,
        publication: true,
      });

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'normal',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(true);
      const text = result.content[0].text;
      expect(text).toContain('verification-report.md');
    });

    // Tests for artifact validation (forced mode)
    it('should successfully complete sprint in normal mode with all artifacts', async () => {
      await createSprint('sprint-1-test', 'in-progress');

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'normal',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('completed successfully');
      expect(text).toContain('sprint-1-test');
    });

    it('should fail in normal mode when artifact missing', async () => {
      await createSprint('sprint-1-test', 'in-progress', {
        verification: true,
        retro: false, // Missing
        keyLearnings: true,
        publication: true,
      });

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'normal',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(true);
      const text = result.content[0].text;
      expect(text).toContain('retro.md');
    });

    it('should succeed in forced mode despite missing artifacts', async () => {
      await createSprint('sprint-1-test', 'in-progress', {
        verification: false, // Missing
        retro: false, // Missing
        keyLearnings: true,
        publication: true,
      });

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'forced',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('completed successfully');
      expect(text).toContain('Completion Mode: forced');
    });

    it('should throw error when sprintId missing', async () => {
      await expect(async () => {
        await completeSprintTool({
          completionMode: 'normal',
        } as any);
      }).rejects.toThrow('Missing required arguments');
    });

    it('should throw error when completionMode missing', async () => {
      await createSprint('sprint-1-test', 'in-progress');

      await expect(async () => {
        await completeSprintTool({
          sprintId: 'sprint-1-test',
        } as any);
      }).rejects.toThrow('Missing required arguments');
    });

    it('should include PR URL in result when provided', async () => {
      await createSprint('sprint-1-test', 'in-progress');

      const result = await completeSprintTool({
        sprintId: 'sprint-1-test',
        completionMode: 'normal',
        pr: 'https://github.com/owner/repo/pull/123',
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(isErrorResponse(result)).toBe(false);
      const text = result.content[0].text;
      expect(text).toContain('https://github.com/owner/repo/pull/123');
    });
  });
});
