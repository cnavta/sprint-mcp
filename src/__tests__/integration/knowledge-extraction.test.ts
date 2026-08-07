/**
 * Knowledge Extraction System - Integration Test
 *
 * Tests the complete knowledge extraction workflow:
 * 1. Create sprint with knowledge artifacts
 * 2. Complete sprint
 * 3. Archive sprint (triggers extraction)
 * 4. Verify knowledge base updated
 */

import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { startSprintTool } from '../../tools/start-sprint.js';
import { updateSprintStatusTool } from '../../tools/update-sprint-status.js';
import { completeSprintTool } from '../../tools/complete-sprint.js';
import { archiveSprintTool } from '../../tools/archive-sprint.js';
import { regenerateSprintIndexTool } from '../../tools/regenerate-sprint-index.js';
import type { KnowledgeBase } from '../../types/knowledge.js';
import type { ArchiveConfig } from '../../types/archive-config.js';

describe('Knowledge Extraction - Integration Test', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original directory
    originalCwd = process.cwd();

    // Create isolated test directory
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-knowledge-test-'));
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
    await mkdir(join(testDir, 'planning', 'knowledge'), { recursive: true });

    // Create archive-config.yaml with knowledge extraction enabled
    const archiveConfig = {
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
          extractOnComplete: true,
          categories: ['lessons', 'patterns', 'anti-patterns', 'metrics'],
          aggregateOnExtraction: true,
        },
        migration: {
          completed: true,
          backupPath: 'planning/sprint-index-pre-migration.yaml.backup',
        },
      } as ArchiveConfig,
    };

    await writeFile(
      join(testDir, 'planning', 'archive-config.yaml'),
      stringifyYaml(archiveConfig)
    );
  });

  afterEach(async () => {
    // Restore original directory
    process.chdir(originalCwd);

    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  it('should extract and aggregate knowledge when archiving sprint', async () => {
    // Step 1: Start a sprint
    const startResult = await startSprintTool({
      title: 'Knowledge Extraction Test Sprint',
      goal: 'Test knowledge extraction workflow',
      owner: 'test-owner',
    });

    expect(startResult.isError).toBeFalsy();

    const sprintIdMatch = startResult.content[0].text.match(/sprint-\d+-\w+/);
    expect(sprintIdMatch).not.toBeNull();
    const sprintId = sprintIdMatch![0];

    // Step 2: Create knowledge artifacts in sprint directory (in worktree)
    const sprintDir = join(testDir, '.worktrees', sprintId, 'planning', sprintId);

    // Create key-learnings.md
    const keyLearningsContent = `# Key Learnings

## Technical

- Always validate TypeScript input types before processing
- Use strict mode to catch errors early
- Implement comprehensive error handling

## Process

- Run dry-run before destructive operations
- Document decisions in sprint artifacts
- Maintain changelog for all changes
`;

    await writeFile(
      join(sprintDir, 'key-learnings.md'),
      keyLearningsContent
    );

    // Create retro.md
    const retroContent = `# Sprint Retrospective

## What Went Well

- Archive system implementation was smooth
- All tests passing from the start
- Good documentation practices

## What to Improve

- Need better error messages in validation
- Test coverage could be higher

## Action Items

- Add more integration tests
- Improve logging verbosity
`;

    await writeFile(join(sprintDir, 'retro.md'), retroContent);

    // Create SPRINT_COMPLETE.md
    const completeSummary = `# Sprint Complete

## Achievements

- Implemented knowledge extraction system
- Added comprehensive test suite
- Integrated with archive tool
`;

    await writeFile(join(sprintDir, 'SPRINT_COMPLETE.md'), completeSummary);

    // Create required completion artifacts
    await writeFile(
      join(sprintDir, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(sprintDir, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/1\nstatus: created'
    );

    // Step 3: Update sprint status to in-progress
    await updateSprintStatusTool({
      sprintId,
      status: 'in-progress',
    });

    // Step 4: Complete the sprint
    const completeResult = await completeSprintTool({
      sprintId,
      completionMode: 'normal',
      pr: 'https://github.com/test/repo/pull/1',
    });

    expect(completeResult.isError).toBeFalsy();

    // Step 4.5: Simulate PR merge (copy from worktree to planning/active/)
    const { cp } = await import('fs/promises');
    const activeSprintDir = join(testDir, 'planning', 'active', sprintId);
    await cp(sprintDir, activeSprintDir, { recursive: true });
    await rm(join(testDir, '.worktrees', sprintId), { recursive: true, force: true });
    await regenerateSprintIndexTool({});

    // Step 5: Archive the sprint (triggers knowledge extraction)
    const archiveResult = await archiveSprintTool({
      sprintId,
      dryRun: false,
    });

    expect(archiveResult.isError).toBeFalsy();
    expect(archiveResult.content[0].text).toContain('archived successfully');

    // Verify knowledge was extracted
    expect(archiveResult.content[0].text).toMatch(/Extracted knowledge:/);
    expect(archiveResult.content[0].text).toMatch(/lessons/);
    expect(archiveResult.content[0].text).toMatch(/patterns/);

    // Step 6: Verify knowledge base was created and populated
    const knowledgeBasePath = join(
      testDir,
      'planning',
      'knowledge',
      'knowledge-base.yaml'
    );

    const knowledgeBaseContent = await readFile(knowledgeBasePath, 'utf-8');
    const knowledgeBase = parseYaml(knowledgeBaseContent) as KnowledgeBase;

    // Verify structure
    expect(knowledgeBase).toHaveProperty('lessons');
    expect(knowledgeBase).toHaveProperty('patterns');
    expect(knowledgeBase).toHaveProperty('antiPatterns');
    expect(knowledgeBase).toHaveProperty('metrics');
    expect(knowledgeBase).toHaveProperty('lastUpdated');
    expect(knowledgeBase).toHaveProperty('sprintCount');
    expect(knowledgeBase).toHaveProperty('version');

    // Verify lessons extracted
    expect(knowledgeBase.lessons.length).toBeGreaterThan(0);

    // Find technical lessons from key-learnings.md
    const technicalLessons = knowledgeBase.lessons.filter(
      (l) => l.category === 'technical'
    );
    expect(technicalLessons.length).toBeGreaterThan(0);

    // Verify specific lesson content
    const validateLesson = knowledgeBase.lessons.find((l) =>
      l.content.toLowerCase().includes('validate')
    );
    expect(validateLesson).toBeDefined();
    expect(validateLesson?.sprintId).toBe(sprintId);
    expect(validateLesson?.frequency).toBe(1);

    // Verify patterns extracted from retro
    expect(knowledgeBase.patterns.length).toBeGreaterThan(0);

    const archivePattern = knowledgeBase.patterns.find((p) =>
      p.description.toLowerCase().includes('archive')
    );
    expect(archivePattern).toBeDefined();
    expect(archivePattern?.sprintId).toBe(sprintId);

    // Verify lessons from retro "What to Improve"
    const improvementLessons = knowledgeBase.lessons.filter(
      (l) => l.context?.includes('improvement') || l.context?.includes('action')
    );
    expect(improvementLessons.length).toBeGreaterThan(0);

    // Verify sprint count
    expect(knowledgeBase.sprintCount).toBe(1);

    // Verify metrics
    expect(knowledgeBase.metrics.length).toBe(1);
    expect(knowledgeBase.metrics[0].sprintId).toBe(sprintId);
    expect(knowledgeBase.metrics[0].duration).toBeDefined();

    // Verify version
    expect(knowledgeBase.version).toBe('1.0.0');

    // Verify timestamp format
    expect(knowledgeBase.lastUpdated).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    );
  });

  it('should skip extraction when disabled in config', async () => {
    // Update config to disable knowledge extraction
    const archiveConfig = {
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
          extractOnComplete: false, // Disabled
          categories: ['lessons', 'patterns', 'anti-patterns', 'metrics'],
          aggregateOnExtraction: true,
        },
        migration: {
          completed: true,
          backupPath: 'planning/sprint-index-pre-migration.yaml.backup',
        },
      } as ArchiveConfig,
    };

    await writeFile(
      join(testDir, 'planning', 'archive-config.yaml'),
      stringifyYaml(archiveConfig)
    );

    // Start and complete a sprint
    const startResult = await startSprintTool({
      title: 'Test Sprint',
      goal: 'Test',
      owner: 'test',
    });

    const sprintId = startResult.content[0].text.match(/sprint-\d+-\w+/)![0];
    const sprintDir = join(testDir, '.worktrees', sprintId, 'planning', sprintId);

    // Create required completion artifacts (in worktree)
    await writeFile(
      join(sprintDir, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(sprintDir, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/1\nstatus: created'
    );

    await updateSprintStatusTool({ sprintId, status: 'in-progress' });
    await completeSprintTool({
      sprintId,
      completionMode: 'forced',
      pr: 'https://github.com/test/repo/pull/1',
    });

    // Simulate PR merge
    const { cp } = await import('fs/promises');
    const activeSprintDir = join(testDir, 'planning', 'active', sprintId);
    await cp(sprintDir, activeSprintDir, { recursive: true });
    await rm(join(testDir, '.worktrees', sprintId), { recursive: true, force: true });
    await regenerateSprintIndexTool({});

    // Archive sprint
    const archiveResult = await archiveSprintTool({ sprintId, dryRun: false });

    expect(archiveResult.isError).toBeFalsy();
    expect(archiveResult.content[0].text).toContain(
      'Knowledge extraction skipped'
    );

    // Verify knowledge base was NOT created
    const knowledgeBasePath = join(
      testDir,
      'planning',
      'knowledge',
      'knowledge-base.yaml'
    );

    await expect(readFile(knowledgeBasePath)).rejects.toThrow();
  });

  it('should handle multiple sprint aggregation with deduplication', async () => {
    // Start first sprint
    const start1 = await startSprintTool({
      title: 'Sprint 1',
      goal: 'Test',
      owner: 'test',
    });
    const sprint1 = start1.content[0].text.match(/sprint-\d+-\w+/)![0];

    // Create similar knowledge artifacts for sprint 1 (in worktree)
    const sprintDir1 = join(testDir, '.worktrees', sprint1, 'planning', sprint1);
    await writeFile(
      join(sprintDir1, 'key-learnings.md'),
      `# Learnings\n- Always validate TypeScript input types\n- Use strict mode`
    );

    // Create required completion artifacts
    await writeFile(
      join(sprintDir1, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(sprintDir1, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/1\nstatus: created'
    );

    await updateSprintStatusTool({ sprintId: sprint1, status: 'in-progress' });
    await completeSprintTool({
      sprintId: sprint1,
      completionMode: 'forced',
      pr: 'https://github.com/test/repo/pull/1',
    });

    // Simulate PR merge for sprint 1
    const { cp } = await import('fs/promises');
    const activeSprintDir1 = join(testDir, 'planning', 'active', sprint1);
    await cp(sprintDir1, activeSprintDir1, { recursive: true });
    await rm(join(testDir, '.worktrees', sprint1), { recursive: true, force: true });
    await regenerateSprintIndexTool({});

    await archiveSprintTool({ sprintId: sprint1, dryRun: false });

    // Start second sprint
    const start2 = await startSprintTool({
      title: 'Sprint 2',
      goal: 'Test',
      owner: 'test',
    });
    const sprint2 = start2.content[0].text.match(/sprint-\d+-\w+/)![0];

    // Create similar knowledge artifacts for sprint 2 (should deduplicate) - in worktree
    const sprintDir2 = join(testDir, '.worktrees', sprint2, 'planning', sprint2);
    await writeFile(
      join(sprintDir2, 'key-learnings.md'),
      `# Learnings\n- Always validate TypeScript input types thoroughly\n- Document all decisions`
    );

    // Create required completion artifacts
    await writeFile(
      join(sprintDir2, 'verification-report.md'),
      '# Verification Report\n\nAll deliverables completed.'
    );
    await writeFile(
      join(sprintDir2, 'publication.yaml'),
      'pr: https://github.com/test/repo/pull/2\nstatus: created'
    );

    await updateSprintStatusTool({ sprintId: sprint2, status: 'in-progress' });
    await completeSprintTool({
      sprintId: sprint2,
      completionMode: 'forced',
      pr: 'https://github.com/test/repo/pull/2',
    });

    // Simulate PR merge for sprint 2
    const activeSprintDir2 = join(testDir, 'planning', 'active', sprint2);
    await cp(sprintDir2, activeSprintDir2, { recursive: true });
    await rm(join(testDir, '.worktrees', sprint2), { recursive: true, force: true });
    await regenerateSprintIndexTool({});

    await archiveSprintTool({ sprintId: sprint2, dryRun: false });

    // Verify knowledge base has deduplicated lessons
    const knowledgeBasePath = join(
      testDir,
      'planning',
      'knowledge',
      'knowledge-base.yaml'
    );
    const knowledgeBaseContent = await readFile(knowledgeBasePath, 'utf-8');
    const knowledgeBase = parseYaml(knowledgeBaseContent) as KnowledgeBase;

    // Find the validate lesson - should be deduplicated with frequency 2
    const validateLesson = knowledgeBase.lessons.find(
      (l) =>
        l.content.toLowerCase().includes('validate') &&
        l.content.toLowerCase().includes('typescript')
    );

    expect(validateLesson).toBeDefined();
    expect(validateLesson?.frequency).toBe(2); // Appeared in both sprints

    // Sprint count should be 2
    expect(knowledgeBase.sprintCount).toBe(2);

    // Metrics should have 2 entries
    expect(knowledgeBase.metrics.length).toBe(2);
  });
});
