/**
 * Path Utility Functions
 *
 * Centralized path resolution for multi-repository support.
 *
 * This module provides the single source of truth for resolving paths to:
 * - Project root directory (respects SPRINT_ROOT environment variable)
 * - Planning directory
 * - Worktree directories
 *
 * Background:
 * When sprint-mcp is installed globally or used as an MCP server, process.cwd()
 * returns the sprint-mcp installation directory, not the target repository.
 * This caused "path argument must be of type string" errors when operating
 * on other repositories like BitBratPlatform.
 *
 * Solution:
 * Respect SPRINT_ROOT environment variable when set, allowing operators to
 * configure the target repository in their MCP server configuration:
 *
 * Example Claude Desktop config.json:
 * {
 *   "mcpServers": {
 *     "sprint-mcp-bitbrat": {
 *       "command": "node",
 *       "args": ["/path/to/sprint-mcp/dist/index.js"],
 *       "env": {
 *         "SPRINT_ROOT": "/Users/user/IdeaProjects/BitBratPlatform"
 *       }
 *     },
 *     "sprint-mcp-local": {
 *       "command": "node",
 *       "args": ["/path/to/sprint-mcp/dist/index.js"],
 *       "env": {
 *         "SPRINT_ROOT": "/Users/user/IdeaProjects/sprint-mcp"
 *       }
 *     }
 *   }
 * }
 *
 * Related:
 * - Technical Architecture Section 9: SPRINT_ROOT Path Resolution Defect
 * - Sprint 13, Task 13-000: Create Path Utilities Module
 * - Execution Plan Phase 0: Critical Path Resolution Fix
 */

import { join } from 'path';
import { logger } from './logger.js';

/**
 * Get the project root directory
 *
 * Returns the absolute path to the target repository where sprint operations
 * should be performed. This is the foundation for all other path resolution.
 *
 * Resolution order:
 * 1. SPRINT_ROOT environment variable (if set)
 * 2. process.cwd() (fallback for local development)
 *
 * When SPRINT_ROOT is set, it takes absolute precedence. This enables:
 * - Multiple MCP server configurations for different repositories
 * - Global installation of sprint-mcp tools
 * - Operation on repositories other than sprint-mcp itself
 *
 * @returns Absolute path to project root directory
 *
 * @example
 * // With SPRINT_ROOT set
 * process.env.SPRINT_ROOT = '/Users/user/IdeaProjects/BitBratPlatform';
 * getProjectRoot(); // Returns: /Users/user/IdeaProjects/BitBratPlatform
 *
 * @example
 * // Without SPRINT_ROOT (local development)
 * delete process.env.SPRINT_ROOT;
 * process.cwd() = '/Users/user/IdeaProjects/sprint-mcp';
 * getProjectRoot(); // Returns: /Users/user/IdeaProjects/sprint-mcp
 */
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;

  if (sprintRoot) {
    logger.debug(`Using SPRINT_ROOT environment variable: ${sprintRoot}`);
    return sprintRoot;
  }

  const cwd = process.cwd();
  logger.debug(`SPRINT_ROOT not set, using current working directory: ${cwd}`);
  return cwd;
}

/**
 * Get the planning directory path
 *
 * Returns the absolute path to the planning/ directory where all sprint
 * artifacts are stored. This directory contains:
 * - Sprint directories (sprint-1-abc123/, sprint-2-def456/, etc.)
 * - sprint-index.yaml (centralized sprint metadata cache)
 *
 * The planning directory is always located at {projectRoot}/planning/
 *
 * @returns Absolute path to planning directory
 *
 * @example
 * // With SPRINT_ROOT=/Users/user/IdeaProjects/BitBratPlatform
 * getPlanningDir();
 * // Returns: /Users/user/IdeaProjects/BitBratPlatform/planning
 *
 * @example
 * // Local development (SPRINT_ROOT not set, cwd=/Users/user/IdeaProjects/sprint-mcp)
 * getPlanningDir();
 * // Returns: /Users/user/IdeaProjects/sprint-mcp/planning
 */
export function getPlanningDir(): string {
  const projectRoot = getProjectRoot();
  const planningDir = join(projectRoot, 'planning');
  logger.debug(`Planning directory: ${planningDir}`);
  return planningDir;
}

/**
 * Get the worktree directory path for a sprint
 *
 * Returns the absolute path to the git worktree directory for a specific sprint.
 * Git worktrees provide isolated working trees for sprint branches, enabling:
 * - Parallel work on multiple sprints
 * - Branch isolation without affecting main worktree
 * - Clean separation of sprint artifacts
 *
 * The worktree directory is always located at {projectRoot}/.worktrees/{sprintId}/
 *
 * Directory structure:
 * .worktrees/
 *   sprint-1-abc123/     # Isolated worktree for sprint-1
 *   sprint-2-def456/     # Isolated worktree for sprint-2
 *
 * @param sprintId - Sprint ID (e.g., "sprint-1-abc123")
 * @returns Absolute path to sprint worktree directory
 *
 * @example
 * // With SPRINT_ROOT=/Users/user/IdeaProjects/BitBratPlatform
 * getWorktreeDir('sprint-7-f7cz9y');
 * // Returns: /Users/user/IdeaProjects/BitBratPlatform/.worktrees/sprint-7-f7cz9y
 *
 * @example
 * // Local development (SPRINT_ROOT not set, cwd=/Users/user/IdeaProjects/sprint-mcp)
 * getWorktreeDir('sprint-13-eaydun');
 * // Returns: /Users/user/IdeaProjects/sprint-mcp/.worktrees/sprint-13-eaydun
 */
export function getWorktreeDir(sprintId: string): string {
  const projectRoot = getProjectRoot();
  const worktreeDir = join(projectRoot, '.worktrees', sprintId);
  logger.debug(`Worktree directory for ${sprintId}: ${worktreeDir}`);
  return worktreeDir;
}
