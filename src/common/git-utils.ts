/**
 * Git Utility Functions
 *
 * Provides git operations for sprint workflow, including main branch baseline verification
 */

import { execSync } from 'child_process';
import { logger } from './logger.js';
import { getWorktreeDir } from './path-utils.js';

/**
 * Result of main branch verification
 */
export interface MainBranchVerificationResult {
  exists: boolean;
  hasCommits: boolean;
  error?: string;
}

/**
 * Verify that the main branch exists and has at least one commit
 *
 * This ensures we have a stable baseline before creating sprint branches.
 * Addresses FOLLOW-002 from sprint-2.
 *
 * @returns Verification result with status and error details if any
 */
export function verifyMainBranch(): MainBranchVerificationResult {
  try {
    logger.info('Verifying main branch baseline...');

    // Check if main branch exists (locally or remotely)
    let mainExists = false;
    try {
      // Check for local main branch
      execSync('git rev-parse --verify main', { encoding: 'utf-8', stdio: 'pipe' });
      mainExists = true;
      logger.info('Found local main branch');
    } catch {
      // Check for remote main branch (origin/main)
      try {
        execSync('git rev-parse --verify origin/main', { encoding: 'utf-8', stdio: 'pipe' });
        mainExists = true;
        logger.info('Found remote main branch (origin/main)');
      } catch {
        logger.error('Main branch not found (checked both local and origin/main)');
        return {
          exists: false,
          hasCommits: false,
          error: 'Main branch does not exist. Please create main branch with at least one commit before starting a sprint.',
        };
      }
    }

    // If main exists, check if it has commits
    if (mainExists) {
      try {
        const commitCount = execSync('git rev-list --count main', { encoding: 'utf-8', stdio: 'pipe' }).trim();
        const count = parseInt(commitCount, 10);

        if (count === 0) {
          logger.error('Main branch exists but has no commits');
          return {
            exists: true,
            hasCommits: false,
            error: 'Main branch has no commits. Please create at least one commit on main before starting a sprint.',
          };
        }

        logger.info(`Main branch verified: ${count} commit(s) found`);
        return {
          exists: true,
          hasCommits: true,
        };
      } catch (err) {
        logger.error('Failed to count commits on main branch', err);
        return {
          exists: true,
          hasCommits: false,
          error: `Failed to verify commits on main branch: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Should not reach here, but handle as safety
    return {
      exists: false,
      hasCommits: false,
      error: 'Unknown error verifying main branch',
    };
  } catch (err) {
    logger.error('Unexpected error during main branch verification', err);
    return {
      exists: false,
      hasCommits: false,
      error: `Git command failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Check if a git worktree exists at the specified path
 *
 * @param path - Path to check for worktree
 * @returns true if worktree exists, false otherwise
 */
export function worktreeExists(path: string): boolean {
  try {
    const worktrees = execSync('git worktree list --porcelain', { encoding: 'utf-8', stdio: 'pipe' });

    // Parse worktree list and check if any worktree matches the path
    // Handle symlinks by comparing normalized paths
    const lines = worktrees.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('worktree ')) {
        const worktreePath = lines[i].substring('worktree '.length);
        // Use realpath comparison to handle symlinks
        try {
          const normalizedWorktree = execSync(`cd "${worktreePath}" && pwd -P`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
          const normalizedPath = execSync(`cd "${path}" 2>/dev/null && pwd -P || echo "${path}"`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
          if (normalizedWorktree === normalizedPath) {
            return true;
          }
        } catch {
          // If path doesn't exist or can't be normalized, do simple string comparison
          if (worktreePath === path) {
            return true;
          }
        }
      }
    }
    return false;
  } catch (err) {
    logger.error('Failed to check worktree status', err);
    return false;
  }
}

/**
 * Worktree information
 */
export interface WorktreeInfo {
  path: string;
  branch: string;
  commit: string;
}

/**
 * List all git worktrees
 *
 * @returns Array of worktree information
 */
export function listWorktrees(): WorktreeInfo[] {
  try {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf-8', stdio: 'pipe' });
    const worktrees: WorktreeInfo[] = [];
    const lines = output.split('\n');

    let currentWorktree: Partial<WorktreeInfo> = {};
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        currentWorktree.path = line.substring('worktree '.length);
      } else if (line.startsWith('HEAD ')) {
        currentWorktree.commit = line.substring('HEAD '.length);
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring('branch '.length).replace('refs/heads/', '');
      } else if (line === '') {
        // Empty line indicates end of worktree entry
        if (currentWorktree.path && currentWorktree.commit) {
          worktrees.push({
            path: currentWorktree.path,
            branch: currentWorktree.branch || 'detached',
            commit: currentWorktree.commit,
          });
        }
        currentWorktree = {};
      }
    }

    logger.info(`Found ${worktrees.length} worktree(s)`);
    return worktrees;
  } catch (err) {
    logger.error('Failed to list worktrees', err);
    return [];
  }
}

/**
 * Create a new git worktree
 *
 * @param path - Path where worktree should be created
 * @param branchName - Name of the branch to create
 * @returns true if successful, false otherwise
 */
export function createWorktree(path: string, branchName: string): boolean {
  try {
    logger.info(`Creating worktree at ${path} with branch ${branchName}`);
    execSync(`git worktree add "${path}" -b "${branchName}"`, { encoding: 'utf-8', stdio: 'pipe' });
    logger.info(`Worktree created successfully: ${path}`);
    return true;
  } catch (err) {
    logger.error('Failed to create worktree', err);
    return false;
  }
}

/**
 * Remove a git worktree
 *
 * @param path - Path of worktree to remove
 * @param force - Force removal even if worktree has uncommitted changes
 * @returns true if successful, false otherwise
 */
export function removeWorktree(path: string, force: boolean = false): boolean {
  try {
    const forceFlag = force ? ' --force' : '';
    logger.info(`Removing worktree at ${path}${force ? ' (forced)' : ''}`);
    execSync(`git worktree remove "${path}"${forceFlag}`, { encoding: 'utf-8', stdio: 'pipe' });
    logger.info(`Worktree removed successfully: ${path}`);
    return true;
  } catch (err) {
    logger.error('Failed to remove worktree', err);
    return false;
  }
}

/**
 * Get the worktree path for a sprint ID
 *
 * @param sprintId - Sprint ID (e.g., "sprint-1-abc123")
 * @returns Absolute path to the sprint worktree
 * @deprecated Use getWorktreeDir() from path-utils.ts instead
 */
/**
 * Get worktree path - uses process.cwd() to keep worktrees with git repo
 * Note: Worktrees must stay in repo root, NOT under SPRINT_ROOT
 */
export function getWorktreePath(sprintId: string): string {
  // Delegate to centralized path utilities for multi-repo support
  // When SPRINT_ROOT is set, worktrees go in that repository
  // When SPRINT_ROOT is not set, worktrees go in process.cwd()
  return getWorktreeDir(sprintId);
}

/**
 * Get current git branch name
 *
 * @returns Current branch name or null if not in a git repository
 */
export function getCurrentBranch(): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    return branch;
  } catch (err) {
    logger.error('Failed to get current branch', err);
    return null;
  }
}
