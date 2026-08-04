/**
 * Update Sprint Status Tool
 *
 * Atomically updates sprint status in both the manifest (authoritative) and
 * the sprint index (derived cache). This ensures consistency between the two.
 */

import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { getProjectRoot } from '../common/path-utils.js';
import { readFile, writeFile, fileExists } from '../common/file-utils.js';
import { loadSprintIndex, updateSprintInIndex } from '../common/sprint-index-manager.js';
import { validateSprintIndex } from '../common/sprint-index-validator.js';
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

  // Step 1: Find sprint manifest path from index (archive-aware)
  // Try to load from index first; fall back to flat structure if index doesn't exist or sprint not found
  let manifestPath: string;

  try {
    const index = await loadSprintIndex();
    const sprintEntry = index.sprints.find((s) => s.id === sprintId);

    if (sprintEntry) {
      // Use manifestPath from index (supports both flat and archive structures)
      manifestPath = join(getProjectRoot(), sprintEntry.manifestPath);
      logger.debug(`Found sprint in index, using path: ${manifestPath}`);
    } else {
      // Sprint not in index - fall back to flat structure
      const { getPlanningDir } = await import('../common/path-utils.js');
      manifestPath = join(getPlanningDir(), sprintId, 'sprint-manifest.yaml');
      logger.warn(`Sprint ${sprintId} not in index, trying flat structure: ${manifestPath}`);
    }
  } catch (error) {
    // Index doesn't exist or can't be loaded - fall back to flat structure
    const { getPlanningDir } = await import('../common/path-utils.js');
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
