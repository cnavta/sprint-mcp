/**
 * Update Sprint Status Tool
 *
 * Atomically updates sprint status in both the manifest (authoritative) and
 * the sprint index (derived cache). This ensures consistency between the two.
 */

import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { getProjectRoot } from '../common/project-config.js';
import { readFile, writeFile, fileExists } from '../common/file-utils.js';
import { loadSprintIndex, updateSprintInIndex } from '../common/sprint-index-manager.js';
import { validateSprintIndex } from '../common/sprint-index-validator.js';
import { executeHook } from '../common/hook-manager.js';
import { getWorktreePath } from '../common/git-utils.js';
import type { SprintManifest, SprintStatus } from '../types/sprint.js';
import type { SprintCompletionMode } from '../types/sprint-index.js';

interface UpdateSprintStatusArgs {
  sprintId: string;
  status?: SprintStatus;
  completedAt?: string;
  completionMode?: SprintCompletionMode;
  pr?: string;
}

interface UpdateSprintStatusResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Validate sprint status value
 */
function isValidStatus(status: string): status is SprintStatus {
  const validStatuses: SprintStatus[] = [
    'planning',
    'in-progress',
    'validating',
    'verifying',
    'published',
    'complete',
  ];
  return validStatuses.includes(status as SprintStatus);
}

/**
 * Update sprint status MCP tool handler
 *
 * @param args Tool arguments containing sprintId and optional fields to update
 * @returns Result with success message or error
 */
export async function updateSprintStatusTool(
  args?: Record<string, unknown>
): Promise<UpdateSprintStatusResult> {
  if (!args || !args.sprintId) {
    throw new Error('Missing required argument: sprintId');
  }

  const sprintId = args.sprintId as string;
  const updates: UpdateSprintStatusArgs = { sprintId };

  // Parse optional update fields
  if (args.status) {
    if (!isValidStatus(args.status as string)) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Invalid status: ${args.status}\n\nValid statuses: planning, in-progress, validating, verifying, published, complete`,
          },
        ],
        isError: true,
      };
    }
    updates.status = args.status as SprintStatus;
  }

  if (args.completedAt) {
    updates.completedAt = args.completedAt as string;
  }

  if (args.completionMode) {
    updates.completionMode = args.completionMode as SprintCompletionMode;
  }

  if (args.pr) {
    updates.pr = args.pr as string;
  }

  logger.info(`Updating sprint status for ${sprintId}`, updates);

  // Step 1: Find sprint manifest path from index (unified worktree model aware)
  // Index-based resolution automatically handles all storage models:
  // - Unified worktree model (active): .worktrees/sprint-N/planning/sprint-N/sprint-manifest.yaml
  // - Archive structure (completed): planning/active/sprint-N/sprint-manifest.yaml
  // - Flat structure (legacy): planning/sprint-N/sprint-manifest.yaml
  let manifestPath: string;

  try {
    const index = await loadSprintIndex();
    const sprintEntry = index.sprints.find((s) => s.id === sprintId);

    if (sprintEntry) {
      // Use manifestPath from index (supports worktree, archive, and flat structures)
      manifestPath = join(getProjectRoot(), sprintEntry.manifestPath);
      logger.info(`Found sprint ${sprintId} in index at: ${manifestPath}`);
    } else {
      // Sprint not in index - fall back to flat structure
      const { getPlanningDir } = await import('../common/project-config.js');
      manifestPath = join(getPlanningDir(), sprintId, 'sprint-manifest.yaml');
      logger.warn(`Sprint ${sprintId} not in index, trying flat structure: ${manifestPath}`);
    }
  } catch (error) {
    // Index doesn't exist or can't be loaded - fall back to flat structure
    const { getPlanningDir } = await import('../common/project-config.js');
    manifestPath = join(getPlanningDir(), sprintId, 'sprint-manifest.yaml');
    logger.warn(`Could not load index (${error}), trying flat structure: ${manifestPath}`);
  }

  // Step 2: Load and update manifest (authoritative source)
  if (!(await fileExists(manifestPath))) {
    logger.error(`Sprint manifest not found: ${manifestPath}`);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Sprint not found: ${sprintId}\n\nManifest does not exist at: ${manifestPath}\n\nPlease check the sprint ID and try again.`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Read current manifest
    const manifestContent = await readFile(manifestPath);
    const manifest = parseYaml(manifestContent) as SprintManifest;
    const currentStatus = manifest.status;

    // Execute on-status-change hook (PRE phase) if status is being updated
    if (updates.status && updates.status !== currentStatus) {
      logger.info('Executing on-status-change hook (PRE phase)...');

      // Determine worktree path and planning dir for hook context
      const worktreePath = getWorktreePath(sprintId);
      const planningDir = join(worktreePath, 'planning', sprintId);
      const branch = manifest.links?.branch || '';

      const preHookResult = await executeHook('on-status-change', {
        sprintId,
        worktreePath,
        planningDir,
        branch,
        statusFrom: currentStatus,
        statusTo: updates.status,
        lifecyclePhase: 'pre',
      });

      if (preHookResult.executed && preHookResult.exitCode !== 0) {
        // PRE hook failed - BLOCK status update
        logger.error('on-status-change hook (PRE phase) failed - aborting status update', {
          exitCode: preHookResult.exitCode,
          stderr: preHookResult.stderr,
        });
        return {
          content: [{
            type: 'text',
            text: `❌ Status update blocked by on-status-change hook (PRE phase)\n\n` +
                  `**Status Transition**: ${currentStatus} → ${updates.status}\n\n` +
                  `**Hook Error**:\n${preHookResult.stderr || preHookResult.error}\n\n` +
                  `Fix the issues reported by the hook and try again.`,
          }],
          isError: true,
        };
      }

      if (preHookResult.executed && preHookResult.exitCode === 0) {
        logger.info('on-status-change hook (PRE phase) passed');
      }
    }

    // Apply updates to manifest
    if (updates.status) {
      manifest.status = updates.status;
    }

    if (updates.completedAt) {
      (manifest as any).completedAt = updates.completedAt;
    }

    if (updates.completionMode) {
      (manifest as any).completionMode = updates.completionMode;
    }

    if (updates.pr) {
      if (!manifest.links) {
        manifest.links = { branch: '' };
      }
      manifest.links.pr = updates.pr;
    }

    // Write updated manifest
    await writeFile(manifestPath, stringifyYaml(manifest));
    logger.info(`Updated sprint manifest: ${manifestPath}`);

    // Step 3: Update index (derived cache)
    try {
      const indexUpdates: Record<string, unknown> = {};

      if (updates.status) {
        indexUpdates.status = updates.status;
      }

      if (updates.completedAt) {
        indexUpdates.completedAt = updates.completedAt;
      }

      if (updates.completionMode) {
        indexUpdates.completionMode = updates.completionMode;
      }

      if (updates.pr) {
        indexUpdates.pr = updates.pr;
      }

      await updateSprintInIndex(sprintId, indexUpdates);
      logger.info(`Updated sprint index for ${sprintId}`);
    } catch (error) {
      // Non-fatal: index can be regenerated
      logger.warn(
        `Failed to update sprint index (non-fatal, can regenerate): ${error}`
      );
    }

    // Execute on-status-change hook (POST phase) if status was updated
    if (updates.status && updates.status !== currentStatus) {
      logger.info('Executing on-status-change hook (POST phase)...');

      const worktreePath = getWorktreePath(sprintId);
      const planningDir = join(worktreePath, 'planning', sprintId);
      const branch = manifest.links?.branch || '';

      const postHookResult = await executeHook('on-status-change', {
        sprintId,
        worktreePath,
        planningDir,
        branch,
        statusFrom: currentStatus,
        statusTo: updates.status,
        lifecyclePhase: 'post',
      });

      if (postHookResult.executed && postHookResult.exitCode !== 0) {
        // POST hook failed - NON-BLOCKING (just log warning)
        logger.warn('on-status-change hook (POST phase) failed (non-blocking)', {
          exitCode: postHookResult.exitCode,
          stderr: postHookResult.stderr,
        });
      }

      if (postHookResult.executed && postHookResult.exitCode === 0) {
        logger.info('on-status-change hook (POST phase) completed');
      }
    }

    // Validate the updated index (optional, non-blocking)
    let validationResult;
    try {
      validationResult = await validateSprintIndex();
      logger.debug(
        `Index validation: ${validationResult.valid ? 'PASSED' : 'FAILED'} (${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings)`
      );
    } catch (error) {
      // Validation failure is non-fatal
      logger.warn(`Index validation failed (non-fatal): ${error}`);
    }

    // Build success message
    let resultText = `✅ Sprint ${sprintId} status updated successfully!\n\n`;
    resultText += `**Updated Fields**:\n`;

    if (updates.status) {
      resultText += `- Status: ${updates.status}\n`;
    }

    if (updates.completedAt) {
      resultText += `- Completed At: ${updates.completedAt}\n`;
    }

    if (updates.completionMode) {
      resultText += `- Completion Mode: ${updates.completionMode}\n`;
    }

    if (updates.pr) {
      resultText += `- Pull Request: ${updates.pr}\n`;
    }

    resultText += `\n**Files Updated**:\n`;
    resultText += `- ${manifestPath} (authoritative)\n`;
    resultText += `- planning/sprint-index.yaml (derived cache)\n`;

    // Include validation results if available
    if (validationResult) {
      resultText += `\n**Index Validation**:\n`;
      if (validationResult.valid && validationResult.warnings.length === 0) {
        resultText += `✅ All checks passed\n`;
      } else if (validationResult.valid) {
        resultText += `⚠️  ${validationResult.warnings.length} warning${validationResult.warnings.length > 1 ? 's' : ''} (see logs)\n`;
      } else {
        resultText += `❌ ${validationResult.errors.length} error${validationResult.errors.length > 1 ? 's' : ''} detected\n`;
        resultText += `Run \`regenerate-sprint-index\` to fix inconsistencies.\n`;
      }
    }

    logger.info(`Sprint ${sprintId} status update complete`);

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    logger.error(`Failed to update sprint status for ${sprintId}`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to update sprint ${sprintId}\n\nError: ${errorMessage}\n\nThe manifest may be corrupted or you may not have write permissions.`,
        },
      ],
      isError: true,
    };
  }
}
