/**
 * Start Sprint Tool
 *
 * Initialize a new sprint with manifest and directory structure.
 * Implements Sprint Protocol section 2.2: Sprint Start
 */

import { join } from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { ensureDir, writeFile } from '../common/file-utils.js';
import type { SprintManifest } from '../types/sprint.js';
import { checkSprintStatusTool } from './check-sprint-status.js';

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
  const planningDir = join(process.cwd(), 'planning');
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

  // Step 1: Check for active sprints (Rule S3)
  const statusResult = await checkSprintStatusTool({});
  const statusText = statusResult.content[0].text;

  if (statusText.includes('active sprint')) {
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
  const planningDir = join(process.cwd(), 'planning');
  const sprintDir = join(planningDir, sprintId);
  await ensureDir(sprintDir);
  logger.info(`Created sprint directory: ${sprintDir}`);

  // Step 4: Create feature branch name (will be created via git externally)
  const branchName = `feature/${sprintId}-${sprintArgs.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 30)}`;

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
- Created sprint-manifest.yaml
- Suggested feature branch: ${branchName}

**Files Created**:
- planning/${sprintId}/sprint-manifest.yaml
- planning/${sprintId}/request-log.md
`;

  const requestLogPath = join(sprintDir, 'request-log.md');
  await writeFile(requestLogPath, requestLogContent);
  logger.info(`Created request log: ${requestLogPath}`);

  // Return success message
  const resultText = `✅ Sprint ${sprintId} initialized successfully!

**Sprint Details**:
- ID: ${sprintId}
- Title: ${sprintArgs.title}
- Goal: ${sprintArgs.goal}
- Owner: ${sprintArgs.owner}
- Status: planning
- Directory: planning/${sprintId}/

**Next Steps**:
1. Create feature branch: \`git checkout -b ${branchName}\`
2. Create implementation-plan.md with sprint execution details
3. Get user approval for the plan before implementing
4. Update sprint status to 'in-progress' when ready

**Files Created**:
- planning/${sprintId}/sprint-manifest.yaml
- planning/${sprintId}/request-log.md

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
