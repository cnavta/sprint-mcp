/**
 * Start Sprint Tool
 *
 * Initialize a new sprint with manifest and directory structure.
 * Implements Sprint Protocol section 2.2: Sprint Start
 */

import { join } from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { getPlanningDir } from '../common/path-utils.js';
import { ensureDir, writeFile } from '../common/file-utils.js';
import type { SprintManifest } from '../types/sprint.js';
import type { SprintIndexEntry } from '../types/sprint-index.js';
import { checkSprintStatusTool } from './check-sprint-status.js';
import { verifyMainBranch, createWorktree, getWorktreePath } from '../common/git-utils.js';
import { addSprintToIndex } from '../common/sprint-index-manager.js';
import { validateSprintIndex } from '../common/sprint-index-validator.js';

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
 * Get the next sprint number by checking existing sprints
 */
async function getNextSprintNumber(): Promise<number> {
  const planningDir = getPlanningDir();
  try {
    const { readdir } = await import('fs/promises');
    const entries = await readdir(planningDir, { withFileTypes: true });
    const sprintNumbers = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('sprint-'))
      .map((entry) => {
        const match = entry.name.match(/^sprint-(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((num) => !isNaN(num));

    return sprintNumbers.length > 0 ? Math.max(...sprintNumbers) + 1 : 1;
  } catch {
    // Planning directory doesn't exist yet
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

  // Step 3: Create sprint directory
  const planningDir = getPlanningDir();
  const sprintDir = join(planningDir, sprintId);
  await ensureDir(sprintDir);
  logger.info(`Created sprint directory: ${sprintDir}`);

  // Step 4: Create git worktree with feature branch
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
**Interpretation**: User initiated sprint via MCP start-sprint tool

**Details**:
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}

**Actions**:
- Created sprint directory: planning/${sprintId}/
- Created git worktree: .worktrees/${sprintId}/
- Created feature branch: ${branchName}
- Created sprint-manifest.yaml

**Artifacts**:
- planning/${sprintId}/sprint-manifest.yaml
- planning/${sprintId}/request-log.md
- .worktrees/${sprintId}/ (git worktree on branch ${branchName})
`;

  const requestLogPath = join(sprintDir, 'request-log.md');
  await writeFile(requestLogPath, requestLogContent);
  logger.info(`Created request log: ${requestLogPath}`);

  // Step 7: Add sprint to index
  try {
    const indexEntry: SprintIndexEntry = {
      id: sprintId,
      title: sprintArgs.title,
      status: manifest.status,
      owner: sprintArgs.owner,
      createdAt: manifest.createdAt,
      manifestPath: `planning/${sprintId}/sprint-manifest.yaml`,
      branch: branchName,
      worktreePath: `.worktrees/${sprintId}`,
    };

    await addSprintToIndex(indexEntry);
    logger.info(`Added sprint ${sprintId} to index`);
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

  // Return success message
  const resultText = `✅ Sprint ${sprintId} initialized successfully!

**Sprint Details**:
- ID: ${sprintId}
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}
- Status: planning
- Planning directory: planning/${sprintId}/
- Worktree: .worktrees/${sprintId}/
- Branch: ${branchName}

**Next Steps**:
1. Change to sprint worktree: \`cd .worktrees/${sprintId}/\`
2. Verify branch: \`git branch --show-current\` (should show: ${branchName})
3. Create implementation-plan.md with sprint execution details
4. Get user approval for the plan before implementing
5. Update sprint status to 'in-progress' when ready

**Artifacts Created**:
- planning/${sprintId}/sprint-manifest.yaml
- planning/${sprintId}/request-log.md
- .worktrees/${sprintId}/ (isolated worktree on branch ${branchName})
- planning/sprint-index.yaml (updated with new sprint entry)

${validationStatus ? `\n${validationStatus}\n` : ''}
**Note**: Main worktree remains on main branch. All sprint work happens in .worktrees/${sprintId}/

Sprint Protocol rule S1 satisfied: Sprint started on explicit user request.
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
