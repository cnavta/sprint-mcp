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
import {
  formatProtocolCitationsSection,
  type ProtocolCitation,
} from '../common/response-composer.js';

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
 * @param args Tool arguments (optional repair flag)
 * @returns Result with success message and sprint counts
 */
export async function regenerateSprintIndexTool(
  args?: Record<string, unknown>
): Promise<RegenerateSprintIndexResult> {
  const repair = args?.repair === true || args?.repair === 'true';

  if (repair) {
    logger.info('Regenerating sprint index from manifests (MCP tool) with repair mode enabled');
  } else {
    logger.info('Regenerating sprint index from manifests (MCP tool)');
  }

  try {
    // Regenerate index from all manifests
    const { index, skippedDirectories, repairedDirectories } = await regenerateSprintIndex({ repair });

    // Validate the regenerated index
    const validation = await validateSprintIndex();

    // Determine if we should show concise or detailed output
    const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0;
    const showDetailedOutput = repair || hasIssues || repairedDirectories > 0 || skippedDirectories > 0;

    let resultText = '';

    if (!showDetailedOutput) {
      // Concise output for clean, successful non-repair regeneration
      resultText = `✅ Sprint index regenerated successfully\n\n`;
      resultText += `${index.totalSprints} total (${index.activeSprints} active, ${index.completedSprints} completed)\n`;

      // Show active sprints if any
      const activeSprints = index.sprints.filter(s => s.status !== 'complete');
      if (activeSprints.length > 0) {
        resultText += `\n**Active:**\n`;
        activeSprints.forEach((sprint) => {
          const statusIcon = sprint.status === 'in-progress' ? '→' : '○';
          resultText += `${statusIcon} ${sprint.id}: ${sprint.title} (${sprint.status})\n`;
        });
      }

      // Build protocol citations for concise output
      const citations: ProtocolCitation[] = [
        {
          ref: '§2.3.2',
          description: `Sprint index regenerated from ${index.totalSprints} manifest(s) - index is derived cache, manifests are source of truth`,
          satisfied: true,
        },
      ];

      resultText += `\n---\n\n`;
      resultText += formatProtocolCitationsSection(citations);
    } else {
      // Detailed output for repair mode or when there are issues
      resultText = `✅ Sprint index regenerated successfully!\n\n`;
      resultText += `**Summary:**\n`;
      resultText += `- Total sprints: ${index.totalSprints}\n`;
      resultText += `- Active sprints: ${index.activeSprints}\n`;
      resultText += `- Completed sprints: ${index.completedSprints}\n`;
      if (repairedDirectories > 0) {
        resultText += `- ✅ Repaired directories (manifests created): ${repairedDirectories}\n`;
      }
      if (skippedDirectories > 0) {
        resultText += `- ⚠️  Skipped directories (no manifest): ${skippedDirectories}\n`;
      }
      resultText += `- Generated at: ${index.generatedAt}\n`;
      resultText += `\n`;

      if (repair && repairedDirectories > 0) {
        resultText += `**Repair mode enabled:**\n`;
        resultText += `Created ${repairedDirectories} minimal manifest(s) for sprint directories that were missing them.\n`;
        resultText += `These manifests have auto-generated default values and should be reviewed and updated.\n`;
        resultText += `\n`;
      }

      // Show sprint list only if there are <= 20 sprints, otherwise show summary
      if (index.totalSprints > 0 && index.totalSprints <= 20) {
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
      } else if (index.totalSprints > 20) {
        // For large indexes, show only active sprints and latest completed
        const activeSprints = index.sprints.filter(s => s.status !== 'complete');
        const completedSprints = index.sprints.filter(s => s.status === 'complete');

        if (activeSprints.length > 0) {
          resultText += `**Active sprints (${activeSprints.length}):**\n`;
          activeSprints.forEach((sprint) => {
            const statusIcon = sprint.status === 'in-progress' ? '→' : '○';
            resultText += `${statusIcon} **${sprint.id}**: ${sprint.title} (${sprint.status})\n`;
          });
          resultText += `\n`;
        }

        if (completedSprints.length > 0) {
          resultText += `**Recent completed sprints (last 5):**\n`;
          completedSprints.slice(-5).reverse().forEach((sprint) => {
            resultText += `✓ **${sprint.id}**: ${sprint.title}\n`;
          });
          resultText += `\n`;
        }
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

      // Build protocol citations for detailed output
      const citations: ProtocolCitation[] = [
        {
          ref: '§2.3.2',
          description: `Sprint index regenerated from ${index.totalSprints} manifest(s) - index is derived cache, manifests are source of truth`,
          satisfied: true,
        },
      ];

      if (repair && repairedDirectories > 0) {
        citations.push({
          ref: '§2.3.2',
          description: `Repair mode: ${repairedDirectories} manifest(s) auto-generated to restore index consistency`,
          satisfied: true,
        });
      }

      resultText += `\n---\n\n`;
      resultText += formatProtocolCitationsSection(citations);
    }

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
