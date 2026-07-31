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
import { listWorktrees, getWorktreePath } from '../common/git-utils.js';
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

  // Get all worktrees and identify sprint worktrees
  const allWorktrees = listWorktrees();
  const activeSprintIds = new Set(activeSprints.map(s => s.id));
  const completedSprintIds = new Set(completedSprints.map(s => s.id));

  // Identify orphaned worktrees (sprint is complete but worktree still exists)
  const orphanedWorktrees = allWorktrees.filter(wt => {
    // Check if this is a sprint worktree
    const match = wt.path.match(/\.worktrees\/(sprint-\d+-[a-z0-9]+)/);
    if (match) {
      const sprintId = match[1];
      // Orphaned if sprint is completed or doesn't exist
      return completedSprintIds.has(sprintId) || (!activeSprintIds.has(sprintId) && !completedSprintIds.has(sprintId));
    }
    return false;
  });

  let resultText = '';

  if (activeSprints.length > 0) {
    resultText += `⚠️  Found ${activeSprints.length} active sprint(s):\n\n`;
    activeSprints.forEach((sprint) => {
      resultText += `- **${sprint.id}**: ${sprint.title}\n`;
      resultText += `  Status: ${sprint.status}\n`;
      resultText += `  Goal: ${sprint.goal}\n`;
      resultText += `  Owner: ${sprint.owner}\n`;
      resultText += `  Branch: ${sprint.links?.branch || 'N/A'}\n`;

      // Check if worktree exists for this sprint
      const expectedWorktreePath = getWorktreePath(sprint.id);
      const worktree = allWorktrees.find(wt => wt.path.includes(sprint.id));

      if (worktree) {
        resultText += `  Worktree: ${worktree.path} (branch: ${worktree.branch})\n\n`;
      } else {
        resultText += `  Worktree: ⚠️  Not found at expected path ${expectedWorktreePath}\n\n`;
      }
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

  // Show orphaned worktrees
  if (orphanedWorktrees.length > 0) {
    resultText += `\n⚠️  Orphaned worktrees detected (${orphanedWorktrees.length}):\n`;
    orphanedWorktrees.forEach(wt => {
      const match = wt.path.match(/\.worktrees\/(sprint-\d+-[a-z0-9]+)/);
      const sprintId = match ? match[1] : 'unknown';
      resultText += `  - ${wt.path} (sprint: ${sprintId}, branch: ${wt.branch})\n`;
    });
    resultText += `\nℹ️  These worktrees can be removed with: git worktree remove <path>\n`;
  }

  logger.info(`Sprint status check complete: ${activeSprints.length} active, ${completedSprints.length} completed, ${orphanedWorktrees.length} orphaned worktrees`);

  return {
    content: [
      {
        type: 'text',
        text: resultText,
      },
    ],
  };
}
