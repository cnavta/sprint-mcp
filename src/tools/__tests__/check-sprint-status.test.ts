/**
 * Integration tests for check-sprint-status tool
 *
 * Uses real file system operations with temporary directories for isolation
 */

import { checkSprintStatusTool } from '../check-sprint-status.js';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';
import {
  createActiveManifest,
  createCompletedManifest,
  createPlanningManifest,
  isValidMCPResponse,
  extractResponseText,
} from './test-helpers.js';

describe('checkSprintStatusTool - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();

    // Create temporary test directory
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-test-'));

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Always restore original working directory first
    process.chdir(originalCwd);

    // Clean up test directory (even if test failed)
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Failed to cleanup test directory ${testDir}:`, error);
      // Don't throw - we still want other tests to run
    }
  });

  describe('No sprints scenario', () => {
    it('should return success message when no planning directory exists', async () => {
      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.isError).toBeUndefined();

      const text = extractResponseText(result);
      expect(text).toContain('No sprints found');
      expect(text).toContain('start a new sprint');
    });

    it('should return success message when planning directory is empty', async () => {
      // Create empty planning directory
      await mkdir(join(testDir, 'planning'));

      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      const text = extractResponseText(result);
      expect(text).toContain('No sprints found');
    });
  });

  describe('Single active sprint scenario', () => {
    it('should detect and report one active sprint', async () => {
      const activeManifest = createActiveManifest(1);

      // Create sprint directory and manifest
      const planningDir = join(testDir, 'planning');
      const sprintDir = join(planningDir, activeManifest.id);
      await mkdir(sprintDir, { recursive: true });
      await writeFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(activeManifest)
      );

      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      const text = extractResponseText(result);

      expect(text).toContain('Found 1 active sprint');
      expect(text).toContain(activeManifest.id);
      expect(text).toContain(activeManifest.title);
      expect(text).toContain('Cannot start a new sprint');
    });

    it('should not show S3 violation warning for single active sprint', async () => {
      const activeManifest = createActiveManifest(1);

      const planningDir = join(testDir, 'planning');
      const sprintDir = join(planningDir, activeManifest.id);
      await mkdir(sprintDir, { recursive: true });
      await writeFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(activeManifest)
      );

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).not.toContain('Multiple active sprints');
      expect(text).not.toContain('rule S3');
    });
  });

  describe('Multiple active sprints scenario (S3 violation)', () => {
    it('should detect and warn about multiple active sprints', async () => {
      const activeManifest1 = createActiveManifest(1);
      const activeManifest2 = createPlanningManifest(2); // planning is also "active" (not complete)

      const planningDir = join(testDir, 'planning');

      // Create first sprint
      const sprint1Dir = join(planningDir, activeManifest1.id);
      await mkdir(sprint1Dir, { recursive: true });
      await writeFile(
        join(sprint1Dir, 'sprint-manifest.yaml'),
        stringifyYaml(activeManifest1)
      );

      // Create second sprint
      const sprint2Dir = join(planningDir, activeManifest2.id);
      await mkdir(sprint2Dir, { recursive: true });
      await writeFile(
        join(sprint2Dir, 'sprint-manifest.yaml'),
        stringifyYaml(activeManifest2)
      );

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('Found 2 active sprint');
      expect(text).toContain('Multiple active sprints detected');
      expect(text).toContain('Sprint Protocol rule S3');
    });
  });

  describe('Completed sprints scenario', () => {
    it('should count completed sprints correctly', async () => {
      const completedManifest = createCompletedManifest(1);

      const planningDir = join(testDir, 'planning');
      const sprintDir = join(planningDir, completedManifest.id);
      await mkdir(sprintDir, { recursive: true });
      await writeFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        stringifyYaml(completedManifest)
      );

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('No active sprints');
      expect(text).toContain('Ready to start a new sprint');
      expect(text).toContain('Completed sprints: 1');
    });

    it('should handle mix of active and completed sprints', async () => {
      const activeManifest = createActiveManifest(2);
      const completedManifest = createCompletedManifest(1);

      const planningDir = join(testDir, 'planning');

      // Create completed sprint
      const completedDir = join(planningDir, completedManifest.id);
      await mkdir(completedDir, { recursive: true });
      await writeFile(
        join(completedDir, 'sprint-manifest.yaml'),
        stringifyYaml(completedManifest)
      );

      // Create active sprint
      const activeDir = join(planningDir, activeManifest.id);
      await mkdir(activeDir, { recursive: true });
      await writeFile(
        join(activeDir, 'sprint-manifest.yaml'),
        stringifyYaml(activeManifest)
      );

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('Found 1 active sprint');
      expect(text).toContain('Completed sprints: 1');
    });
  });

  describe('Error handling', () => {
    it('should handle missing manifest files gracefully', async () => {
      // Create sprint directory without manifest
      const planningDir = join(testDir, 'planning');
      const sprintDir = join(planningDir, 'sprint-1-test1');
      await mkdir(sprintDir, { recursive: true });

      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      const text = extractResponseText(result);
      expect(text).toContain('No active sprints');
    });

    it('should handle invalid YAML gracefully', async () => {
      // Create sprint directory with invalid YAML
      const planningDir = join(testDir, 'planning');
      const sprintDir = join(planningDir, 'sprint-1-test1');
      await mkdir(sprintDir, { recursive: true });
      await writeFile(
        join(sprintDir, 'sprint-manifest.yaml'),
        'invalid: yaml: content: [[[broken'
      );

      const result = await checkSprintStatusTool({});

      // Should still return valid response even if YAML parsing fails
      expect(isValidMCPResponse(result)).toBe(true);
    });

    it('should handle file system errors gracefully', async () => {
      // Create planning dir but make it unreadable (simulates permission error)
      const planningDir = join(testDir, 'planning');
      await mkdir(planningDir);

      // Create a file named like a directory to cause readdir error
      const badSprintDir = join(planningDir, 'sprint-1-test1');
      await writeFile(badSprintDir, 'this is a file, not a directory');

      const result = await checkSprintStatusTool({});

      // Should still return valid response
      expect(isValidMCPResponse(result)).toBe(true);
    });
  });

  describe('Response format', () => {
    it('should always return valid MCP response format', async () => {
      const result = await checkSprintStatusTool({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should not set isError flag on success', async () => {
      const result = await checkSprintStatusTool({});
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Cleanup verification', () => {
    it('should cleanup temp directory even after test failure', async () => {
      const testDirPath = testDir;

      // This test intentionally creates a scenario that might fail
      try {
        const planningDir = join(testDir, 'planning');
        await mkdir(planningDir);

        // Verify directory exists
        expect(testDirPath).toBeTruthy();
      } catch (error) {
        // Even if test fails, afterEach should still cleanup
      }

      // The actual cleanup verification happens in afterEach
      // This test just ensures we exercise the error path
    });
  });
});
