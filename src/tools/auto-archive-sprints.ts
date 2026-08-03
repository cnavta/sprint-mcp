/**
 * Auto-Archive Sprints Tool
 *
 * Automatically archives completed sprints based on configurable criteria.
 * Supports age-based, count-based, and hybrid archival strategies.
 */

import { join } from 'path';
import { logger } from '../common/logger.js';
import { getPlanningDir } from '../common/path-utils.js';
import { fileExists, readFile } from '../common/file-utils.js';
import { parse as parseYaml } from 'yaml';
import type {
  AutoArchiveSprintsArgs,
  AutoArchiveSprintsResult,
} from '../types/archive.js';
import type { ArchiveConfig, ArchiveCriteria } from '../types/archive-config.js';
import type { SprintIndexEntry } from '../types/sprint-index.js';
import { loadSprintIndex } from '../common/sprint-index-manager.js';
import { archiveSprintTool } from './archive-sprint.js';

/**
 * Load archive configuration
 */
async function loadArchiveConfig(): Promise<ArchiveConfig | null> {
  const planningDir = getPlanningDir();
  const configPath = join(planningDir, 'archive-config.yaml');

  if (!(await fileExists(configPath))) {
    return null;
  }

  try {
    const configContent = await readFile(configPath);
    const config = parseYaml(configContent) as { archive: ArchiveConfig };
    return config.archive || null;
  } catch (err) {
    logger.warn('Failed to read archive-config.yaml', err);
    return null;
  }
}

/**
 * Find completed sprints in active directory
 */
async function findCompletedSprintsInActive(): Promise<SprintIndexEntry[]> {
  const index = await loadSprintIndex();

  // Filter for completed sprints in active/
  const completedInActive = index.sprints.filter(
    (sprint) =>
      sprint.status === 'complete' &&
      sprint.manifestPath.startsWith('planning/active/')
  );

  logger.debug(
    `Found ${completedInActive.length} completed sprints in active/`,
    {
      total: index.sprints.length,
      active: index.sprints.filter((s) =>
        s.manifestPath.startsWith('planning/active/')
      ).length,
    }
  );

  return completedInActive;
}

/**
 * Apply age criteria to find eligible sprints
 *
 * Sprints completed more than ageDays ago are eligible.
 */
function applyAgeCriteria(
  sprints: SprintIndexEntry[],
  ageDays: number
): SprintIndexEntry[] {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - ageDays * 24 * 60 * 60 * 1000);

  const eligible = sprints.filter((sprint) => {
    if (!sprint.completedAt) {
      // No completion date - use createdAt as fallback
      const createdDate = new Date(sprint.createdAt);
      return createdDate < cutoffDate;
    }

    const completedDate = new Date(sprint.completedAt);
    return completedDate < cutoffDate;
  });

  logger.debug(`Age criteria: ${eligible.length}/${sprints.length} eligible`, {
    ageDays,
    cutoffDate: cutoffDate.toISOString(),
  });

  return eligible;
}

/**
 * Apply count criteria to find eligible sprints
 *
 * Keep only the keepCount most recent completed sprints.
 * Older sprints are eligible for archival.
 */
function applyCountCriteria(
  sprints: SprintIndexEntry[],
  keepCount: number
): SprintIndexEntry[] {
  // Sort by completion date (most recent first)
  const sorted = [...sprints].sort((a, b) => {
    const dateA = new Date(a.completedAt || a.createdAt);
    const dateB = new Date(b.completedAt || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Keep only the most recent keepCount sprints
  const eligible = sorted.slice(keepCount);

  logger.debug(
    `Count criteria: ${eligible.length}/${sprints.length} eligible`,
    {
      keepCount,
      totalSprints: sprints.length,
      toArchive: eligible.length,
    }
  );

  return eligible;
}

/**
 * Apply hybrid criteria to find eligible sprints
 *
 * Sprint must meet BOTH age AND count criteria:
 * - Be older than ageDays
 * - Be outside the keepCount most recent sprints
 */
function applyHybridCriteria(
  sprints: SprintIndexEntry[],
  ageDays: number,
  keepCount: number
): SprintIndexEntry[] {
  const ageEligible = applyAgeCriteria(sprints, ageDays);
  const countEligible = applyCountCriteria(sprints, keepCount);

  // Sprint must appear in both lists (intersection)
  const eligible = ageEligible.filter((sprint) =>
    countEligible.some((s) => s.id === sprint.id)
  );

  logger.debug(
    `Hybrid criteria: ${eligible.length}/${sprints.length} eligible`,
    {
      ageDays,
      keepCount,
      ageEligible: ageEligible.length,
      countEligible: countEligible.length,
      hybridEligible: eligible.length,
    }
  );

  return eligible;
}

/**
 * Find sprints eligible for auto-archival
 */
async function findEligibleSprints(
  args: AutoArchiveSprintsArgs,
  config: ArchiveConfig
): Promise<SprintIndexEntry[]> {
  // Get completed sprints in active/
  const completedSprints = await findCompletedSprintsInActive();

  if (completedSprints.length === 0) {
    logger.info('No completed sprints in active/ directory');
    return [];
  }

  // Determine criteria and parameters
  const criteria: ArchiveCriteria =
    args.criteria || config.autoArchive.criteria;
  const ageDays = args.ageDays ?? config.autoArchive.ageDays;
  const keepCount = args.keepCount ?? config.autoArchive.keepCount;

  logger.info(`Applying ${criteria} criteria`, { ageDays, keepCount });

  // Apply criteria
  switch (criteria) {
    case 'age':
      return applyAgeCriteria(completedSprints, ageDays);

    case 'count':
      return applyCountCriteria(completedSprints, keepCount);

    case 'hybrid':
      return applyHybridCriteria(completedSprints, ageDays, keepCount);

    default:
      logger.warn(`Unknown criteria: ${criteria}, using hybrid`);
      return applyHybridCriteria(completedSprints, ageDays, keepCount);
  }
}

/**
 * Auto-Archive Sprints MCP tool handler
 *
 * Automatically archives completed sprints based on configurable criteria.
 * Supports age-based, count-based, and hybrid archival strategies.
 *
 * **Prerequisites:**
 * - Archive system must be enabled (archive-config.yaml exists with enabled: true)
 * - Auto-archive must be enabled in config (autoArchive.enabled: true)
 *
 * **What this tool does:**
 * 1. Loads archive configuration
 * 2. Finds completed sprints in planning/active/
 * 3. Applies archival criteria (age, count, or hybrid)
 * 4. Archives each eligible sprint (calls archive-sprint tool)
 * 5. Returns summary of archived sprints
 *
 * **Archival Criteria:**
 * - age: Archive sprints completed more than ageDays ago
 * - count: Keep only the keepCount most recent sprints, archive the rest
 * - hybrid: Sprint must meet BOTH age AND count criteria
 *
 * **Dry-Run Mode:**
 * Set dryRun: true to preview which sprints would be archived without making changes.
 *
 * @param args - Tool arguments object from MCP client
 * @param args.criteria - Archive criteria ('age' | 'count' | 'hybrid', uses config default if omitted)
 * @param args.ageDays - Age threshold in days (uses config default if omitted)
 * @param args.keepCount - Number of sprints to keep (uses config default if omitted)
 * @param args.dryRun - Preview archival without making changes (default: false)
 * @returns Promise resolving to MCP result with archival summary or validation errors
 *
 * @example
 * ```typescript
 * // Preview with default config
 * const result = await autoArchiveSprintsTool({
 *   dryRun: true
 * });
 *
 * // Use age-only criteria
 * const result = await autoArchiveSprintsTool({
 *   criteria: 'age',
 *   ageDays: 60,
 *   dryRun: false
 * });
 *
 * // Use count-only criteria
 * const result = await autoArchiveSprintsTool({
 *   criteria: 'count',
 *   keepCount: 5,
 *   dryRun: false
 * });
 * ```
 */
export async function autoArchiveSprintsTool(
  args?: Record<string, unknown>
): Promise<AutoArchiveSprintsResult> {
  const autoArchiveArgs: AutoArchiveSprintsArgs = {
    criteria: args?.criteria as 'age' | 'count' | 'hybrid' | undefined,
    ageDays: args?.ageDays as number | undefined,
    keepCount: args?.keepCount as number | undefined,
    dryRun: (args?.dryRun as boolean) || false,
  };

  const { criteria, ageDays, keepCount, dryRun } = autoArchiveArgs;

  logger.info(
    `${dryRun ? '[DRY-RUN] ' : ''}Auto-archiving sprints`,
    autoArchiveArgs
  );

  // Step 1: Load archive config
  const config = await loadArchiveConfig();

  if (!config) {
    return {
      content: [
        {
          type: 'text',
          text: [
            '❌ Auto-archive not available',
            '',
            '**Reason**: Archive configuration not found',
            '',
            '**Required**:',
            '- Run migration first: npm run migrate:archive',
            '- Ensure planning/archive-config.yaml exists',
          ].join('\n'),
        },
      ],
      isError: true,
    };
  }

  if (!config.enabled) {
    return {
      content: [
        {
          type: 'text',
          text: [
            '❌ Auto-archive not available',
            '',
            '**Reason**: Archive system is disabled',
            '',
            '**To enable**:',
            '1. Set `archive.enabled: true` in planning/archive-config.yaml',
            '2. Run migration if not already done: npm run migrate:archive',
          ].join('\n'),
        },
      ],
      isError: true,
    };
  }

  // Step 2: Find eligible sprints
  let eligible: SprintIndexEntry[];

  try {
    eligible = await findEligibleSprints(autoArchiveArgs, config);
  } catch (error) {
    logger.error('Failed to find eligible sprints', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: [
            '❌ Auto-archive failed',
            '',
            `**Error**: ${errorMessage}`,
            '',
            '**Failed at**: Finding eligible sprints',
          ].join('\n'),
        },
      ],
      isError: true,
    };
  }

  // No eligible sprints
  if (eligible.length === 0) {
    const usedCriteria = criteria || config.autoArchive.criteria;
    const usedAgeDays = ageDays ?? config.autoArchive.ageDays;
    const usedKeepCount = keepCount ?? config.autoArchive.keepCount;

    let resultText = `✅ No sprints eligible for auto-archiving\n\n`;

    resultText += `**Criteria**: ${usedCriteria}\n`;
    if (usedCriteria === 'age' || usedCriteria === 'hybrid') {
      resultText += `- Age threshold: ${usedAgeDays} days\n`;
    }
    if (usedCriteria === 'count' || usedCriteria === 'hybrid') {
      resultText += `- Keep count: ${usedKeepCount} sprints\n`;
    }

    resultText += `\n**Completed sprints in active/**: ${(await findCompletedSprintsInActive()).length}\n`;
    resultText += `**Eligible for archival**: 0\n`;

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  // Dry-run mode - show what would happen
  if (dryRun) {
    const usedCriteria = criteria || config.autoArchive.criteria;
    const usedAgeDays = ageDays ?? config.autoArchive.ageDays;
    const usedKeepCount = keepCount ?? config.autoArchive.keepCount;

    let resultText = `🔍 Dry-run: Auto-archive preview\n\n`;

    resultText += `**Would archive ${eligible.length} sprint${eligible.length === 1 ? '' : 's'}**:\n\n`;

    for (const sprint of eligible) {
      const completedDate = sprint.completedAt
        ? new Date(sprint.completedAt).toISOString().split('T')[0]
        : new Date(sprint.createdAt).toISOString().split('T')[0];

      resultText += `- ${sprint.id} (completed: ${completedDate})\n`;
    }

    resultText += `\n**Criteria**: ${usedCriteria}\n`;
    if (usedCriteria === 'age' || usedCriteria === 'hybrid') {
      resultText += `- Age threshold: ${usedAgeDays} days\n`;
    }
    if (usedCriteria === 'count' || usedCriteria === 'hybrid') {
      resultText += `- Keep count: ${usedKeepCount} sprints\n`;
    }

    resultText += `\n**To execute auto-archive**:\n`;
    resultText += `Run without dry-run flag: auto-archive-sprints\n`;

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  // Step 3: Archive each eligible sprint
  const archived: string[] = [];
  const failed: Array<{ sprintId: string; error: string }> = [];

  for (const sprint of eligible) {
    logger.info(`Auto-archiving sprint ${sprint.id}`);

    try {
      const result = await archiveSprintTool({
        sprintId: sprint.id,
        dryRun: false,
      });

      if (result.isError) {
        failed.push({
          sprintId: sprint.id,
          error: result.content[0]?.text || 'Unknown error',
        });
      } else {
        archived.push(sprint.id);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      failed.push({ sprintId: sprint.id, error: errorMessage });
      logger.error(`Failed to archive sprint ${sprint.id}`, error);
    }
  }

  // Build summary
  let resultText = '';

  if (archived.length > 0) {
    resultText += `✅ Auto-archived ${archived.length} sprint${archived.length === 1 ? '' : 's'}!\n\n`;

    resultText += `**Archived sprints**:\n`;
    for (const sprintId of archived) {
      resultText += `- ${sprintId}\n`;
    }
  }

  if (failed.length > 0) {
    if (archived.length > 0) {
      resultText += `\n`;
    }
    resultText += `⚠️  Failed to archive ${failed.length} sprint${failed.length === 1 ? '' : 's'}:\n\n`;

    for (const failure of failed) {
      resultText += `- ${failure.sprintId}: ${failure.error.split('\n')[0]}\n`;
    }
  }

  const usedCriteria = criteria || config.autoArchive.criteria;
  const usedAgeDays = ageDays ?? config.autoArchive.ageDays;
  const usedKeepCount = keepCount ?? config.autoArchive.keepCount;

  resultText += `\n**Criteria**: ${usedCriteria}\n`;
  if (usedCriteria === 'age' || usedCriteria === 'hybrid') {
    resultText += `- Age threshold: ${usedAgeDays} days\n`;
  }
  if (usedCriteria === 'count' || usedCriteria === 'hybrid') {
    resultText += `- Keep count: ${usedKeepCount} sprints\n`;
  }

  resultText += `\n**Summary**:\n`;
  resultText += `- Eligible: ${eligible.length}\n`;
  resultText += `- Archived: ${archived.length}\n`;
  resultText += `- Failed: ${failed.length}\n`;

  logger.info(
    `Auto-archive complete: ${archived.length} archived, ${failed.length} failed`
  );

  return {
    content: [
      {
        type: 'text',
        text: resultText,
      },
    ],
    isError: failed.length > 0 && archived.length === 0,
  };
}
