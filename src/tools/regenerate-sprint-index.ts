/**
 * Regenerate Sprint Index Tool
 *
 * Rebuilds the sprint index (planning/sprint-index.yaml) from scratch by
 * scanning all sprint manifests in the planning directory.
 *
 * This is the recovery mechanism if the index becomes corrupted or out of sync.
 */

import { logger } from '../common/logger.js';
import { regenerateSprintIndex } from '../common/sprint-index-manager.js';

interface RegenerateSprintIndexResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Regenerate sprint index MCP tool handler
 *
 * Scans the planning directory for all sprint manifests, extracts metadata,
 * and rebuilds the sprint index from scratch.
 *
 * @param _args Tool arguments (none required)
 * @returns Result with success message and sprint counts
 */
export async function regenerateSprintIndexTool(
  _args?: Record<string, unknown>
): Promise<RegenerateSprintIndexResult> {
  logger.info('Regenerating sprint index from manifests (MCP tool)');

  try {
    // Regenerate index from all manifests
    const index = await regenerateSprintIndex();

    // Build success message
    let resultText = `✅ Sprint index regenerated successfully!\n\n`;
    resultText += `**Summary:**\n`;
    resultText += `- Total sprints: ${index.totalSprints}\n`;
    resultText += `- Active sprints: ${index.activeSprints}\n`;
    resultText += `- Completed sprints: ${index.completedSprints}\n`;
    resultText += `- Generated at: ${index.generatedAt}\n`;
    resultText += `\n`;

    if (index.totalSprints > 0) {
      resultText += `**Sprints in index:**\n`;
      index.sprints.forEach((sprint) => {
        const statusIcon =
          sprint.status === 'complete'
            ? '✓'
            : sprint.status === 'in-progress'
            ? '→'
            : '○';
        resultText += `${statusIcon} **${sprint.id}**: ${sprint.title} (${sprint.status})\n`;
      });
      resultText += `\n`;
    }

    resultText += `**Statistics:**\n`;
    resultText += `- By status:\n`;
    for (const [status, count] of Object.entries(index.statistics.byStatus)) {
      if (count > 0) {
        resultText += `  - ${status}: ${count}\n`;
      }
    }

    if (
      index.statistics.byCompletionMode.normal > 0 ||
      index.statistics.byCompletionMode.forced > 0
    ) {
      resultText += `- By completion mode:\n`;
      resultText += `  - normal: ${index.statistics.byCompletionMode.normal}\n`;
      resultText += `  - forced: ${index.statistics.byCompletionMode.forced}\n`;
    }

    if (index.statistics.averageSprintDuration) {
      resultText += `- Average sprint duration: ${index.statistics.averageSprintDuration}\n`;
    }

    resultText += `\n📄 Index file: planning/sprint-index.yaml\n`;

    logger.info(
      `Sprint index regenerated successfully: ${index.totalSprints} sprints`
    );

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to regenerate sprint index', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to regenerate sprint index\n\nError: ${errorMessage}\n\nPlease check that:\n- The planning directory exists\n- Sprint manifests are valid YAML\n- You have write permissions to planning/sprint-index.yaml`,
        },
      ],
      isError: true,
    };
  }
}
