/**
 * Tests for check-sprint-status tool
 */

import { jest } from '@jest/globals';
import { checkSprintStatusTool } from '../check-sprint-status.js';
import {
  createActiveManifest,
  createPlanningManifest,
  isValidMCPResponse,
  extractResponseText,
} from './test-helpers.js';

// Mock the file-utils module
jest.unstable_mockModule('../../common/file-utils.js', () => ({
  listDirectories: jest.fn(),
  fileExists: jest.fn(),
  readFile: jest.fn(),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
}));

// Mock the logger module
jest.unstable_mockModule('../../common/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocked modules
const fileUtils = await import('../../common/file-utils.js');
const { logger } = await import('../../common/logger.js');

describe('checkSprintStatusTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No sprints scenario', () => {
    it('should return success message when no sprint directories exist', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([]);

      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.isError).toBeUndefined();

      const text = extractResponseText(result);
      expect(text).toContain('No sprints found');
      expect(text).toContain('start a new sprint');
    });

    it('should log info message', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([]);

      await checkSprintStatusTool({});

      expect(logger.info).toHaveBeenCalledWith('Checking sprint status...');
      expect(logger.info).toHaveBeenCalledWith('No sprints found');
    });
  });

  describe('Single active sprint scenario', () => {
    it('should detect and report one active sprint', async () => {
      const activeManifest = createActiveManifest(1);
      const manifestYaml = `id: ${activeManifest.id}
title: ${activeManifest.title}
goal: ${activeManifest.goal}
owner: ${activeManifest.owner}
createdAt: ${activeManifest.createdAt}
status: in-progress
links:
  branch: ${activeManifest.links?.branch || 'N/A'}
notes: ${activeManifest.notes}`;

      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any).mockResolvedValue(manifestYaml);

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
      const manifestYaml = `id: ${activeManifest.id}
status: in-progress
title: Test
goal: Test goal
owner: owner
createdAt: 2026-01-01T00:00:00Z`;

      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any).mockResolvedValue(manifestYaml);

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

      const yaml1 = `id: ${activeManifest1.id}
status: in-progress
title: Sprint 1
goal: Goal 1
owner: owner
createdAt: 2026-01-01T00:00:00Z`;

      const yaml2 = `id: ${activeManifest2.id}
status: planning
title: Sprint 2
goal: Goal 2
owner: owner
createdAt: 2026-01-02T00:00:00Z`;

      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
        '/path/to/planning/sprint-2-test2',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any)
        .mockResolvedValueOnce(yaml1)
        .mockResolvedValueOnce(yaml2);

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('Found 2 active sprint');
      expect(text).toContain('Multiple active sprints detected');
      expect(text).toContain('Sprint Protocol rule S3');
    });
  });

  describe('Completed sprints scenario', () => {
    it('should count completed sprints correctly', async () => {
      const completedYaml = `id: sprint-1-test1
status: complete
title: Completed Sprint
goal: Goal
owner: owner
createdAt: 2026-01-01T00:00:00Z`;

      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any).mockResolvedValue(completedYaml);

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('No active sprints');
      expect(text).toContain('Ready to start a new sprint');
      expect(text).toContain('Completed sprints: 1');
    });

    it('should handle mix of active and completed sprints', async () => {
      const activeYaml = `id: sprint-2-test2
status: in-progress
title: Active Sprint
goal: Goal
owner: owner
createdAt: 2026-01-02T00:00:00Z`;

      const completedYaml = `id: sprint-1-test1
status: complete
title: Completed Sprint
goal: Goal
owner: owner
createdAt: 2026-01-01T00:00:00Z`;

      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
        '/path/to/planning/sprint-2-test2',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any)
        .mockResolvedValueOnce(completedYaml)
        .mockResolvedValueOnce(activeYaml);

      const result = await checkSprintStatusTool({});
      const text = extractResponseText(result);

      expect(text).toContain('Found 1 active sprint');
      expect(text).toContain('Completed sprints: 1');
    });
  });

  describe('Error handling', () => {
    it('should handle missing manifest files gracefully', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(false);

      const result = await checkSprintStatusTool({});

      expect(isValidMCPResponse(result)).toBe(true);
      const text = extractResponseText(result);
      expect(text).toContain('No active sprints');
    });

    it('should handle invalid YAML gracefully', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any).mockResolvedValue('invalid: yaml: content:');

      const result = await checkSprintStatusTool({});

      // Should still return valid response even if YAML parsing fails
      expect(isValidMCPResponse(result)).toBe(true);
    });

    it('should handle file read errors', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([
        '/path/to/planning/sprint-1-test1',
      ]);
      (fileUtils.fileExists as any).mockResolvedValue(true);
      (fileUtils.readFile as any).mockRejectedValue(new Error('File read error'));

      const result = await checkSprintStatusTool({});

      // Should still return valid response even if file read fails
      expect(isValidMCPResponse(result)).toBe(true);
    });
  });

  describe('Response format', () => {
    it('should always return valid MCP response format', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([]);

      const result = await checkSprintStatusTool({});

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should not set isError flag on success', async () => {
      (fileUtils.listDirectories as any).mockResolvedValue([]);

      const result = await checkSprintStatusTool({});

      expect(result.isError).toBeUndefined();
    });
  });
});
