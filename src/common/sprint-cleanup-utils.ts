/**
 * Sprint Cleanup Utilities
 *
 * Provides functions for safely cleaning up completed sprint worktrees
 * while preserving sprint planning artifacts.
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { logger } from './logger.js';
import { removeWorktree, listWorktrees, getWorktreePath } from './git-utils.js';
import { loadSprintIndex } from './sprint-index-manager.js';
import { getSprintDir } from './project-config.js';
import type { SprintStatus } from '../types/sprint.js';

/**
 * Information about a sprint that can be cleaned up
 */
export interface CleanupCandidate {
  sprintId: string;
  status: SprintStatus;
  worktreePath: string;
  worktreeExists: boolean;
  branch: string;
  diskUsage: number; // in bytes
  hasUncommittedChanges: boolean;
}

/**
 * Options for cleanup operation
 */
export interface CleanupOptions {
  force?: boolean; // Force removal even if uncommitted changes exist
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  success: boolean;
  sprintId: string;
  worktreeRemoved: boolean;
  diskFreed: number; // in bytes
  errors: string[];
  warnings: string[];
}

/**
 * Calculate disk usage of a directory in bytes
 *
 * @param path - Directory path to measure
 * @returns Disk usage in bytes, or 0 if cannot be determined
 */
export function calculateDiskUsage(path: string): number {
  try {
    // Use du -sb (summarize, bytes) to get disk usage
    const output = execSync(`du -sb "${path}" 2>/dev/null || echo "0"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    // Output format: "12345678\t/path/to/dir"
    const bytes = parseInt(output.split('\t')[0], 10);

    if (isNaN(bytes)) {
      logger.warn(`Could not parse disk usage for ${path}`);
      return 0;
    }

    logger.debug(`Disk usage for ${path}: ${bytes} bytes`);
    return bytes;
  } catch (err) {
    logger.warn(`Failed to calculate disk usage for ${path}:`, err);
    return 0;
  }
}

/**
 * Detect if a worktree has uncommitted changes
 *
 * @param worktreePath - Path to the worktree
 * @returns true if uncommitted changes exist, false otherwise
 */
export function detectUncommittedChanges(worktreePath: string): boolean {
  try {
    // Run git status --porcelain in the worktree
    // Porcelain format is empty if no changes
    const output = execSync(`cd "${worktreePath}" && git status --porcelain`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    const hasChanges = output.length > 0;

    if (hasChanges) {
      logger.debug(`Uncommitted changes detected in ${worktreePath}`);
    } else {
      logger.debug(`No uncommitted changes in ${worktreePath}`);
    }

    return hasChanges;
  } catch (err) {
    logger.warn(`Failed to check git status for ${worktreePath}:`, err);
    // Assume no changes if we can't check
    return false;
  }
}

/**
 * Validate that cleanup operation is safe to perform
 *
 * Performs safety checks to ensure a sprint worktree can be safely removed:
 * - Sprint exists in the sprint index
 * - Sprint status is 'complete' (not in-progress or planning)
 * - Planning directory exists (warning only, not blocking)
 *
 * @param sprintId - Sprint ID to validate (e.g., 'sprint-6-24txmg')
 * @returns Promise resolving to validation result object with `valid` flag, `errors` array, and `warnings` array
 * @throws Error if sprint index cannot be loaded
 */
export async function validateCleanupSafety(
  sprintId: string
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info(`Validating cleanup safety for ${sprintId}`);

  // Check 1: Sprint exists in index
  const index = await loadSprintIndex();
  const sprint = index.sprints.find((s) => s.id === sprintId);

  if (!sprint) {
    errors.push(`Sprint not found: ${sprintId}`);
    return { valid: false, errors, warnings };
  }

  // Check 2: Sprint is complete
  if (sprint.status !== 'complete') {
    errors.push(
      `Sprint ${sprintId} is not complete (status: ${sprint.status})`
    );
    errors.push('Only completed sprints can be cleaned up');
  }

  // Check 3: Planning directory exists (should be preserved)
  const planningDir = join(getSprintDir(sprintId));
  try {
    execSync(`test -d "${planningDir}"`, { stdio: 'pipe' });
    logger.debug(`Planning directory exists: ${planningDir}`);
  } catch {
    warnings.push(
      `Planning directory not found: ${planningDir}`
    );
    warnings.push('This is unusual but not an error');
  }

  const valid = errors.length === 0;

  logger.info(
    `Validation ${valid ? 'PASSED' : 'FAILED'}: ${errors.length} errors, ${warnings.length} warnings`
  );

  return { valid, errors, warnings };
}

/**
 * Get list of cleanup candidates (completed sprints with worktrees)
 *
 * Scans the sprint index for completed sprints that have active worktrees.
 * These worktrees can be safely removed while preserving planning artifacts.
 *
 * @param sprintId - Optional sprint ID to filter results. If omitted, returns all completed sprints with worktrees.
 * @returns Promise resolving to array of cleanup candidates with disk usage and uncommitted change status
 * @throws Error if sprint index cannot be loaded
 *
 * @example
 * ```typescript
 * // Get all cleanup candidates
 * const candidates = await getCleanupCandidates();
 * console.log(`Found ${candidates.length} sprints with worktrees`);
 *
 * // Get specific sprint
 * const sprint6 = await getCleanupCandidates('sprint-6-24txmg');
 * if (sprint6.length > 0) {
 *   console.log(`Sprint 6 worktree uses ${sprint6[0].diskUsage} bytes`);
 * }
 * ```
 */
export async function getCleanupCandidates(
  sprintId?: string
): Promise<CleanupCandidate[]> {
  logger.info(
    `Finding cleanup candidates${sprintId ? ` for ${sprintId}` : ' (all completed sprints)'}`
  );

  const candidates: CleanupCandidate[] = [];

  // Load sprint index
  const index = await loadSprintIndex();

  // Filter to completed sprints
  let sprints = index.sprints.filter((s) => s.status === 'complete');

  // Further filter to specific sprint if requested
  if (sprintId) {
    sprints = sprints.filter((s) => s.id === sprintId);
  }

  // Get current worktrees
  const worktrees = listWorktrees();

  // For each completed sprint, check if worktree exists
  for (const sprint of sprints) {
    const worktreePath = getWorktreePath(sprint.id);
    const worktree = worktrees.find((w) => w.path === worktreePath);
    const worktreeExists = worktree !== undefined;

    if (!worktreeExists) {
      logger.debug(`Sprint ${sprint.id} has no worktree, skipping`);
      continue;
    }

    // Calculate disk usage
    const diskUsage = calculateDiskUsage(worktreePath);

    // Check for uncommitted changes
    const hasUncommittedChanges = detectUncommittedChanges(worktreePath);

    candidates.push({
      sprintId: sprint.id,
      status: sprint.status,
      worktreePath,
      worktreeExists: true,
      branch: worktree?.branch || 'unknown',
      diskUsage,
      hasUncommittedChanges,
    });

    logger.info(
      `Found cleanup candidate: ${sprint.id} (${diskUsage} bytes, uncommitted changes: ${hasUncommittedChanges})`
    );
  }

  logger.info(`Found ${candidates.length} cleanup candidate(s)`);
  return candidates;
}

/**
 * Clean up a completed sprint by removing its worktree
 *
 * Safely removes a sprint's git worktree while preserving planning artifacts.
 * This frees disk space without losing sprint history or deliverables.
 *
 * **Safety features:**
 * - Only cleans completed sprints (validates status)
 * - Preserves planning directory (planning/sprint-X/)
 * - Warns about uncommitted changes
 * - Requires explicit force flag to override uncommitted changes warning
 *
 * **What gets deleted:**
 * - Worktree directory (.worktrees/sprint-X/)
 * - Git working tree state
 *
 * **What gets preserved:**
 * - Planning directory (planning/sprint-X/)
 * - Sprint manifest, backlog, retro, key learnings
 * - Sprint index entry
 *
 * @param sprintId - Sprint ID to clean up (e.g., 'sprint-6-24txmg')
 * @param options - Cleanup options. Use `{force: true}` to remove worktree even with uncommitted changes (changes will be lost).
 * @returns Promise resolving to cleanup result with success status, disk space freed, and any errors/warnings
 * @throws Error if sprint index cannot be loaded or worktree removal fails unexpectedly
 *
 * @example
 * ```typescript
 * // Clean up a completed sprint
 * const result = await cleanupSprint('sprint-6-24txmg');
 * if (result.success) {
 *   console.log(`Freed ${result.diskFreed} bytes`);
 * } else {
 *   console.error('Cleanup failed:', result.errors);
 * }
 *
 * // Force cleanup even with uncommitted changes
 * const forceResult = await cleanupSprint('sprint-7-f7cz9y', { force: true });
 * if (forceResult.warnings.length > 0) {
 *   console.warn('Warnings:', forceResult.warnings);
 * }
 * ```
 */
export async function cleanupSprint(
  sprintId: string,
  options: CleanupOptions = {}
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    sprintId,
    worktreeRemoved: false,
    diskFreed: 0,
    errors: [],
    warnings: [],
  };

  logger.info(`Starting cleanup for sprint ${sprintId}`, options);

  // Step 1: Validate cleanup is safe
  const validation = await validateCleanupSafety(sprintId);

  if (!validation.valid) {
    result.errors = validation.errors;
    result.warnings = validation.warnings;
    logger.error(`Cleanup validation failed for ${sprintId}`, validation.errors);
    return result;
  }

  result.warnings = validation.warnings;

  // Step 2: Get worktree path
  const worktreePath = getWorktreePath(sprintId);

  // Step 3: Check worktree exists
  const worktrees = listWorktrees();
  const worktree = worktrees.find((w) => w.path === worktreePath);

  if (!worktree) {
    result.errors.push(`Worktree not found: ${worktreePath}`);
    logger.error(`Worktree not found for ${sprintId}: ${worktreePath}`);
    return result;
  }

  // Step 4: Check for uncommitted changes
  const hasUncommittedChanges = detectUncommittedChanges(worktreePath);

  if (hasUncommittedChanges && !options.force) {
    result.errors.push(
      `Worktree has uncommitted changes: ${worktreePath}`
    );
    result.errors.push(
      'Use force option to cleanup anyway (changes will be lost)'
    );
    logger.warn(
      `Cleanup blocked: uncommitted changes in ${worktreePath} (use force to override)`
    );
    return result;
  }

  if (hasUncommittedChanges && options.force) {
    result.warnings.push(
      `Worktree has uncommitted changes but force=true, proceeding with cleanup`
    );
  }

  // Step 5: Calculate disk usage before removal
  const diskUsage = calculateDiskUsage(worktreePath);
  logger.info(`Worktree disk usage: ${diskUsage} bytes`);

  // Step 6: Remove worktree
  const removed = removeWorktree(worktreePath, options.force || false);

  if (!removed) {
    result.errors.push(`Failed to remove worktree: ${worktreePath}`);
    logger.error(`Failed to remove worktree for ${sprintId}`);
    return result;
  }

  result.worktreeRemoved = true;
  result.diskFreed = diskUsage;
  result.success = true;

  logger.info(
    `Successfully cleaned up sprint ${sprintId}: ${diskUsage} bytes freed`
  );

  return result;
}
