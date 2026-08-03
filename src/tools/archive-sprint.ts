/**
 * Archive Sprint Tool
 *
 * Manual archival of completed sprints from active/ to archive/{year}/.
 * Supports dry-run mode for preview and integrates with knowledge extraction.
 */

import { join } from 'path';
import { logger } from '../common/logger.js';
import { getPlanningDir } from '../common/path-utils.js';
import { fileExists, readFile } from '../common/file-utils.js';
import { parse as parseYaml } from 'yaml';
import type {
  ArchiveSprintArgs,
  ArchiveSprintResult,
  ArchiveDestination,
  ArchiveValidationResult,
} from '../types/archive.js';
import type { SprintIndexEntry } from '../types/sprint-index.js';
import type { ArchiveConfig } from '../types/archive-config.js';
import {
  loadSprintIndex,
  updateSprintIndexPath,
} from '../common/sprint-index-manager.js';

/**
 * Check if archive system is enabled
 */
async function isArchiveEnabled(): Promise<boolean> {
  const planningDir = getPlanningDir();
  const configPath = join(planningDir, 'archive-config.yaml');

  if (!(await fileExists(configPath))) {
    return false;
  }

  try {
    const configContent = await readFile(configPath);
    const config = parseYaml(configContent) as { archive: ArchiveConfig };
    return config.archive?.enabled === true;
  } catch (err) {
    logger.warn('Failed to read archive-config.yaml', err);
    return false;
  }
}

/**
 * Load sprint from index
 */
async function loadSprintFromIndex(
  sprintId: string
): Promise<SprintIndexEntry | null> {
  const index = await loadSprintIndex();

  const sprint = index.sprints.find((s) => s.id === sprintId);

  if (!sprint) {
    logger.error(`Sprint ${sprintId} not found in index`);
    return null;
  }

  logger.debug(`Loaded sprint from index: ${sprintId}`, {
    status: sprint.status,
    completedAt: sprint.completedAt,
  });

  return sprint;
}

/**
 * Determine archive destination for a sprint
 */
function determineArchiveDestination(
  sprintId: string,
  sprint: SprintIndexEntry
): ArchiveDestination {
  const planningDir = getPlanningDir();

  // Determine archive year from completedAt or createdAt
  const dateString = sprint.completedAt || sprint.createdAt;
  const date = new Date(dateString);
  const year = date.getFullYear();

  logger.debug(`Archive year for ${sprintId}: ${year}`, {
    completedAt: sprint.completedAt,
    createdAt: sprint.createdAt,
  });

  const sourcePath = join(planningDir, 'active', sprintId);
  const destinationPath = join(planningDir, 'archive', String(year), sprintId);
  const manifestPath = `planning/archive/${year}/${sprintId}/sprint-manifest.yaml`;

  return {
    year,
    sourcePath,
    destinationPath,
    manifestPath,
  };
}

/**
 * Validate sprint can be archived
 */
async function validateArchival(
  sprintId: string,
  dryRun: boolean
): Promise<ArchiveValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info(`Validating archival for ${sprintId}`, { dryRun });

  // Check 1: Archive system enabled
  const archiveEnabled = await isArchiveEnabled();
  if (!archiveEnabled) {
    errors.push('Archive system is not enabled');
    errors.push(
      'Run migration script first: npm run migrate:archive'
    );
    return { valid: false, errors, warnings };
  }

  // Check 2: Sprint exists in index
  const sprint = await loadSprintFromIndex(sprintId);
  if (!sprint) {
    errors.push(`Sprint not found in index: ${sprintId}`);
    errors.push('Sprint must exist in sprint-index.yaml');
    return { valid: false, errors, warnings };
  }

  // Check 3: Sprint is completed
  if (sprint.status !== 'complete') {
    errors.push(`Sprint status is '${sprint.status}', must be 'complete'`);
    errors.push('Only completed sprints can be archived');
    return { valid: false, errors, warnings };
  }

  // Check 4: Sprint is in active directory
  const planningDir = getPlanningDir();
  const activeSprintPath = join(planningDir, 'active', sprintId);

  if (!(await fileExists(activeSprintPath))) {
    errors.push(`Sprint is not in active directory: ${activeSprintPath}`);
    errors.push('Sprint must be in planning/active/ to be archived');
    return { valid: false, errors, warnings };
  }

  // Check 5: Destination doesn't already exist
  const destination = determineArchiveDestination(sprintId, sprint);

  if (await fileExists(destination.destinationPath)) {
    errors.push(`Archive destination already exists: ${destination.destinationPath}`);
    errors.push('Cannot overwrite existing archived sprint');
    return { valid: false, errors, warnings, destination };
  }

  // All checks passed
  const valid = errors.length === 0;

  logger.info(
    `Validation ${valid ? 'PASSED' : 'FAILED'}: ${errors.length} errors, ${warnings.length} warnings`
  );

  return {
    valid,
    errors,
    warnings,
    destination,
  };
}

/**
 * Move sprint directory to archive
 */
async function moveSprintToArchive(
  destination: ArchiveDestination,
  dryRun: boolean
): Promise<void> {
  const { rename, mkdir } = await import('fs/promises');

  logger.info(`Moving sprint to archive`, {
    source: destination.sourcePath,
    dest: destination.destinationPath,
    dryRun,
  });

  if (dryRun) {
    logger.info('[DRY-RUN] Would create archive directory and move sprint');
    return;
  }

  // Create archive year directory if needed
  const archiveYearDir = join(getPlanningDir(), 'archive', String(destination.year));

  if (!(await fileExists(archiveYearDir))) {
    logger.debug(`Creating archive year directory: ${archiveYearDir}`);
    await mkdir(archiveYearDir, { recursive: true });
  }

  // Move sprint directory
  logger.debug(`Moving ${destination.sourcePath} to ${destination.destinationPath}`);
  await rename(destination.sourcePath, destination.destinationPath);

  logger.info('Sprint directory moved successfully');
}

/**
 * Update sprint index with new archive path
 */
async function updateIndexForArchive(
  sprintId: string,
  destination: ArchiveDestination,
  dryRun: boolean
): Promise<void> {
  logger.info(`Updating sprint index for ${sprintId}`, {
    manifestPath: destination.manifestPath,
    dryRun,
  });

  if (dryRun) {
    logger.info('[DRY-RUN] Would update sprint-index.yaml with new path');
    return;
  }

  await updateSprintIndexPath(sprintId, destination.manifestPath);

  logger.info('Sprint index updated successfully');
}

/**
 * Archive sprint MCP tool handler
 *
 * Moves a completed sprint from planning/active/ to planning/archive/{year}/.
 * Updates the sprint index with the new path. Supports dry-run mode for preview.
 *
 * **Prerequisites:**
 * - Archive system must be enabled (archive-config.yaml exists with enabled: true)
 * - Sprint must exist in planning/active/
 * - Sprint status must be 'complete'
 * - Archive destination must not already exist
 *
 * **What this tool does:**
 * 1. Validates sprint can be archived
 * 2. Determines archive year from completedAt or createdAt
 * 3. Creates archive/{year}/ directory if needed
 * 4. Moves sprint directory from active/ to archive/{year}/
 * 5. Updates sprint-index.yaml with new manifest path
 * 6. (Future) Triggers knowledge extraction if configured
 *
 * **Dry-Run Mode:**
 * Set dryRun: true to preview archival without making changes.
 * Shows validation results and destination without moving files.
 *
 * @param args - Tool arguments object from MCP client
 * @param args.sprintId - Sprint ID to archive (e.g., 'sprint-12-sdwpw0')
 * @param args.dryRun - Preview archival without making changes (default: false)
 * @returns Promise resolving to MCP result with archival summary or validation errors
 * @throws Error if required arguments (sprintId) are missing
 *
 * @example
 * ```typescript
 * // Dry-run to preview archival
 * const result = await archiveSprintTool({
 *   sprintId: 'sprint-12-sdwpw0',
 *   dryRun: true
 * });
 *
 * // Actually archive the sprint
 * const result = await archiveSprintTool({
 *   sprintId: 'sprint-12-sdwpw0',
 *   dryRun: false
 * });
 * ```
 */
export async function archiveSprintTool(
  args?: Record<string, unknown>
): Promise<ArchiveSprintResult> {
  // Validate required arguments
  if (!args || !args.sprintId) {
    throw new Error('Missing required argument: sprintId');
  }

  const sprintArgs: ArchiveSprintArgs = {
    sprintId: args.sprintId as string,
    dryRun: (args.dryRun as boolean) || false,
  };

  const { sprintId, dryRun } = sprintArgs;

  logger.info(`${dryRun ? '[DRY-RUN] ' : ''}Archiving sprint ${sprintId}`, {
    dryRun,
  });

  // Step 1: Validate sprint can be archived
  const validation = await validateArchival(sprintId, dryRun || false);

  if (!validation.valid || !validation.destination) {
    // Validation failed - return errors
    const errorText = [
      `❌ Cannot archive sprint ${sprintId}`,
      '',
      '**Validation Errors**:',
      ...validation.errors.map((e) => `- ${e}`),
    ];

    if (validation.warnings.length > 0) {
      errorText.push('', '**Warnings**:');
      errorText.push(...validation.warnings.map((w) => `- ${w}`));
    }

    errorText.push(
      '',
      '**Prerequisites**:',
      '1. Archive system must be enabled',
      '2. Sprint must be in planning/active/',
      '3. Sprint status must be "complete"',
      '4. Archive destination must not exist'
    );

    return {
      content: [
        {
          type: 'text',
          text: errorText.join('\n'),
        },
      ],
      isError: true,
    };
  }

  const destination = validation.destination;

  // Dry-run mode - show what would happen
  if (dryRun) {
    let resultText = `🔍 Dry-run: Archive preview for ${sprintId}\n\n`;

    resultText += `**Would archive sprint**:\n`;
    resultText += `- Sprint: ${sprintId}\n`;
    resultText += `- Status: complete\n`;
    resultText += `- Archive Year: ${destination.year}\n`;
    resultText += `- Source: ${destination.sourcePath}\n`;
    resultText += `- Destination: ${destination.destinationPath}\n`;
    resultText += `- Index Path: ${destination.manifestPath}\n`;

    resultText += `\n**Operations that would be performed**:\n`;
    resultText += `1. Create archive year directory: planning/archive/${destination.year}/\n`;
    resultText += `2. Move sprint directory\n`;
    resultText += `3. Update sprint-index.yaml with new path\n`;
    resultText += `4. (Future) Extract knowledge artifacts\n`;

    resultText += `\n**To execute archival**:\n`;
    resultText += `Run without dry-run flag: archive-sprint ${sprintId}\n`;

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  // Step 2: Move sprint to archive
  try {
    await moveSprintToArchive(destination, false);
  } catch (error) {
    logger.error(`Failed to move sprint to archive`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to move sprint to archive\n\nError: ${errorMessage}\n\nThe sprint directory could not be moved. Please check file system permissions.`,
        },
      ],
      isError: true,
    };
  }

  // Step 3: Update sprint index
  try {
    await updateIndexForArchive(sprintId, destination, false);
  } catch (error) {
    logger.error(`Failed to update sprint index`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `⚠️  Sprint moved but index update failed\n\nError: ${errorMessage}\n\nThe sprint was moved to archive but sprint-index.yaml was not updated.\nRun: npm run sprint:index:regenerate`,
        },
      ],
      isError: true,
    };
  }

  // Step 4: TODO - Knowledge extraction integration (Phase 3)
  // if (archive-config.yaml knowledge.extractOnComplete) {
  //   await extractKnowledgeArtifacts(sprintId, destination.destinationPath);
  // }

  // Success - build summary
  let resultText = `✅ Sprint ${sprintId} archived successfully!\n\n`;

  resultText += `**Archive Details**:\n`;
  resultText += `- Sprint: ${sprintId}\n`;
  resultText += `- Archive Year: ${destination.year}\n`;
  resultText += `- Location: ${destination.destinationPath}\n`;
  resultText += `- Index Path: ${destination.manifestPath}\n`;

  resultText += `\n**Completed Operations**:\n`;
  resultText += `✅ Created archive year directory\n`;
  resultText += `✅ Moved sprint from active/ to archive/${destination.year}/\n`;
  resultText += `✅ Updated sprint-index.yaml\n`;
  resultText += `⏭️  Knowledge extraction (Phase 3 - not yet implemented)\n`;

  resultText += `\n**Sprint is now archived**:\n`;
  resultText += `- No longer appears in check-sprint-status (active sprints only)\n`;
  resultText += `- Still included in sprint-index.yaml for history\n`;
  resultText += `- Still regenerated when running sprint:index:regenerate\n`;

  resultText += `\n**Next Steps**:\n`;
  resultText += `1. Review archived sprint: ${destination.destinationPath}\n`;
  resultText += `2. Optionally clean up worktree: \`git worktree remove .worktrees/${sprintId}\`\n`;
  resultText += `3. Archive older sprints as needed\n`;

  logger.info(`Sprint ${sprintId} archived successfully to ${destination.destinationPath}`);

  return {
    content: [
      {
        type: 'text',
        text: resultText,
      },
    ],
  };
}
