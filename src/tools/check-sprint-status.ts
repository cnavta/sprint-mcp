/**
 * Check Sprint Status Tool
 *
 * Verifies current sprint state and checks for active sprints.
 * Implements Sprint Protocol rule S3: Only one sprint may be active at a time.
 */

import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { listDirectories, fileExists, readFile } from '../common/file-utils.js';
import type { SprintManifest } from '../types/sprint.js';

interface CheckSprintStatusResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export async function checkSprintStatusTool(
  _args?: Record<string, unknown>
): Promise<CheckSprintStatusResult> {
  logger.info('Checking sprint status...');

  const planningDir = join(process.cwd(), 'planning');
  const sprintDirs = await listDirectories(planningDir);

  if (sprintDirs.length === 0) {
    logger.info('No sprints found');
    return {
      content: [
        {
          type: 'text',
          text: 'No sprints found. You can start a new sprint with the start-sprint tool.',
        },
      ],
    };
  }

  const activeSprints: SprintManifest[] = [];
  const completedSprints: SprintManifest[] = [];

  for (const sprintDir of sprintDirs) {
    const manifestPath = join(sprintDir, 'sprint-manifest.yaml');
    if (await fileExists(manifestPath)) {
      try {
        const manifestContent = await readFile(manifestPath);
        const manifest = parseYaml(manifestContent) as SprintManifest;

        if (manifest.status !== 'complete') {
          activeSprints.push(manifest);
        } else {
          completedSprints.push(manifest);
        }
      } catch (error) {
        logger.warn(`Failed to parse manifest at ${manifestPath}`, error);
      }
    }
  }

  let resultText = '';

  if (activeSprints.length > 0) {
    resultText += `⚠️  Found ${activeSprints.length} active sprint(s):\n\n`;
    activeSprints.forEach((sprint) => {
      resultText += `- **${sprint.id}**: ${sprint.title}\n`;
      resultText += `  Status: ${sprint.status}\n`;
      resultText += `  Goal: ${sprint.goal}\n`;
      resultText += `  Owner: ${sprint.owner}\n`;
      resultText += `  Branch: ${sprint.links?.branch || 'N/A'}\n\n`;
    });

    if (activeSprints.length > 1) {
      resultText += `\n⚠️  WARNING: Multiple active sprints detected. Sprint Protocol rule S3 states only one sprint may be active at a time.\n`;
    } else {
      resultText += `\nℹ️  Cannot start a new sprint while sprint ${activeSprints[0].id} is active. Complete it first or force-complete it.\n`;
    }
  } else {
    resultText += `✅ No active sprints. Ready to start a new sprint.\n\n`;
  }

  if (completedSprints.length > 0) {
    resultText += `\n📊 Completed sprints: ${completedSprints.length}\n`;
  }

  logger.info(`Sprint status check complete: ${activeSprints.length} active, ${completedSprints.length} completed`);

  return {
    content: [
      {
        type: 'text',
        text: resultText,
      },
    ],
  };
}
