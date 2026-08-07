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
import { getPlanningDir, getConfigSummary } from '../common/project-config.js';
import type { SprintManifest } from '../types/sprint.js';
import type { ArchiveConfig } from '../types/archive-config.js';

interface CheckSprintStatusResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

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
  } catch {
    return false;
  }
}

/**
 * Get sprint manifest paths to scan for sprints (unified worktree model aware)
 *
 * Scans both:
 * 1. Worktrees: .worktrees/sprint-N/planning/sprint-N/ (active sprints)
 * 2. Main repo: planning/active/ or planning/ (completed/legacy sprints)
 *
 * Returns absolute paths to sprint directories containing manifests.
 */
async function getActiveSprintDirectories(): Promise<string[]> {
  const planningDir = getPlanningDir();
  const archiveEnabled = await isArchiveEnabled();
  const sprintDirs: string[] = [];

  // Step 1: Scan worktrees for active sprints (unified worktree model)
  logger.debug('Scanning worktrees for active sprints...');
  try {
    const worktreesDir = join(planningDir, '..', '.worktrees');
    if (await fileExists(worktreesDir)) {
      const worktreeEntries = await listDirectories(worktreesDir);
      for (const worktreeDir of worktreeEntries) {
        // Check if this looks like a sprint worktree
        const match = worktreeDir.match(/sprint-\d+-[a-z0-9]+$/);
        if (match) {
          // Look for planning/sprint-N/ inside the worktree
          const sprintId = match[0];
          const worktreePlanningDir = join(worktreeDir, 'planning', sprintId);
          const worktreeManifest = join(worktreePlanningDir, 'sprint-manifest.yaml');

          if (await fileExists(worktreeManifest)) {
            sprintDirs.push(worktreePlanningDir);
            logger.debug(`Found worktree sprint: ${sprintId} at ${worktreePlanningDir}`);
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`Failed to scan worktrees (non-fatal): ${error}`);
  }

  // Step 2: Scan main repo for completed/legacy sprints
  if (!archiveEnabled) {
    // Flat structure: scan all sprints in planning/
    logger.debug('Scanning flat structure in planning/');
    const mainRepoDirs = await listDirectories(planningDir);
    sprintDirs.push(...mainRepoDirs);
  } else {
    // Archive structure: scan only active/
    logger.debug('Scanning archive structure in planning/active/');
    const activeDir = join(planningDir, 'active');

    if (await fileExists(activeDir)) {
      const activeDirs = await listDirectories(activeDir);
      sprintDirs.push(...activeDirs);
    } else {
      logger.warn('Archive enabled but planning/active/ directory not found');
    }
  }

  logger.info(`Found ${sprintDirs.length} total sprint directories to check`);
  return sprintDirs;
}

export async function checkSprintStatusTool(
  _args?: Record<string, unknown>
): Promise<CheckSprintStatusResult> {
  logger.info('Checking sprint status...');

  const sprintDirs = await getActiveSprintDirectories();

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

  interface SprintWithLocation extends SprintManifest {
    _location?: 'worktree' | 'main-repo';
    _manifestPath?: string;
  }

  const activeSprints: SprintWithLocation[] = [];
  const completedSprints: SprintWithLocation[] = [];

  for (const sprintDir of sprintDirs) {
    const manifestPath = join(sprintDir, 'sprint-manifest.yaml');
    if (await fileExists(manifestPath)) {
      try {
        const manifestContent = await readFile(manifestPath);
        const manifest = parseYaml(manifestContent) as SprintWithLocation;

        // Determine location based on path
        const isWorktree = manifestPath.includes('.worktrees');
        manifest._location = isWorktree ? 'worktree' : 'main-repo';
        manifest._manifestPath = manifestPath;

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
      const locationEmoji = sprint._location === 'worktree' ? '📦' : '📁';
      const locationLabel = sprint._location === 'worktree' ? 'worktree (unified model)' : 'main repo (legacy)';

      resultText += `- **${sprint.id}**: ${sprint.title}\n`;
      resultText += `  Status: ${sprint.status}\n`;
      resultText += `  Goal: ${sprint.goal}\n`;
      resultText += `  Owner: ${sprint.owner}\n`;
      resultText += `  Branch: ${sprint.links?.branch || 'N/A'}\n`;
      resultText += `  Location: ${locationEmoji} ${locationLabel}\n`;
      if (sprint._manifestPath) {
        resultText += `  Manifest: ${sprint._manifestPath}\n`;
      }

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

  // Add SPRINT_ROOT configuration diagnostics
  const config = getConfigSummary();
  resultText += `\n---\n\n**Configuration Diagnostics**:\n`;
  resultText += `- SPRINT_ROOT environment variable: ${config.sprintRootSet ? '✅ SET' : '❌ NOT SET'}\n`;
  if (config.sprintRootSet && config.sprintRoot) {
    resultText += `- SPRINT_ROOT value: ${config.sprintRoot}\n`;
  }
  resultText += `- Resolved project root: ${config.projectRoot}\n`;
  resultText += `- Planning directory: ${config.planningDir}\n`;
  resultText += `- Sprint index path: ${config.indexPath}\n`;

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
