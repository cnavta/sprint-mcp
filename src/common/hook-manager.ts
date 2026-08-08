/**
 * Sprint Lifecycle Hooks - Hook Manager
 *
 * Provides hook discovery and execution functionality for the sprint lifecycle hooks system.
 *
 * Hooks are optional executable scripts in `.sprint-hooks/` directory that run at key
 * sprint lifecycle events to automate project-specific setup, validation, and cleanup.
 */

import { join } from 'path';
import { stat } from 'fs/promises';
import { execSync } from 'child_process';
import { logger } from './logger.js';
import { fileExists } from './file-utils.js';
import { getProjectRoot } from './project-config.js';
import type { HookName, HookContext, HookResult } from '../types/hooks.js';
import { HOOK_ENV_VARS } from '../types/hooks.js';

/**
 * Default timeout for hook execution (5 minutes)
 */
const DEFAULT_HOOK_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Find a hook script in .sprint-hooks/ directory
 *
 * @param hookName - Name of the hook to find
 * @returns Absolute path to hook if found and executable, null otherwise
 *
 * Hook Discovery Rules:
 * 1. Hook must be in `.sprint-hooks/{hookName}` (project root only, no parent dirs)
 * 2. Hook file must exist
 * 3. Hook file must be executable (mode & 0o111)
 *
 * Security: Only searches project root .sprint-hooks/ directory for security.
 * Does NOT check parent directories like git hooks.
 */
export async function findHook(hookName: HookName): Promise<string | null> {
  try {
    const projectRoot = getProjectRoot();
    const hookPath = join(projectRoot, '.sprint-hooks', hookName);

    // Check if hook file exists
    if (!(await fileExists(hookPath))) {
      logger.debug(`Hook not found: ${hookName} (checked: ${hookPath})`);
      return null;
    }

    // Check if hook is executable
    const stats = await stat(hookPath);
    const isExecutable = (stats.mode & 0o111) !== 0;

    if (!isExecutable) {
      logger.warn(
        `Hook file exists but is not executable: ${hookName}`,
        { hookPath, mode: stats.mode.toString(8) }
      );
      logger.warn(`To fix, run: chmod +x ${hookPath}`);
      return null;
    }

    logger.debug(`Found executable hook: ${hookName} at ${hookPath}`);
    return hookPath;
  } catch (error) {
    logger.debug(`Error finding hook ${hookName}: ${error}`);
    return null;
  }
}

/**
 * Execute a hook script with proper environment and error handling
 *
 * @param hookName - Name of the hook to execute
 * @param context - Context information to pass to hook
 * @returns Hook execution result
 *
 * Environment Variables Passed to Hook:
 * - SPRINT_ID: Sprint identifier
 * - SPRINT_WORKTREE: Worktree path
 * - SPRINT_PLANNING_DIR: Planning directory path
 * - SPRINT_BRANCH: Feature branch name
 * - SPRINT_EVENT: Hook name being executed
 *
 * For on-status-change hook only:
 * - SPRINT_STATUS_FROM: Previous status
 * - SPRINT_STATUS_TO: New status
 * - SPRINT_LIFECYCLE_PHASE: 'pre' or 'post'
 *
 * Execution Details:
 * - Working directory: context.worktreePath
 * - Timeout: 5 minutes (default)
 * - Stdout/stderr: Captured and returned
 * - Errors: Caught and returned in result (no exceptions thrown)
 */
export async function executeHook(
  hookName: HookName,
  context: HookContext
): Promise<HookResult> {
  // Find hook
  const hookPath = await findHook(hookName);
  if (!hookPath) {
    logger.debug(`Hook ${hookName} not found, skipping execution`);
    return { executed: false };
  }

  // Build environment variables
  const hookEnv: Record<string, string> = {
    [HOOK_ENV_VARS.SPRINT_ID]: context.sprintId,
    [HOOK_ENV_VARS.SPRINT_WORKTREE]: context.worktreePath,
    [HOOK_ENV_VARS.SPRINT_PLANNING_DIR]: context.planningDir,
    [HOOK_ENV_VARS.SPRINT_BRANCH]: context.branch,
    [HOOK_ENV_VARS.SPRINT_EVENT]: hookName,
  };

  // Add status change variables for on-status-change hook
  if (hookName === 'on-status-change') {
    if (context.statusFrom) {
      hookEnv[HOOK_ENV_VARS.SPRINT_STATUS_FROM] = context.statusFrom;
    }
    if (context.statusTo) {
      hookEnv[HOOK_ENV_VARS.SPRINT_STATUS_TO] = context.statusTo;
    }
    if (context.lifecyclePhase) {
      hookEnv[HOOK_ENV_VARS.SPRINT_LIFECYCLE_PHASE] = context.lifecyclePhase;
    }
  }

  logger.info(`Executing hook: ${hookName}`, {
    sprintId: context.sprintId,
    hookPath,
    statusTransition: context.statusFrom && context.statusTo
      ? `${context.statusFrom} → ${context.statusTo}`
      : undefined,
    lifecyclePhase: context.lifecyclePhase,
  });

  try {
    // Execute hook
    const stdout = execSync(hookPath, {
      cwd: context.worktreePath,
      env: {
        ...process.env,
        ...hookEnv,
      },
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: DEFAULT_HOOK_TIMEOUT,
    });

    logger.info(`Hook ${hookName} completed successfully`);
    return {
      executed: true,
      exitCode: 0,
      stdout: stdout.trim(),
    };
  } catch (error: any) {
    // Hook failed or timed out
    const exitCode = error.status || 1;
    const stdout = error.stdout?.toString().trim() || '';
    const stderr = error.stderr?.toString().trim() || '';
    const errorMessage = error.message || 'Unknown error';

    logger.warn(`Hook ${hookName} failed`, {
      exitCode,
      error: errorMessage,
      stderr: stderr.substring(0, 500), // Limit stderr in logs
    });

    return {
      executed: true,
      exitCode,
      stdout,
      stderr,
      error: errorMessage,
    };
  }
}
