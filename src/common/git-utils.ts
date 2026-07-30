/**
 * Git Utility Functions
 *
 * Provides git operations for sprint workflow, including main branch baseline verification
 */

import { execSync } from 'child_process';
import { logger } from './logger.js';

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
