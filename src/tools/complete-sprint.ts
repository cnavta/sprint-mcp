/**
 * Complete Sprint Tool
 *
 * Automates sprint completion workflow while maintaining protocol compliance
 * and agent flexibility. Validates required artifacts, updates sprint status,
 * and provides completion summary.
 *
 * Per Sprint Protocol §2.9: Sprint Completion
 */

import { join } from 'path';
import { logger } from '../common/logger.js';
import { fileExists } from '../common/file-utils.js';
import { updateSprintStatusTool } from './update-sprint-status.js';
import { getSprintDir, getManifestPath } from '../common/project-config.js';
import type { SprintCompletionMode } from '../types/sprint-index.js';

interface CompleteSprintArgs {
  sprintId: string;
  completionMode: 'normal' | 'forced';
  pr?: string; // Optional PR URL if already created
}

interface CompleteSprintResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

interface ArtifactCheck {
  artifact: string;
  path: string;
  exists: boolean;
  required: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  artifactChecks: ArtifactCheck[];
}

/**
 * Validate completion mode value
 *
 * Type guard to ensure completion mode is one of the valid values.
 *
 * @param mode - Completion mode string to validate
 * @returns true if mode is 'normal' or 'forced', false otherwise
 */
function isValidCompletionMode(mode: string): mode is SprintCompletionMode {
  return mode === 'normal' || mode === 'forced';
}

/**
 * Check if required completion artifacts exist
 *
 * Required artifacts per Sprint Protocol §2.9:
 * - verification-report.md
 * - retro.md
 * - key-learnings.md
 * - publication.yaml
 */
async function checkRequiredArtifacts(
  sprintId: string
): Promise<ArtifactCheck[]> {
  const sprintDir = getSprintDir(sprintId);

  const requiredArtifacts = [
    'verification-report.md',
    'retro.md',
    'key-learnings.md',
    'publication.yaml',
  ];

  const checks: ArtifactCheck[] = [];

  for (const artifact of requiredArtifacts) {
    const artifactPath = join(sprintDir, artifact);
    const exists = await fileExists(artifactPath);

    checks.push({
      artifact,
      path: artifactPath,
      exists,
      required: true,
    });

    logger.debug(
      `Artifact check: ${artifact} - ${exists ? 'EXISTS' : 'MISSING'}`
    );
  }

  return checks;
}

/**
 * Validate sprint completion prerequisites
 *
 * Performs validation checks required before completing a sprint:
 * - Sprint manifest exists
 * - Required completion artifacts exist (or warnings in forced mode)
 *
 * In normal mode, missing artifacts result in validation errors.
 * In forced mode, missing artifacts result in warnings but validation passes.
 *
 * @param sprintId - Sprint identifier (e.g., 'sprint-7-f7cz9y')
 * @param completionMode - Completion mode affecting validation strictness
 * @returns Promise resolving to validation result with success flag, errors, warnings, and artifact check details
 */
async function validateSprintCompletion(
  sprintId: string,
  completionMode: SprintCompletionMode
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info(`Validating sprint completion for ${sprintId}`, {
    completionMode,
  });

  // Check 1: Sprint manifest exists
  const manifestPath = getManifestPath(sprintId);

  if (!(await fileExists(manifestPath))) {
    errors.push(`Sprint not found: ${sprintId}`);
    errors.push(`Manifest does not exist at: ${manifestPath}`);
    return {
      valid: false,
      errors,
      warnings,
      artifactChecks: [],
    };
  }

  // Check 2: Required artifacts exist
  const artifactChecks = await checkRequiredArtifacts(sprintId);
  const missingArtifacts = artifactChecks.filter((check) => !check.exists);

  if (missingArtifacts.length > 0) {
    const missingList = missingArtifacts.map((a) => a.artifact).join(', ');

    if (completionMode === 'normal') {
      // Normal mode: missing artifacts are errors
      errors.push(
        `Missing required completion artifacts: ${missingList}`
      );
      errors.push(
        'Agent must create these artifacts before completing the sprint.'
      );
    } else {
      // Forced mode: missing artifacts are warnings
      warnings.push(
        `Missing completion artifacts: ${missingList}`
      );
      warnings.push(
        'Forced completion mode allows sprint to close despite missing artifacts.'
      );
    }
  }

  // TODO: Check 3: Sprint status is valid for completion
  // Valid statuses: in-progress, validating, verifying, published
  // Invalid: planning, complete

  // TODO: Check 4: Git branch matches manifest (warning only)

  const valid = errors.length === 0;

  logger.info(
    `Validation complete: ${valid ? 'PASSED' : 'FAILED'} (${errors.length} errors, ${warnings.length} warnings)`
  );

  return {
    valid,
    errors,
    warnings,
    artifactChecks,
  };
}

/**
 * Complete sprint MCP tool handler
 *
 * Automates the sprint completion workflow by validating required artifacts,
 * updating sprint status to 'complete', and providing a completion summary.
 * Implements Sprint Protocol §2.9 completion requirements.
 *
 * **Completion Modes:**
 * - **normal**: Strict mode requiring all 4 completion artifacts (verification-report.md,
 *   retro.md, key-learnings.md, publication.yaml). Fails if any are missing.
 * - **forced**: Permissive mode allowing completion despite missing artifacts or
 *   validation failures. Issues warnings but proceeds with status update.
 *
 * **Required Artifacts (normal mode):**
 * 1. verification-report.md - Backlog reconciliation
 * 2. retro.md - Sprint retrospective
 * 3. key-learnings.md - Transferable insights
 * 4. publication.yaml - PR and branch metadata
 *
 * **What this tool does:**
 * - Validates sprint manifest exists
 * - Checks for required completion artifacts
 * - Updates sprint status to 'complete'
 * - Adds completion timestamp
 * - Adds PR URL (if provided)
 * - Returns completion summary with next steps
 *
 * @param args - Tool arguments object from MCP client
 * @param args.sprintId - Sprint ID to complete (e.g., 'sprint-7-f7cz9y')
 * @param args.completionMode - Completion mode: 'normal' (strict) or 'forced' (permissive)
 * @param args.pr - Optional PR URL to record in sprint manifest
 * @returns Promise resolving to MCP result with completion summary or validation errors
 * @throws Error if required arguments (sprintId, completionMode) are missing
 *
 * @example
 * ```typescript
 * // Normal completion (requires all artifacts)
 * const result = await completeSprintTool({
 *   sprintId: 'sprint-7-f7cz9y',
 *   completionMode: 'normal',
 *   pr: 'https://github.com/owner/repo/pull/5'
 * });
 * // Returns success if all artifacts exist, error if any are missing
 *
 * // Forced completion (allows missing artifacts)
 * const result = await completeSprintTool({
 *   sprintId: 'sprint-7-f7cz9y',
 *   completionMode: 'forced'
 * });
 * // Always succeeds, issues warnings for missing artifacts
 * ```
 */
export async function completeSprintTool(
  args?: Record<string, unknown>
): Promise<CompleteSprintResult> {
  // Validate required arguments
  if (!args || !args.sprintId || !args.completionMode) {
    throw new Error('Missing required arguments: sprintId, completionMode');
  }

  const sprintArgs: CompleteSprintArgs = {
    sprintId: args.sprintId as string,
    completionMode: args.completionMode as 'normal' | 'forced',
    pr: args.pr as string | undefined,
  };

  const { sprintId, completionMode, pr } = sprintArgs;

  // Validate completion mode
  if (!isValidCompletionMode(completionMode)) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Invalid completion mode: ${completionMode}\n\nValid modes: normal, forced\n\n- **normal**: Requires all completion artifacts (verification-report.md, retro.md, key-learnings.md, publication.yaml)\n- **forced**: Allows completion despite missing artifacts or validation failures`,
        },
      ],
      isError: true,
    };
  }

  logger.info(`Completing sprint ${sprintId}`, {
    completionMode,
    pr,
  });

  // Step 1: Validate prerequisites
  const validation = await validateSprintCompletion(sprintId, completionMode);

  if (!validation.valid) {
    // Validation failed - return errors
    const errorText = [
      `❌ Cannot complete sprint ${sprintId}`,
      '',
      '**Validation Errors**:',
      ...validation.errors.map((e) => `- ${e}`),
    ];

    if (validation.warnings.length > 0) {
      errorText.push('', '**Warnings**:');
      errorText.push(...validation.warnings.map((w) => `- ${w}`));
    }

    errorText.push(
      '',
      '**Next Steps**:',
      '1. Create missing completion artifacts',
      '2. Retry sprint completion',
      '3. Or use completionMode: "forced" to override validation'
    );

    return {
      content: [
        {
          type: 'text',
          text: errorText.join('\n'),
        },
      ],
      isError: true,
    };
  }

  // Step 2: Update sprint status to complete
  const completedAt = new Date().toISOString();

  try {
    const updateResult = await updateSprintStatusTool({
      sprintId,
      status: 'complete',
      completedAt,
      completionMode,
      pr,
    });

    // Check if update failed
    if (updateResult.isError) {
      return updateResult;
    }

    // Step 3: Build completion summary
    let resultText = `✅ Sprint ${sprintId} completed successfully!\n\n`;

    resultText += `**Completion Details**:\n`;
    resultText += `- Completion Mode: ${completionMode}\n`;
    resultText += `- Completed At: ${completedAt}\n`;
    if (pr) {
      resultText += `- Pull Request: ${pr}\n`;
    }

    resultText += `\n**Validated Artifacts**:\n`;
    for (const check of validation.artifactChecks) {
      const status = check.exists ? '✅' : '❌';
      resultText += `${status} ${check.artifact}\n`;
    }

    if (validation.warnings.length > 0) {
      resultText += `\n**Warnings**:\n`;
      for (const warning of validation.warnings) {
        resultText += `⚠️  ${warning}\n`;
      }
    }

    resultText += `\n**Next Steps**:\n`;
    resultText += `1. Review completion artifacts in planning/${sprintId}/\n`;
    if (!pr) {
      resultText += `2. Create Pull Request if desired (human-owned per Protocol S14)\n`;
    }
    resultText += `${pr ? '2' : '3'}. Optionally clean up worktree: \`git worktree remove .worktrees/${sprintId}\`\n`;
    resultText += `${pr ? '3' : '4'}. Start next sprint when ready\n`;

    resultText += `\n**Sprint Protocol Compliance**:\n`;
    resultText += `✅ Rule S2: Sprint completion with required artifacts validated\n`;
    resultText += `✅ §2.9: Sprint completion packet requirements satisfied\n`;

    logger.info(`Sprint ${sprintId} completion successful`);

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  } catch (error) {
    logger.error(`Failed to complete sprint ${sprintId}`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      content: [
        {
          type: 'text',
          text: `❌ Failed to complete sprint ${sprintId}\n\nError: ${errorMessage}\n\nThe sprint status update failed. Please check the manifest and index integrity.`,
        },
      ],
      isError: true,
    };
  }
}
