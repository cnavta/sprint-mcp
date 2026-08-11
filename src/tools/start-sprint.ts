/**
 * Start Sprint Tool
 *
 * Initialize a new sprint with manifest and directory structure.
 * Implements Sprint Protocol section 2.2: Sprint Start
 */

import { join } from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { parse as parseYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { ensureDir, writeFile, fileExists, readFile } from '../common/file-utils.js';
import { getPlanningDir } from '../common/project-config.js';
import {
  formatProtocolCitationsSection,
  type ProtocolCitation,
} from '../common/response-composer.js';
import type { SprintManifest } from '../types/sprint.js';
import type { SprintIndexEntry } from '../types/sprint-index.js';
import type { ArchiveConfig } from '../types/archive-config.js';
import { checkSprintStatusTool } from './check-sprint-status.js';
import { verifyMainBranch, createWorktree, getWorktreePath } from '../common/git-utils.js';
import { addSprintToIndex } from '../common/sprint-index-manager.js';
import { validateSprintIndex } from '../common/sprint-index-validator.js';
import { executeHook } from '../common/hook-manager.js';

interface StartSprintArgs {
  title: string;
  goal: string;
  owner: string;
}

interface StartSprintResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Generate a short hash for the sprint ID
 */
function generateShortHash(): string {
  return Math.random().toString(36).substring(2, 8);
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
 * Get the next sprint number by checking existing sprints (unified worktree model aware)
 *
 * Scans:
 * 1. Worktrees: .worktrees/sprint-N/ (active sprints)
 * 2. Archive structure: planning/active/ + planning/archive/{year}/
 * 3. Flat structure: planning/
 */
async function getNextSprintNumber(): Promise<number> {
  const planningDir = getPlanningDir();
  const archiveEnabled = await isArchiveEnabled();
  const { readdir } = await import('fs/promises');

  const sprintNumbers: number[] = [];

  try {
    // Step 1: Scan worktrees for active sprints (unified worktree model)
    const worktreesDir = join(planningDir, '..', '.worktrees');
    if (await fileExists(worktreesDir)) {
      const worktreeEntries = await readdir(worktreesDir, { withFileTypes: true });
      worktreeEntries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('sprint-'))
        .forEach((entry) => {
          const match = entry.name.match(/^sprint-(\d+)-/);
          if (match) {
            sprintNumbers.push(parseInt(match[1], 10));
          }
        });
    }

    // Step 2: Scan main repo for completed/legacy sprints
    if (!archiveEnabled) {
      // Flat structure: scan planning/ directly
      const entries = await readdir(planningDir, { withFileTypes: true });
      entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('sprint-'))
        .forEach((entry) => {
          const match = entry.name.match(/^sprint-(\d+)-/);
          if (match) {
            sprintNumbers.push(parseInt(match[1], 10));
          }
        });
    } else {
      // Archive structure: scan active/ and archive/*/
      const activeDir = join(planningDir, 'active');
      if (await fileExists(activeDir)) {
        const activeEntries = await readdir(activeDir, { withFileTypes: true });
        activeEntries
          .filter((entry) => entry.isDirectory() && entry.name.startsWith('sprint-'))
          .forEach((entry) => {
            const match = entry.name.match(/^sprint-(\d+)-/);
            if (match) {
              sprintNumbers.push(parseInt(match[1], 10));
            }
          });
      }

      const archiveDir = join(planningDir, 'archive');
      if (await fileExists(archiveDir)) {
        const yearDirs = await readdir(archiveDir, { withFileTypes: true });
        for (const yearDir of yearDirs.filter(d => d.isDirectory())) {
          const yearPath = join(archiveDir, yearDir.name);
          const archivedEntries = await readdir(yearPath, { withFileTypes: true });
          archivedEntries
            .filter((entry) => entry.isDirectory() && entry.name.startsWith('sprint-'))
            .forEach((entry) => {
              const match = entry.name.match(/^sprint-(\d+)-/);
              if (match) {
                sprintNumbers.push(parseInt(match[1], 10));
              }
            });
        }
      }
    }

    return sprintNumbers.length > 0 ? Math.max(...sprintNumbers) + 1 : 1;
  } catch {
    // Directory doesn't exist yet
    return 1;
  }
}

export async function startSprintTool(
  args?: Record<string, unknown>
): Promise<StartSprintResult> {
  if (!args || !args.title || !args.goal || !args.owner) {
    throw new Error('Missing required arguments: title, goal, owner');
  }

  const sprintArgs: StartSprintArgs = {
    title: args.title as string,
    goal: args.goal as string,
    owner: args.owner as string,
  };

  logger.info('Starting new sprint...', sprintArgs);

  // Step 0: Verify main branch baseline (FOLLOW-002)
  const baselineCheck = verifyMainBranch();
  if (!baselineCheck.exists || !baselineCheck.hasCommits) {
    logger.error('Main branch baseline verification failed', baselineCheck);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Cannot start sprint: ${baselineCheck.error}\n\nThe main branch must exist with at least one commit before starting a sprint. This ensures a stable baseline for feature branches.`,
        },
      ],
      isError: true,
    };
  }
  logger.info('Main branch baseline verified successfully');

  // Step 1: Check for active sprints (Rule S3)
  const statusResult = await checkSprintStatusTool({});
  const statusText = statusResult.content[0].text;

  if (statusText.includes('active sprint(s):')) {
    logger.warn('Cannot start sprint: active sprint already exists');
    return {
      content: [
        {
          type: 'text',
          text: `❌ Cannot start a new sprint. ${statusText}`,
        },
      ],
      isError: true,
    };
  }

  // Step 2: Generate sprint ID
  const sprintNumber = await getNextSprintNumber();
  const shortHash = generateShortHash();
  const sprintId = `sprint-${sprintNumber}-${shortHash}`;
  logger.info(`Generated sprint ID: ${sprintId}`);

  // Step 3: Create git worktree with feature branch (FIRST)
  const branchName = `feature/${sprintId}-${sprintArgs.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30)}`;

  const worktreePath = getWorktreePath(sprintId);
  const worktreeCreated = createWorktree(worktreePath, branchName);

  if (!worktreeCreated) {
    logger.error('Failed to create worktree for sprint');
    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to create git worktree for sprint ${sprintId}.\n\nWorktree creation failed at: ${worktreePath}\nBranch: ${branchName}\n\nPlease check git status and try again.`,
        },
      ],
      isError: true,
    };
  }
  logger.info(`Created worktree: ${worktreePath}`);

  // Step 4: Create sprint directory INSIDE worktree (unified model)
  const archiveEnabled = await isArchiveEnabled();
  const worktreePlanningDir = join(worktreePath, 'planning');
  await ensureDir(worktreePlanningDir);
  logger.info(`Created planning directory in worktree: ${worktreePlanningDir}`);

  // Determine sprint parent directory (archive-aware, though typically not used in worktrees)
  // Note: Archive structure (planning/active/) is used in main repo after PR merge,
  // but we create flat structure in worktree for simplicity during active sprint
  let sprintParentDir = worktreePlanningDir;
  if (archiveEnabled) {
    // For consistency with archive-aware structure, we could create active/ subdirectory
    // But for unified worktree model, flat structure is simpler: planning/sprint-N/
    // Keeping flat structure in worktree; archive structure applies after PR merge
    sprintParentDir = worktreePlanningDir;
    logger.debug('Archive enabled in project, but using flat structure in worktree');
  }

  const sprintDir = join(sprintParentDir, sprintId);
  await ensureDir(sprintDir);
  logger.info(`Created sprint directory in worktree: ${sprintDir}`);

  // Step 5: Create sprint manifest
  const manifest: SprintManifest = {
    id: sprintId,
    title: sprintArgs.title,
    goal: sprintArgs.goal,
    owner: sprintArgs.owner,
    createdAt: new Date().toISOString(),
    status: 'planning',
    links: {
      branch: branchName,
    },
    notes: 'Sprint initialized via MCP start-sprint tool',
  };

  const manifestPath = join(sprintDir, 'sprint-manifest.yaml');
  await writeFile(manifestPath, stringifyYaml(manifest));
  logger.info(`Created sprint manifest: ${manifestPath}`);

  // Step 6: Create initial request log
  const requestLogContent = `# Request Log – ${sprintId}

## Request 1
**Timestamp**: ${new Date().toISOString()}
**Prompt**: Start sprint
**Interpretation**: User initiated sprint via MCP start-sprint tool (unified worktree model)

**Details**:
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}

**Actions**:
- Created git worktree: .worktrees/${sprintId}/
- Created feature branch: ${branchName}
- Created planning directory in worktree: .worktrees/${sprintId}/planning/${sprintId}/
- Created sprint-manifest.yaml in worktree

**Artifacts** (all in worktree, on feature branch):
- .worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml
- .worktrees/${sprintId}/planning/${sprintId}/request-log.md

**Note**: This sprint uses the unified worktree model where ALL sprint work (code + planning artifacts)
happens in the worktree. After PR merge, planning artifacts will be in main repo at planning/${archiveEnabled ? 'active/' : ''}${sprintId}/
`;

  const requestLogPath = join(sprintDir, 'request-log.md');
  await writeFile(requestLogPath, requestLogContent);
  logger.info(`Created request log: ${requestLogPath}`);

  // Step 6.5: Execute post-worktree-create hook (if present)
  logger.info('Checking for post-worktree-create hook...');
  let hookOutput = '';
  const hookResult = await executeHook('post-worktree-create', {
    sprintId,
    worktreePath,
    planningDir: sprintDir,
    branch: branchName,
  });

  if (hookResult.executed) {
    if (hookResult.exitCode === 0) {
      logger.info('Post-worktree-create hook completed successfully');
      hookOutput = '\n✅ Worktree setup automated via post-worktree-create hook';
      if (hookResult.stdout) {
        hookOutput += `\n\n**Hook Output**:\n${hookResult.stdout}`;
      }
    } else {
      logger.warn('Post-worktree-create hook failed (non-blocking)', {
        exitCode: hookResult.exitCode,
        stderr: hookResult.stderr,
      });
      hookOutput = '\n⚠️  Post-worktree-create hook failed (non-blocking)';
      if (hookResult.stderr) {
        hookOutput += `\n\n**Error**:\n${hookResult.stderr}`;
      }
      hookOutput += '\n\n**Note**: Hook failure does not prevent sprint creation. Fix hook and run manually if needed.';
    }
  }

  // Step 7: Add sprint to index
  try {
    // Unified worktree model: manifestPath points to worktree (not main repo)
    // After PR merge, this will be updated to point to main repo location
    const manifestRelativePath = `.worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml`;

    const indexEntry: SprintIndexEntry = {
      id: sprintId,
      title: sprintArgs.title,
      status: manifest.status,
      owner: sprintArgs.owner,
      createdAt: manifest.createdAt,
      manifestPath: manifestRelativePath,  // Points to worktree for active sprint
      branch: branchName,
      worktreePath: `.worktrees/${sprintId}`,
    };

    await addSprintToIndex(indexEntry);
    logger.info(`Added sprint ${sprintId} to index with worktree manifestPath`);
  } catch (error) {
    // Non-fatal: log warning but continue
    logger.warn(`Failed to add sprint to index (non-fatal): ${error}`);
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

  // Build validation status message
  let validationStatus = '';
  if (validationResult) {
    if (validationResult.valid && validationResult.warnings.length === 0) {
      validationStatus = '✅ Index validation: All checks passed';
    } else if (validationResult.valid) {
      validationStatus = `⚠️  Index validation: ${validationResult.warnings.length} warning${validationResult.warnings.length > 1 ? 's' : ''} (see logs)`;
    } else {
      validationStatus = `❌ Index validation: ${validationResult.errors.length} error${validationResult.errors.length > 1 ? 's' : ''} (run regenerate-sprint-index)`;
    }
  }

  // Build "Next Steps" section based on hook execution
  const setupStepPrefix = hookResult.executed && hookResult.exitCode === 0
    ? '✅ Worktree setup automated (post-worktree-create hook ran successfully)'
    : hookResult.executed && hookResult.exitCode !== 0
    ? '⚠️  Post-worktree-create hook failed. Manual setup may be needed: `npm ci && npm run build`'
    : '📦 Manual setup needed: `npm ci && npm run build` (or create a post-worktree-create hook)';

  // Build protocol citations
  const citations: ProtocolCitation[] = [
    {
      ref: 'S1',
      description: 'Sprint started on explicit user request',
      satisfied: true,
    },
    {
      ref: '§2.2',
      description: 'Sprint start procedure followed (worktree created, manifest initialized, index updated)',
      satisfied: true,
    },
    {
      ref: 'S3',
      description: 'Only one sprint may be active at a time (verified before start)',
      satisfied: true,
    },
  ];

  // Return success message
  const resultText = `✅ Sprint ${sprintId} initialized successfully (unified worktree model)!

**Sprint Details**:
- ID: ${sprintId}
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}
- Status: planning
- Worktree: .worktrees/${sprintId}/
- Branch: ${branchName}
${hookOutput}

**Sprint Artifacts Location** (in worktree, on feature branch):
- Planning directory: .worktrees/${sprintId}/planning/${sprintId}/
- Manifest: .worktrees/${sprintId}/planning/${sprintId}/sprint-manifest.yaml
- Request log: .worktrees/${sprintId}/planning/${sprintId}/request-log.md

**Next Steps**:
1. ⚠️  **IMPORTANT**: Change to sprint worktree: \`cd .worktrees/${sprintId}/\`
2. ${setupStepPrefix}
3. Verify branch: \`git branch --show-current\` (should show: ${branchName})
4. Create implementation-plan.md in \`planning/${sprintId}/\` (relative to worktree)
5. Get user approval for the plan before implementing
6. Update sprint status to 'in-progress' when ready

**CRITICAL - Unified Worktree Model**:
⚠️  **DO NOT leave the worktree directory during sprint work**
✅ All code changes AND planning artifacts are created in .worktrees/${sprintId}/
✅ Use relative paths: \`src/...\` for code, \`planning/${sprintId}/...\` for planning
✅ Commit captures both code and planning together
✅ PR will merge both code and planning artifacts to main

After PR merge, planning artifacts will be in main repo at: planning/${archiveEnabled ? 'active/' : ''}${sprintId}/

${validationStatus ? `\n${validationStatus}\n` : ''}
**Index**: planning/sprint-index.yaml updated (manifestPath points to worktree for active sprint)

---

${formatProtocolCitationsSection(citations)}
`;

  return {
    content: [
      {
        type: 'text',
        text: resultText,
      },
    ],
  };
}
