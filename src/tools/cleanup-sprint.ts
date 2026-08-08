/**
 * Cleanup Sprint Tool
 *
 * Safely removes git worktrees for completed sprints while preserving
 * sprint planning artifacts. Provides clear warnings about what will be deleted.
 *
 * Per Sprint Protocol: Only completed sprints can be cleaned up.
 */

import { logger } from '../common/logger.js';
import {
  getCleanupCandidates,
  cleanupSprint,
  type CleanupCandidate,
} from '../common/sprint-cleanup-utils.js';
import { executeHook } from '../common/hook-manager.js';
import { getWorktreePath } from '../common/git-utils.js';
import { join } from 'path';

interface CleanupSprintArgs {
  sprintId?: string; // Optional: cleanup specific sprint, or all if omitted
  force?: boolean; // Force removal even if uncommitted changes exist
}

interface CleanupSprintResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Format cleanup candidates as text
 */
function formatCandidates(candidates: CleanupCandidate[]): string {
  let text = '';

  candidates.forEach((candidate, index) => {
    text += `\n${index + 1}. **${candidate.sprintId}**\n`;
    text += `   - Path: ${candidate.worktreePath}\n`;
    text += `   - Branch: ${candidate.branch}\n`;
    text += `   - Size: ~${formatBytes(candidate.diskUsage)}\n`;
    text += `   - Status: ${candidate.status}\n`;

    if (candidate.hasUncommittedChanges) {
      text += `   - ⚠️  Has uncommitted changes\n`;
    }
  });

  return text;
}

/**
 * Cleanup sprint MCP tool handler (preview mode)
 *
 * Shows what will be cleaned up without actually removing anything. Lists all completed
 * sprints with active worktrees, along with disk space usage and uncommitted change warnings.
 *
 * This is the "preview" mode - it identifies cleanup candidates and shows warnings but doesn't
 * execute the cleanup. Use the actual cleanup via npm script or explicit confirmation.
 *
 * @param args - Tool arguments object from MCP client
 * @param args.sprintId - Optional sprint ID to filter to a specific sprint. If omitted, shows all cleanup candidates.
 * @param args.force - Optional flag to indicate force cleanup (shown in preview, not executed here)
 * @returns Promise resolving to MCP result with formatted candidate list and warnings, or error if lookup fails
 *
 * @example
 * ```typescript
 * // List all cleanup candidates (MCP tool call)
 * const result = await cleanupSprintTool({});
 * // Returns formatted list of all completed sprints with worktrees
 *
 * // Check specific sprint
 * const result = await cleanupSprintTool({ sprintId: 'sprint-6-24txmg' });
 * // Returns details for sprint-6 if it has a worktree
 * ```
 */
export async function cleanupSprintTool(
  args?: Record<string, unknown>
): Promise<CleanupSprintResult> {
  const sprintArgs: CleanupSprintArgs = {
    sprintId: args?.sprintId as string | undefined,
    force: (args?.force as boolean) || false,
  };

  const { sprintId, force } = sprintArgs;

  logger.info(`Cleanup sprint tool called`, { sprintId, force });

  try {
    // Step 1: Find cleanup candidates
    const candidates = await getCleanupCandidates(sprintId);

    if (candidates.length === 0) {
      const message = sprintId
        ? `No worktree found for sprint ${sprintId}\n\nEither the sprint doesn't exist, is not complete, or has already been cleaned up.`
        : `No completed sprints with worktrees found.\n\nAll sprints are already cleaned up!`;

      return {
        content: [
          {
            type: 'text',
            text: `✅ ${message}`,
          },
        ],
      };
    }

    // Step 2: Check for uncommitted changes
    const hasUncommittedChanges = candidates.some((c) => c.hasUncommittedChanges);

    if (hasUncommittedChanges && !force) {
      let errorText = `❌ Cannot cleanup: Some worktrees have uncommitted changes\n\n`;
      errorText += `**Worktrees with uncommitted changes:**\n`;

      candidates
        .filter((c) => c.hasUncommittedChanges)
        .forEach((c) => {
          errorText += `- ${c.sprintId} (${c.worktreePath})\n`;
        });

      errorText += `\n**Options:**\n`;
      errorText += `1. Commit or stash changes in the worktree\n`;
      errorText += `2. Use force=true to cleanup anyway (changes will be LOST)\n`;

      return {
        content: [
          {
            type: 'text',
            text: errorText,
          },
        ],
        isError: true,
      };
    }

    // Step 3: Calculate total disk usage
    const totalDiskUsage = candidates.reduce((sum, c) => sum + c.diskUsage, 0);

    // Step 4: Build confirmation message
    let confirmText = `🧹 Sprint Cleanup\n\n`;
    confirmText += `Found ${candidates.length} completed sprint(s) with worktrees:\n`;
    confirmText += formatCandidates(candidates);
    confirmText += `\n**Total disk space to be freed:** ~${formatBytes(totalDiskUsage)}\n\n`;

    confirmText += `⚠️  **WARNING:** This will permanently remove the worktrees listed above.\n`;
    confirmText += `Sprint planning artifacts in planning/sprint-X/ will be **preserved**.\n\n`;

    if (hasUncommittedChanges && force) {
      confirmText += `⚠️  **FORCE MODE:** Uncommitted changes will be **LOST**!\n\n`;
    }

    confirmText += `**What will be deleted:**\n`;
    confirmText += `✗ Git worktree in .worktrees/sprint-X/\n\n`;

    confirmText += `**What will be preserved:**\n`;
    confirmText += `✓ Sprint planning artifacts in planning/sprint-X/\n`;
    confirmText += `✓ Sprint index entry\n\n`;

    confirmText += `**To proceed with cleanup**, call this tool again with a confirmation parameter,\n`;
    confirmText += `or use the npm script: \`npm run sprint:cleanup -- --yes\`\n`;

    return {
      content: [
        {
          type: 'text',
          text: confirmText,
        },
      ],
    };
  } catch (error) {
    logger.error(`Cleanup sprint tool failed`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Cleanup failed\n\nError: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Execute cleanup after confirmation
 *
 * This is a separate function that actually performs the cleanup.
 * It should only be called after the user has confirmed via the preview.
 */
export async function executeCleanupSprintTool(
  args?: Record<string, unknown>
): Promise<CleanupSprintResult> {
  const sprintArgs: CleanupSprintArgs = {
    sprintId: args?.sprintId as string | undefined,
    force: (args?.force as boolean) || false,
  };

  const { sprintId, force } = sprintArgs;

  logger.info(`Executing cleanup sprint`, { sprintId, force });

  try {
    // Step 1: Find cleanup candidates
    const candidates = await getCleanupCandidates(sprintId);

    if (candidates.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `✅ No worktrees to cleanup`,
          },
        ],
      };
    }

    // Step 2: Perform cleanup for each candidate
    let successCount = 0;
    let totalFreed = 0;
    const errors: Array<{ sprintId: string; errors: string[] }> = [];

    for (const candidate of candidates) {
      logger.info(`Cleaning up ${candidate.sprintId}...`);

      // Execute pre-worktree-remove hook (BLOCKING)
      logger.info('Executing pre-worktree-remove hook...');
      const worktreePath = getWorktreePath(candidate.sprintId);
      const planningDir = join(worktreePath, 'planning', candidate.sprintId);

      const hookResult = await executeHook('pre-worktree-remove', {
        sprintId: candidate.sprintId,
        worktreePath,
        planningDir,
        branch: candidate.branch,
      });

      if (hookResult.executed && hookResult.exitCode !== 0) {
        // PRE hook failed - BLOCK cleanup for this sprint
        logger.error(`pre-worktree-remove hook failed for ${candidate.sprintId} - skipping cleanup`, {
          exitCode: hookResult.exitCode,
          stderr: hookResult.stderr,
        });
        errors.push({
          sprintId: candidate.sprintId,
          errors: [
            `pre-worktree-remove hook failed (exit code ${hookResult.exitCode})`,
            hookResult.stderr || hookResult.error || 'Hook returned non-zero exit code',
          ],
        });
        continue; // Skip this sprint, move to next
      }

      if (hookResult.executed && hookResult.exitCode === 0) {
        logger.info(`pre-worktree-remove hook passed for ${candidate.sprintId}`);
      }

      // Hook passed or not found - proceed with cleanup
      const result = await cleanupSprint(candidate.sprintId, { force });

      if (result.success) {
        successCount++;
        totalFreed += result.diskFreed;
        logger.info(`✓ Cleaned up ${candidate.sprintId}`);
      } else {
        errors.push({
          sprintId: candidate.sprintId,
          errors: result.errors,
        });
        logger.error(`✗ Failed to cleanup ${candidate.sprintId}`, result.errors);
      }
    }

    // Step 3: Build summary
    let summaryText = `✅ Cleanup complete!\n\n`;
    summaryText += `**Summary:**\n`;
    summaryText += `- Successfully cleaned: ${successCount} sprint(s)\n`;
    summaryText += `- Disk space freed: ~${formatBytes(totalFreed)}\n`;

    if (errors.length > 0) {
      summaryText += `- Failed: ${errors.length} sprint(s)\n\n`;
      summaryText += `**Errors:**\n`;
      errors.forEach((error) => {
        summaryText += `\n${error.sprintId}:\n`;
        error.errors.forEach((msg) => {
          summaryText += `  - ${msg}\n`;
        });
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: summaryText,
        },
      ],
      isError: errors.length > 0,
    };
  } catch (error) {
    logger.error(`Execute cleanup failed`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Cleanup execution failed\n\nError: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
