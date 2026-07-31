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
import { validateSprintIndex } from '../common/sprint-index-validator.js';

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

    // Validate the regenerated index
    const validation = await validateSprintIndex();

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

    // Include validation results
    resultText += `\n**Validation:**\n`;
    if (validation.valid && validation.warnings.length === 0) {
      resultText += `✅ All validation checks passed\n`;
    } else if (validation.valid && validation.warnings.length > 0) {
      resultText += `✅ Validation passed (${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''})\n`;
    } else {
      resultText += `❌ Validation failed (${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}, ${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''})\n`;
    }

    if (validation.errors.length > 0) {
      resultText += `\n**Errors (${validation.errors.length}):**\n`;
      validation.errors.forEach((error) => {
        resultText += `  ❌ **${error.code}**: ${error.message}\n`;
        if (error.sprintId) {
          resultText += `     Sprint: ${error.sprintId}\n`;
        }
      });
    }

    if (validation.warnings.length > 0) {
      resultText += `\n**Warnings (${validation.warnings.length}):**\n`;
      validation.warnings.forEach((warning) => {
        resultText += `  ⚠️  **${warning.code}**: ${warning.message}\n`;
        if (warning.sprintId) {
          resultText += `     Sprint: ${warning.sprintId}\n`;
        }
      });
    }

    if (!validation.valid) {
      resultText += `\n**Remediation:**\n`;
      resultText += `To fix validation errors, regenerate the index or manually correct the issues.\n`;
      resultText += `Most issues can be resolved by running this tool again after fixing manifest files.\n`;
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
