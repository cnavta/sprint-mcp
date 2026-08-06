/**
 * Tests for project-config module
 *
 * Validates SPRINT_ROOT environment variable support and path resolution
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { join } from 'path';
import {
  getProjectRoot,
  getPlanningDir,
  getSprintIndexPath,
  getWorktreePath,
  getSprintDir,
  getManifestPath,
  validateSprintRoot,
  getConfigSummary,
} from '../project-config.js';

describe('project-config', () => {
  let originalSprintRoot: string | undefined;
  let originalCwd: string;

  beforeEach(() => {
    // Save original environment and working directory
    originalSprintRoot = process.env.SPRINT_ROOT;
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Restore original environment and working directory
    if (originalSprintRoot === undefined) {
      delete process.env.SPRINT_ROOT;
    } else {
      process.env.SPRINT_ROOT = originalSprintRoot;
    }
    process.chdir(originalCwd);
  });

  describe('getProjectRoot', () => {
    it('should return process.cwd() when SPRINT_ROOT is not set', () => {
      delete process.env.SPRINT_ROOT;
      const root = getProjectRoot();
      expect(root).toBe(process.cwd());
    });

    it('should return process.cwd() when SPRINT_ROOT is empty string', () => {
      process.env.SPRINT_ROOT = '';
      const root = getProjectRoot();
      expect(root).toBe(process.cwd());
    });

    it('should return process.cwd() when SPRINT_ROOT is whitespace only', () => {
      process.env.SPRINT_ROOT = '   ';
      const root = getProjectRoot();
      expect(root).toBe(process.cwd());
    });

    it('should return SPRINT_ROOT when set to absolute path', () => {
      const customRoot = '/custom/project/root';
      process.env.SPRINT_ROOT = customRoot;
      const root = getProjectRoot();
      expect(root).toBe(customRoot);
    });

    it('should throw error when SPRINT_ROOT is relative path', () => {
      process.env.SPRINT_ROOT = 'relative/path';
      expect(() => getProjectRoot()).toThrow(
        'SPRINT_ROOT must be an absolute path, got: relative/path'
      );
    });

    it('should throw error when SPRINT_ROOT is a dot path', () => {
      process.env.SPRINT_ROOT = './relative';
      expect(() => getProjectRoot()).toThrow(
        'SPRINT_ROOT must be an absolute path'
      );
    });

    it('should handle SPRINT_ROOT with trailing slash', () => {
      const customRoot = '/custom/project/';
      process.env.SPRINT_ROOT = customRoot;
      const root = getProjectRoot();
      expect(root).toBe(customRoot);
    });
  });

  describe('getPlanningDir', () => {
    it('should return {cwd}/planning when SPRINT_ROOT not set', () => {
      delete process.env.SPRINT_ROOT;
      const planningDir = getPlanningDir();
      expect(planningDir).toBe(join(process.cwd(), 'planning'));
    });

    it('should return {SPRINT_ROOT}/planning when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const planningDir = getPlanningDir();
      expect(planningDir).toBe(join(customRoot, 'planning'));
    });
  });

  describe('getSprintIndexPath', () => {
    it('should return {cwd}/planning/sprint-index.yaml when SPRINT_ROOT not set', () => {
      delete process.env.SPRINT_ROOT;
      const indexPath = getSprintIndexPath();
      expect(indexPath).toBe(join(process.cwd(), 'planning', 'sprint-index.yaml'));
    });

    it('should return {SPRINT_ROOT}/planning/sprint-index.yaml when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const indexPath = getSprintIndexPath();
      expect(indexPath).toBe(join(customRoot, 'planning', 'sprint-index.yaml'));
    });
  });

  describe('getWorktreePath', () => {
    const sprintId = 'sprint-14-kmbtu7';

    it('should return {cwd}/.worktrees/{sprintId} regardless of SPRINT_ROOT', () => {
      delete process.env.SPRINT_ROOT;
      const worktreePath = getWorktreePath(sprintId);
      expect(worktreePath).toBe(join(process.cwd(), '.worktrees', sprintId));
    });

    it('should use process.cwd() for worktrees even when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const worktreePath = getWorktreePath(sprintId);
      // Worktrees must stay with the git repo, not under SPRINT_ROOT
      expect(worktreePath).toBe(join(process.cwd(), '.worktrees', sprintId));
      expect(worktreePath).not.toContain(customRoot);
    });

    it('should handle sprint IDs with special characters', () => {
      const sprintId = 'sprint-1-abc123';
      delete process.env.SPRINT_ROOT;
      const worktreePath = getWorktreePath(sprintId);
      expect(worktreePath).toBe(join(process.cwd(), '.worktrees', sprintId));
    });
  });

  describe('getSprintDir', () => {
    const sprintId = 'sprint-14-kmbtu7';

    it('should return {cwd}/planning/{sprintId} when SPRINT_ROOT not set', () => {
      delete process.env.SPRINT_ROOT;
      const sprintDir = getSprintDir(sprintId);
      expect(sprintDir).toBe(join(process.cwd(), 'planning', sprintId));
    });

    it('should return {SPRINT_ROOT}/planning/{sprintId} when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const sprintDir = getSprintDir(sprintId);
      expect(sprintDir).toBe(join(customRoot, 'planning', sprintId));
    });
  });

  describe('getManifestPath', () => {
    const sprintId = 'sprint-14-kmbtu7';

    it('should return manifest path when SPRINT_ROOT not set', () => {
      delete process.env.SPRINT_ROOT;
      const manifestPath = getManifestPath(sprintId);
      expect(manifestPath).toBe(
        join(process.cwd(), 'planning', sprintId, 'sprint-manifest.yaml')
      );
    });

    it('should return manifest path when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const manifestPath = getManifestPath(sprintId);
      expect(manifestPath).toBe(
        join(customRoot, 'planning', sprintId, 'sprint-manifest.yaml')
      );
    });
  });

  describe('validateSprintRoot', () => {
    it('should not throw when SPRINT_ROOT is not set', () => {
      delete process.env.SPRINT_ROOT;
      expect(() => validateSprintRoot()).not.toThrow();
    });

    it('should not throw when SPRINT_ROOT is empty', () => {
      process.env.SPRINT_ROOT = '';
      expect(() => validateSprintRoot()).not.toThrow();
    });

    it('should not throw when SPRINT_ROOT is whitespace', () => {
      process.env.SPRINT_ROOT = '   ';
      expect(() => validateSprintRoot()).not.toThrow();
    });

    it('should not throw when SPRINT_ROOT is valid absolute path', () => {
      process.env.SPRINT_ROOT = '/valid/absolute/path';
      expect(() => validateSprintRoot()).not.toThrow();
    });

    it('should throw when SPRINT_ROOT is relative path', () => {
      process.env.SPRINT_ROOT = 'relative/path';
      expect(() => validateSprintRoot()).toThrow(
        'SPRINT_ROOT must be an absolute path'
      );
    });

    it('should throw when SPRINT_ROOT is dot-relative path', () => {
      process.env.SPRINT_ROOT = './relative';
      expect(() => validateSprintRoot()).toThrow(
        'SPRINT_ROOT must be an absolute path'
      );
    });
  });

  describe('getConfigSummary', () => {
    it('should return correct summary when SPRINT_ROOT not set', () => {
      delete process.env.SPRINT_ROOT;
      const summary = getConfigSummary();

      expect(summary.sprintRootSet).toBe(false);
      expect(summary.sprintRoot).toBeUndefined();
      expect(summary.projectRoot).toBe(process.cwd());
      expect(summary.planningDir).toBe(join(process.cwd(), 'planning'));
      expect(summary.indexPath).toBe(
        join(process.cwd(), 'planning', 'sprint-index.yaml')
      );
    });

    it('should return correct summary when SPRINT_ROOT is set', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const summary = getConfigSummary();

      expect(summary.sprintRootSet).toBe(true);
      expect(summary.sprintRoot).toBe(customRoot);
      expect(summary.projectRoot).toBe(customRoot);
      expect(summary.planningDir).toBe(join(customRoot, 'planning'));
      expect(summary.indexPath).toBe(
        join(customRoot, 'planning', 'sprint-index.yaml')
      );
    });

    it('should indicate not set when SPRINT_ROOT is empty', () => {
      process.env.SPRINT_ROOT = '';
      const summary = getConfigSummary();

      expect(summary.sprintRootSet).toBe(false);
      expect(summary.sprintRoot).toBeUndefined();
    });

    it('should indicate not set when SPRINT_ROOT is whitespace', () => {
      process.env.SPRINT_ROOT = '   ';
      const summary = getConfigSummary();

      expect(summary.sprintRootSet).toBe(false);
      expect(summary.sprintRoot).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should maintain consistency across all path functions', () => {
      const customRoot = '/custom/project';
      process.env.SPRINT_ROOT = customRoot;
      const sprintId = 'sprint-14-kmbtu7';

      const projectRoot = getProjectRoot();
      const planningDir = getPlanningDir();
      const sprintDir = getSprintDir(sprintId);
      const manifestPath = getManifestPath(sprintId);
      const indexPath = getSprintIndexPath();

      // All paths should be based on SPRINT_ROOT
      expect(projectRoot).toBe(customRoot);
      expect(planningDir).toBe(join(customRoot, 'planning'));
      expect(sprintDir).toBe(join(customRoot, 'planning', sprintId));
      expect(manifestPath).toBe(
        join(customRoot, 'planning', sprintId, 'sprint-manifest.yaml')
      );
      expect(indexPath).toBe(join(customRoot, 'planning', 'sprint-index.yaml'));

      // Worktree should be based on process.cwd(), not SPRINT_ROOT
      const worktreePath = getWorktreePath(sprintId);
      expect(worktreePath).toBe(join(process.cwd(), '.worktrees', sprintId));
    });

    it('should work correctly when switching SPRINT_ROOT mid-execution', () => {
      const sprint1 = 'sprint-1';
      const sprint2 = 'sprint-2';

      // First project
      process.env.SPRINT_ROOT = '/project-a';
      const pathA1 = getSprintDir(sprint1);
      const pathA2 = getSprintDir(sprint2);

      expect(pathA1).toBe('/project-a/planning/sprint-1');
      expect(pathA2).toBe('/project-a/planning/sprint-2');

      // Switch to second project
      process.env.SPRINT_ROOT = '/project-b';
      const pathB1 = getSprintDir(sprint1);
      const pathB2 = getSprintDir(sprint2);

      expect(pathB1).toBe('/project-b/planning/sprint-1');
      expect(pathB2).toBe('/project-b/planning/sprint-2');

      // Paths should be different for different projects
      expect(pathA1).not.toBe(pathB1);
      expect(pathA2).not.toBe(pathB2);
    });

    it('should handle backward compatibility (no SPRINT_ROOT)', () => {
      delete process.env.SPRINT_ROOT;
      const sprintId = 'sprint-14-kmbtu7';

      // All paths should work exactly as before (using process.cwd())
      const projectRoot = getProjectRoot();
      const planningDir = getPlanningDir();
      const sprintDir = getSprintDir(sprintId);
      const manifestPath = getManifestPath(sprintId);

      expect(projectRoot).toBe(process.cwd());
      expect(planningDir).toBe(join(process.cwd(), 'planning'));
      expect(sprintDir).toBe(join(process.cwd(), 'planning', sprintId));
      expect(manifestPath).toBe(
        join(process.cwd(), 'planning', sprintId, 'sprint-manifest.yaml')
      );
    });
  });
});
