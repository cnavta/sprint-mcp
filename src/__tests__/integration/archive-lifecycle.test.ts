/**
 * Integration test for full archive lifecycle
 *
 * Tests the complete workflow: start-sprint → complete-sprint → archive-sprint
 * with archive system enabled. Verifies:
 * - Sprint starts in active/
 * - Sprint completes successfully
 * - Sprint archives to archive/{year}/
 * - Sprint index updates correctly
 * - Check-sprint-status excludes archived sprints
 */

import { startSprintTool } from '../../tools/start-sprint.js';
import { updateSprintStatusTool } from '../../tools/update-sprint-status.js';
import { completeSprintTool } from '../../tools/complete-sprint.js';
import { archiveSprintTool } from '../../tools/archive-sprint.js';
import { checkSprintStatusTool } from '../../tools/check-sprint-status.js';
import { regenerateSprintIndexTool } from '../../tools/regenerate-sprint-index.js';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import type { ArchiveConfig } from '../../types/archive-config.js';
import type { SprintIndex } from '../../types/sprint-index.js';

describe('archive-lifecycle - Full Workflow Integration Test', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-lifecycle-'));
    process.chdir(testDir);

    // Initialize git repository (required for start-sprint)
    execSync('git init', { cwd: testDir });
    execSync('git config user.name "Test User"', { cwd: testDir });
    execSync('git config user.email "test@example.com"', { cwd: testDir });
    execSync('touch README.md && git add README.md && git commit -m "Initial commit"',
      { cwd: testDir }
    );

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

  it('should complete full lifecycle: start → complete → archive', async () => {
    // ================================================================
    // STEP 1: Start Sprint (creates in planning/active/)
    // ================================================================
    const startResult = await startSprintTool({
      title: 'Archive Lifecycle Test Sprint',
      goal: 'Test full archive lifecycle workflow',
      owner: 'test-owner',
    });

    expect(startResult.isError).toBeFalsy();
    expect(startResult.content[0].text).toContain('✅');

    // Extract sprint ID from result
    const sprintIdMatch = startResult.content[0].text.match(/sprint-\d+-\w+/);
    expect(sprintIdMatch).toBeTruthy();
    const sprintId = sprintIdMatch![0];

    // Verify sprint created in active/
    const activeSprintPath = join(testDir, 'planning', 'active', sprintId);
    const activeManifest = await readFile(
      join(activeSprintPath, 'sprint-manifest.yaml'),
      'utf-8'
    );
    expect(activeManifest).toContain(sprintId);

    // Verify index shows active path
    let indexContent = await readFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      'utf-8'
    );
    let index = parseYaml(indexContent) as SprintIndex;
    expect(index.sprints[0].manifestPath).toContain(`planning/active/${sprintId}`);
    expect(index.activeSprints).toBe(1);
    expect(index.completedSprints).toBe(0);

    // ================================================================
    // STEP 2: Update Sprint Status to in-progress
    // ================================================================
    const updateResult = await updateSprintStatusTool({
      sprintId,
      status: 'in-progress',
    });

    expect(updateResult.isError).toBeFalsy();
    expect(updateResult.content[0].text).toContain('✅');

    // ================================================================
    // STEP 3: Create Completion Artifacts
    // ================================================================
    await writeFile(
      join(activeSprintPath, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(activeSprintPath, 'retro.md'),
      '# Retrospective\n\nWhat worked well: Everything\nWhat to improve: Nothing'
    );
    await writeFile(
      join(activeSprintPath, 'key-learnings.md'),
      '# Key Learnings\n\n- Archive lifecycle works correctly'
    );
    await writeFile(
      join(activeSprintPath, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/1\nstatus: created'
    );

    // ================================================================
    // STEP 4: Complete Sprint
    // ================================================================
    const completeResult = await completeSprintTool({
      sprintId,
      completionMode: 'normal',
      pr: 'https://github.com/test/repo/pull/1',
    });

    expect(completeResult.isError).toBeFalsy();
    expect(completeResult.content[0].text).toContain('✅');
    expect(completeResult.content[0].text).toContain('completed successfully');

    // Verify sprint still in active/ but marked as complete
    const activeManifest2 = await readFile(
      join(activeSprintPath, 'sprint-manifest.yaml'),
      'utf-8'
    );
    expect(activeManifest2).toContain(sprintId);

    indexContent = await readFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      'utf-8'
    );
    index = parseYaml(indexContent) as SprintIndex;
    expect(index.sprints[0].status).toBe('complete');
    expect(index.activeSprints).toBe(0);
    expect(index.completedSprints).toBe(1);

    // ================================================================
    // STEP 5: Check Sprint Status (should show no active sprints)
    // ================================================================
    const statusResult = await checkSprintStatusTool({});

    expect(statusResult.isError).toBeFalsy();
    expect(statusResult.content[0].text).toContain('✅');
    expect(statusResult.content[0].text).toContain('No active sprints');

    // ================================================================
    // STEP 6: Archive Sprint (move to archive/2026/)
    // ================================================================
    const archiveResult = await archiveSprintTool({
      sprintId,
      dryRun: false,
    });

    expect(archiveResult.isError).toBeFalsy();
    expect(archiveResult.content[0].text).toContain('✅');
    expect(archiveResult.content[0].text).toContain('archived successfully');
    expect(archiveResult.content[0].text).toContain('Archive Year: 2026');

    // Verify sprint moved from active/ to archive/2026/
    await expect(async () => {
      await readFile(join(activeSprintPath, 'sprint-manifest.yaml'));
    }).rejects.toThrow();

    const archivePath = join(testDir, 'planning', 'archive', '2026', sprintId);
    const archivedManifest = await readFile(
      join(archivePath, 'sprint-manifest.yaml'),
      'utf-8'
    );
    expect(archivedManifest).toContain(sprintId);

    // Verify all artifacts moved with sprint
    const verificationReport = await readFile(
      join(archivePath, 'verification-report.md'),
      'utf-8'
    );
    expect(verificationReport).toContain('All deliverables completed');

    // Verify index updated to archive path
    indexContent = await readFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      'utf-8'
    );
    index = parseYaml(indexContent) as SprintIndex;
    expect(index.sprints[0].manifestPath).toBe(
      `planning/archive/2026/${sprintId}/sprint-manifest.yaml`
    );

    // ================================================================
    // STEP 7: Regenerate Index (verify archive sprint found)
    // ================================================================
    const regenerateResult = await regenerateSprintIndexTool({
      repair: false,
    });

    expect(regenerateResult.isError).toBeFalsy();
    expect(regenerateResult.content[0].text).toContain('✅');
    expect(regenerateResult.content[0].text).toContain('1 total');

    indexContent = await readFile(
      join(testDir, 'planning', 'sprint-index.yaml'),
      'utf-8'
    );
    index = parseYaml(indexContent) as SprintIndex;
    expect(index.totalSprints).toBe(1);
    expect(index.completedSprints).toBe(1);
    expect(index.sprints[0].manifestPath).toContain('planning/archive/2026/');

    // ================================================================
    // STEP 8: Check Sprint Status Again (should still show no active)
    // ================================================================
    const statusResult2 = await checkSprintStatusTool({});

    expect(statusResult2.isError).toBeFalsy();
    // After archiving, no active sprints remain
    expect(statusResult2.content[0].text).toContain('No');
  });

  it('should handle archive with dry-run before actual archive', async () => {
    // Start and complete a sprint
    const startResult = await startSprintTool({
      title: 'Dry-Run Test Sprint',
      goal: 'Test dry-run mode',
      owner: 'test-owner',
    });

    const sprintIdMatch = startResult.content[0].text.match(/sprint-\d+-\w+/);
    const sprintId = sprintIdMatch![0];

    await updateSprintStatusTool({
      sprintId,
      status: 'in-progress',
    });

    const activeSprintPath = join(testDir, 'planning', 'active', sprintId);
    await writeFile(join(activeSprintPath, 'verification-report.md'), '# Verification');
    await writeFile(join(activeSprintPath, 'retro.md'), '# Retro');
    await writeFile(join(activeSprintPath, 'key-learnings.md'), '# Learnings');
    await writeFile(join(activeSprintPath, 'publication.yaml'), 'pr: null');

    await completeSprintTool({
      sprintId,
      completionMode: 'normal',
    });

    // ================================================================
    // Dry-run archive (should not move files)
    // ================================================================
    const dryRunResult = await archiveSprintTool({
      sprintId,
      dryRun: true,
    });

    expect(dryRunResult.isError).toBeFalsy();
    expect(dryRunResult.content[0].text).toContain('🔍');
    expect(dryRunResult.content[0].text).toContain('Dry-run');

    // Verify sprint NOT moved
    const activeManifest = await readFile(
      join(activeSprintPath, 'sprint-manifest.yaml'),
      'utf-8'
    );
    expect(activeManifest).toContain(sprintId);

    // ================================================================
    // Actual archive (should move files)
    // ================================================================
    const archiveResult = await archiveSprintTool({
      sprintId,
      dryRun: false,
    });

    expect(archiveResult.isError).toBeFalsy();
    expect(archiveResult.content[0].text).toContain('✅');

    // Verify sprint moved
    await expect(async () => {
      await readFile(join(activeSprintPath, 'sprint-manifest.yaml'));
    }).rejects.toThrow();

    const archivePath = join(testDir, 'planning', 'archive', '2026', sprintId);
    const archivedManifest = await readFile(
      join(archivePath, 'sprint-manifest.yaml'),
      'utf-8'
    );
    expect(archivedManifest).toContain(sprintId);
  });
});
