/**
 * Tests for Auto-Archive Sprints Tool
 */

import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { stringify as stringifyYaml } from 'yaml';
import { autoArchiveSprintsTool } from '../auto-archive-sprints.js';
import { startSprintTool } from '../start-sprint.js';
import { updateSprintStatusTool } from '../update-sprint-status.js';
import { completeSprintTool } from '../complete-sprint.js';
import { regenerateSprintIndexTool } from '../regenerate-sprint-index.js';
import type { ArchiveConfig } from '../../types/archive-config.js';

describe('auto-archive-sprints', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original directory
    originalCwd = process.cwd();

    // Create isolated test directory
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-auto-archive-test-'));
    process.chdir(testDir);

    // Initialize git repo
    execSync('git init', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync(
      'touch README.md && git add README.md && git commit -m "Initial commit"',
      { cwd: testDir }
    );

    // Create directory structure
    await mkdir(join(testDir, 'planning'), { recursive: true });
    await mkdir(join(testDir, 'planning', 'active'), { recursive: true });
    await mkdir(join(testDir, 'planning', 'archive'), { recursive: true });
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create archive config
   */
  async function createArchiveConfig(overrides?: Partial<ArchiveConfig>) {
    const defaultConfig: ArchiveConfig = {
      enabled: true,
      autoArchive: {
        enabled: true,
        criteria: 'hybrid',
        ageDays: 30,
        keepCount: 10,
        schedule: 'manual',
      },
      knowledge: {
        extractOnComplete: false,
        categories: ['lessons', 'patterns', 'anti-patterns', 'metrics'],
        aggregateOnExtraction: false,
      },
      migration: {
        completed: true,
        backupPath: 'planning/sprint-index-pre-migration.yaml.backup',
      },
    };

    const config = {
      archive: {
        ...defaultConfig,
        ...overrides,
      },
    };

    await writeFile(
      join(testDir, 'planning', 'archive-config.yaml'),
      stringifyYaml(config)
    );
  }

  /**
   * Helper to create completed sprint with specific completion date
   */
  async function createCompletedSprint(
    title: string,
    daysAgo: number
  ): Promise<string> {
    // Start sprint (creates in worktree - unified model)
    const startResult = await startSprintTool({
      title,
      goal: 'Test',
      owner: 'test',
    });

    const sprintId = startResult.content[0].text.match(/sprint-\d+-\w+/)![0];
    const worktreeSprintDir = join(testDir, '.worktrees', sprintId, 'planning', sprintId);

    // Create required artifacts in worktree
    await writeFile(
      join(worktreeSprintDir, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(worktreeSprintDir, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/1\nstatus: created'
    );

    // Update to in-progress
    await updateSprintStatusTool({ sprintId, status: 'in-progress' });

    // Complete sprint
    await completeSprintTool({
      sprintId,
      completionMode: 'forced',
      pr: 'https://github.com/test/repo/pull/1',
    });

    // Simulate PR merge (copy from worktree to planning/active/)
    const { cp } = await import('fs/promises');
    const activeSprintDir = join(testDir, 'planning', 'active', sprintId);
    await cp(worktreeSprintDir, activeSprintDir, { recursive: true });
    await rm(join(testDir, '.worktrees', sprintId), { recursive: true, force: true });
    await regenerateSprintIndexTool({});

    // Manually update completedAt to simulate old sprint (in active/ dir now)
    const completedAt = new Date(
      Date.now() - daysAgo * 24 * 60 * 60 * 1000
    ).toISOString();

    const manifestPath = join(activeSprintDir, 'sprint-manifest.yaml');
    const manifestContent = await import('fs/promises').then((fs) =>
      fs.readFile(manifestPath, 'utf-8')
    );
    const updatedManifest = manifestContent.replace(
      /completedAt: .*/,
      `completedAt: ${completedAt}`
    );
    await writeFile(manifestPath, updatedManifest);

    // Update sprint index as well
    const indexPath = join(testDir, 'planning', 'sprint-index.yaml');
    const indexContent = await import('fs/promises').then((fs) =>
      fs.readFile(indexPath, 'utf-8')
    );
    const updatedIndex = indexContent.replace(
      new RegExp(`(id: ${sprintId}[\\s\\S]*?completedAt: )[^\\n]*`),
      `$1${completedAt}`
    );
    await writeFile(indexPath, updatedIndex);

    return sprintId;
  }

  describe('configuration validation', () => {
    it('should error if archive config not found', async () => {
      const result = await autoArchiveSprintsTool({ dryRun: true });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Archive configuration not found');
      expect(result.content[0].text).toContain('npm run migrate:archive');
    });

    it('should error if archive system disabled', async () => {
      await createArchiveConfig({ enabled: false });

      const result = await autoArchiveSprintsTool({ dryRun: true });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Archive system is disabled');
      expect(result.content[0].text).toContain('archive.enabled: true');
    });
  });

  describe('age criteria', () => {
    beforeEach(async () => {
      await createArchiveConfig();
    });

    it('should find no eligible sprints when all are recent', async () => {
      // Create sprints completed 10 and 20 days ago
      await createCompletedSprint('Sprint 1', 10);
      await createCompletedSprint('Sprint 2', 20);

      // Use age criteria with 30-day threshold
      const result = await autoArchiveSprintsTool({
        criteria: 'age',
        ageDays: 30,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No sprints eligible');
      expect(result.content[0].text).toContain('**Eligible for archival**: 0');
    });

    it('should find eligible sprints older than threshold', async () => {
      // Create sprints: 10 days, 20 days, 40 days, 50 days old
      await createCompletedSprint('Sprint 1', 10);
      await createCompletedSprint('Sprint 2', 20);
      const sprint3 = await createCompletedSprint('Sprint 3', 40);
      const sprint4 = await createCompletedSprint('Sprint 4', 50);

      // Use age criteria with 30-day threshold
      const result = await autoArchiveSprintsTool({
        criteria: 'age',
        ageDays: 30,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Would archive 2 sprints');
      expect(result.content[0].text).toContain(sprint3);
      expect(result.content[0].text).toContain(sprint4);
      expect(result.content[0].text).toContain('**Criteria**: age');
      expect(result.content[0].text).toContain('Age threshold: 30 days');
    });
  });

  describe('count criteria', () => {
    beforeEach(async () => {
      await createArchiveConfig();
    });

    it('should keep only the most recent sprints', async () => {
      // Create 5 sprints: 10, 20, 30, 40, 50 days old
      const sprint1 = await createCompletedSprint('Sprint 1', 10); // Keep (most recent)
      const sprint2 = await createCompletedSprint('Sprint 2', 20); // Keep
      await createCompletedSprint('Sprint 3', 30); // Keep
      const sprint4 = await createCompletedSprint('Sprint 4', 40); // Archive
      const sprint5 = await createCompletedSprint('Sprint 5', 50); // Archive

      // Keep only 3 most recent
      const result = await autoArchiveSprintsTool({
        criteria: 'count',
        keepCount: 3,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Would archive 2 sprints');
      expect(result.content[0].text).toContain(sprint4);
      expect(result.content[0].text).toContain(sprint5);
      expect(result.content[0].text).not.toContain(sprint1);
      expect(result.content[0].text).not.toContain(sprint2);
      expect(result.content[0].text).toContain('**Criteria**: count');
      expect(result.content[0].text).toContain('Keep count: 3 sprints');
    });

    it('should find no eligible sprints when under keepCount', async () => {
      // Create 2 sprints
      await createCompletedSprint('Sprint 1', 10);
      await createCompletedSprint('Sprint 2', 20);

      // Keep 5 sprints
      const result = await autoArchiveSprintsTool({
        criteria: 'count',
        keepCount: 5,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No sprints eligible');
      expect(result.content[0].text).toContain('**Eligible for archival**: 0');
    });
  });

  describe('hybrid criteria', () => {
    beforeEach(async () => {
      await createArchiveConfig();
    });

    it('should require both age AND count criteria', async () => {
      // Create 5 sprints
      await createCompletedSprint('Sprint 1', 10); // Recent, within keep count -> Keep
      await createCompletedSprint('Sprint 2', 20); // Recent, within keep count -> Keep
      await createCompletedSprint('Sprint 3', 35); // Old, within keep count -> Keep (hybrid)
      const sprint4 = await createCompletedSprint('Sprint 4', 40); // Old, outside keep count -> Archive
      const sprint5 = await createCompletedSprint('Sprint 5', 50); // Old, outside keep count -> Archive

      // Hybrid: age > 30 days AND outside top 3
      const result = await autoArchiveSprintsTool({
        criteria: 'hybrid',
        ageDays: 30,
        keepCount: 3,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Would archive 2 sprints');
      expect(result.content[0].text).toContain(sprint4);
      expect(result.content[0].text).toContain(sprint5);
      expect(result.content[0].text).toContain('**Criteria**: hybrid');
      expect(result.content[0].text).toContain('Age threshold: 30 days');
      expect(result.content[0].text).toContain('Keep count: 3 sprints');
    });

    it('should find no eligible sprints when criteria not met', async () => {
      // Create 3 sprints all within 30 days
      await createCompletedSprint('Sprint 1', 10);
      await createCompletedSprint('Sprint 2', 20);
      await createCompletedSprint('Sprint 3', 25);

      // Hybrid: age > 30 AND outside top 2
      const result = await autoArchiveSprintsTool({
        criteria: 'hybrid',
        ageDays: 30,
        keepCount: 2,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No sprints eligible');
      // Sprint 3 is outside keepCount but not old enough
      // No sprints meet both criteria
    });
  });

  describe('dry-run mode', () => {
    beforeEach(async () => {
      await createArchiveConfig();
    });

    it('should preview without archiving', async () => {
      // Create old sprints
      const sprint1 = await createCompletedSprint('Sprint 1', 40);
      const sprint2 = await createCompletedSprint('Sprint 2', 50);

      const result = await autoArchiveSprintsTool({
        criteria: 'age',
        ageDays: 30,
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Dry-run: Auto-archive preview');
      expect(result.content[0].text).toContain('Would archive 2 sprints');
      expect(result.content[0].text).toContain(sprint1);
      expect(result.content[0].text).toContain(sprint2);
      expect(result.content[0].text).toContain('Run without dry-run flag');

      // Verify sprints still in active/
      const activeSprints = await import('fs/promises').then((fs) =>
        fs.readdir(join(testDir, 'planning', 'active'))
      );
      expect(activeSprints).toContain(sprint1);
      expect(activeSprints).toContain(sprint2);
    });
  });

  describe('actual archival', () => {
    beforeEach(async () => {
      await createArchiveConfig();
      await mkdir(join(testDir, 'planning', 'knowledge'), { recursive: true });
    });

    it('should archive eligible sprints', async () => {
      // Create old sprints
      const sprint1 = await createCompletedSprint('Sprint 1', 40);
      const sprint2 = await createCompletedSprint('Sprint 2', 50);

      const result = await autoArchiveSprintsTool({
        criteria: 'age',
        ageDays: 30,
        dryRun: false,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Auto-archived 2 sprints');
      expect(result.content[0].text).toContain(sprint1);
      expect(result.content[0].text).toContain(sprint2);
      expect(result.content[0].text).toContain('Eligible: 2');
      expect(result.content[0].text).toContain('Archived: 2');
      expect(result.content[0].text).toContain('Failed: 0');

      // Verify sprints moved to archive/
      const activeSprints = await import('fs/promises').then((fs) =>
        fs.readdir(join(testDir, 'planning', 'active'))
      );
      expect(activeSprints).not.toContain(sprint1);
      expect(activeSprints).not.toContain(sprint2);

      const archiveYear = new Date().getFullYear();
      const archivedSprints = await import('fs/promises').then((fs) =>
        fs.readdir(join(testDir, 'planning', 'archive', String(archiveYear)))
      );
      expect(archivedSprints).toContain(sprint1);
      expect(archivedSprints).toContain(sprint2);
    });

    it('should use config defaults when no args provided', async () => {
      // Update config with specific defaults
      await createArchiveConfig({
        autoArchive: {
          enabled: true,
          criteria: 'age',
          ageDays: 35,
          keepCount: 10,
          schedule: 'manual',
        },
      });

      // Create sprints: 30 and 40 days old
      await createCompletedSprint('Sprint 1', 30); // Not old enough (< 35)
      const sprint2 = await createCompletedSprint('Sprint 2', 40); // Old enough (> 35)

      // Call with no criteria specified - should use config defaults
      const result = await autoArchiveSprintsTool({
        dryRun: true,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Would archive 1 sprint');
      expect(result.content[0].text).toContain(sprint2);
      expect(result.content[0].text).toContain('**Criteria**: age'); // From config
      expect(result.content[0].text).toContain('Age threshold: 35 days'); // From config
    });
  });
});
