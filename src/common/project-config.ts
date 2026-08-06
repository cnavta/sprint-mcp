/**
 * Project Configuration Module
 *
 * Centralized configuration for project root path resolution.
 * Provides support for SPRINT_ROOT environment variable to enable
 * multi-project workflows.
 *
 * @module common/project-config
 */

import { join, isAbsolute } from 'path';
import { logger } from './logger.js';

/**
 * Get the project root directory
 *
 * Returns the project root path, preferring SPRINT_ROOT environment variable
 * if set, otherwise falling back to process.cwd(). This enables multi-project
 * configurations where different MCP server instances can point to different
 * project roots.
 *
 * @returns Absolute path to project root
 * @throws Error if SPRINT_ROOT is set but is not an absolute path
 *
 * @example
 * ```typescript
 * // Without SPRINT_ROOT (default behavior)
 * const root = getProjectRoot(); // Returns process.cwd()
 *
 * // With SPRINT_ROOT=/custom/project
 * const root = getProjectRoot(); // Returns /custom/project
 * ```
 */
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;

  // No SPRINT_ROOT set - use current working directory (backward compatible)
  if (!sprintRoot || sprintRoot.trim() === '') {
    logger.debug('SPRINT_ROOT not set, using process.cwd()');
    return process.cwd();
  }

  // Validate that SPRINT_ROOT is an absolute path
  if (!isAbsolute(sprintRoot)) {
    const error = `SPRINT_ROOT must be an absolute path, got: ${sprintRoot}`;
    logger.error(error);
    throw new Error(error);
  }

  logger.debug(`Using SPRINT_ROOT: ${sprintRoot}`);
  return sprintRoot;
}

/**
 * Get the planning directory path
 *
 * Returns the absolute path to the planning directory where sprint
 * manifests and artifacts are stored.
 *
 * @returns Absolute path to planning/ directory
 *
 * @example
 * ```typescript
 * const planningDir = getPlanningDir();
 * // Returns: {projectRoot}/planning
 * ```
 */
export function getPlanningDir(): string {
  return join(getProjectRoot(), 'planning');
}

/**
 * Get the sprint index file path
 *
 * Returns the absolute path to the sprint index YAML file that maintains
 * a cached index of all sprints.
 *
 * @returns Absolute path to planning/sprint-index.yaml
 *
 * @example
 * ```typescript
 * const indexPath = getSprintIndexPath();
 * // Returns: {projectRoot}/planning/sprint-index.yaml
 * ```
 */
export function getSprintIndexPath(): string {
  return join(getPlanningDir(), 'sprint-index.yaml');
}

/**
 * Get the worktree path for a sprint
 *
 * Returns the absolute path to the git worktree for a given sprint.
 * Note: Worktrees are kept in the actual repository root (.worktrees/)
 * rather than under SPRINT_ROOT, as they must remain with the .git directory.
 *
 * @param sprintId Sprint identifier (e.g., "sprint-14-kmbtu7")
 * @returns Absolute path to .worktrees/{sprintId}
 *
 * @example
 * ```typescript
 * const worktreePath = getWorktreePath('sprint-14-kmbtu7');
 * // Returns: {repoRoot}/.worktrees/sprint-14-kmbtu7
 * ```
 */
export function getWorktreePath(sprintId: string): string {
  // Worktrees go in the project root (respects SPRINT_ROOT)
  // When SPRINT_ROOT points to a git repository, worktrees are created there
  // When SPRINT_ROOT is not set, falls back to process.cwd()
  return join(getProjectRoot(), '.worktrees', sprintId);
}

/**
 * Get the sprint directory path
 *
 * Returns the absolute path to a specific sprint's directory within
 * the planning folder.
 *
 * @param sprintId Sprint identifier (e.g., "sprint-14-kmbtu7")
 * @returns Absolute path to planning/{sprintId}
 *
 * @example
 * ```typescript
 * const sprintDir = getSprintDir('sprint-14-kmbtu7');
 * // Returns: {projectRoot}/planning/sprint-14-kmbtu7
 * ```
 */
export function getSprintDir(sprintId: string): string {
  return join(getPlanningDir(), sprintId);
}

/**
 * Get the manifest path for a sprint
 *
 * Returns the absolute path to the sprint manifest YAML file for a
 * given sprint.
 *
 * @param sprintId Sprint identifier (e.g., "sprint-14-kmbtu7")
 * @returns Absolute path to planning/{sprintId}/sprint-manifest.yaml
 *
 * @example
 * ```typescript
 * const manifestPath = getManifestPath('sprint-14-kmbtu7');
 * // Returns: {projectRoot}/planning/sprint-14-kmbtu7/sprint-manifest.yaml
 * ```
 */
export function getManifestPath(sprintId: string): string {
  return join(getSprintDir(sprintId), 'sprint-manifest.yaml');
}

/**
 * Validate SPRINT_ROOT configuration
 *
 * Performs validation checks on the SPRINT_ROOT environment variable if set.
 * This function can be called at MCP server startup to fail-fast if
 * configuration is invalid.
 *
 * @throws Error if SPRINT_ROOT is set but invalid
 *
 * @example
 * ```typescript
 * // At server startup
 * try {
 *   validateSprintRoot();
 *   console.log('SPRINT_ROOT configuration valid');
 * } catch (error) {
 *   console.error('Invalid SPRINT_ROOT:', error.message);
 *   process.exit(1);
 * }
 * ```
 */
export function validateSprintRoot(): void {
  const sprintRoot = process.env.SPRINT_ROOT;

  // No validation needed if not set
  if (!sprintRoot || sprintRoot.trim() === '') {
    logger.debug('SPRINT_ROOT not set, no validation needed');
    return;
  }

  // Validate absolute path
  if (!isAbsolute(sprintRoot)) {
    const error = `SPRINT_ROOT must be an absolute path, got: ${sprintRoot}`;
    logger.error(error);
    throw new Error(error);
  }

  logger.info(`SPRINT_ROOT validated: ${sprintRoot}`);
}

/**
 * Get configuration summary for debugging
 *
 * Returns a summary object with current configuration state, useful
 * for debugging and logging.
 *
 * @returns Configuration summary object
 *
 * @example
 * ```typescript
 * const config = getConfigSummary();
 * console.log('Config:', config);
 * // {
 * //   sprintRootSet: true,
 * //   sprintRoot: '/custom/project',
 * //   projectRoot: '/custom/project',
 * //   planningDir: '/custom/project/planning'
 * // }
 * ```
 */
export function getConfigSummary(): {
  sprintRootSet: boolean;
  sprintRoot: string | undefined;
  projectRoot: string;
  planningDir: string;
  indexPath: string;
} {
  const sprintRoot = process.env.SPRINT_ROOT;
  const sprintRootSet = !!(sprintRoot && sprintRoot.trim() !== '');

  return {
    sprintRootSet,
    sprintRoot: sprintRootSet ? sprintRoot : undefined,
    projectRoot: getProjectRoot(),
    planningDir: getPlanningDir(),
    indexPath: getSprintIndexPath(),
  };
}
