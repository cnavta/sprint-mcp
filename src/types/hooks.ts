/**
 * Sprint Lifecycle Hooks - Type Definitions
 *
 * Defines types for the sprint lifecycle hooks system that enables
 * project-specific automation at key sprint events.
 *
 * Hook Model: Option A - Separate Lifecycle and Status Hooks
 * - Lifecycle hooks: Tied to specific events (worktree creation, removal, archival)
 * - Status hook: Generic handler for ALL status transitions
 */

/**
 * Hook names corresponding to executable scripts in .sprint-hooks/
 *
 * Lifecycle Hooks (explicit, event-specific):
 * - post-worktree-create: After worktree + planning dir created (non-blocking)
 * - pre-worktree-remove: Before worktree removed (blocking)
 * - pre-archive: Before moving sprint to archive (blocking)
 * - post-archive: After sprint archived (non-blocking)
 *
 * Status Change Hook (generic, handles all status transitions):
 * - on-status-change: Before/after any status change (pre: blocking, post: non-blocking)
 */
export type HookName =
  | 'post-worktree-create'
  | 'on-status-change'
  | 'pre-worktree-remove'
  | 'pre-archive'
  | 'post-archive';

/**
 * Context information passed to hooks via environment variables
 *
 * All hooks receive:
 * - sprintId: Sprint identifier (e.g., "sprint-16-rgo90d")
 * - worktreePath: Absolute path to sprint worktree
 * - planningDir: Absolute path to sprint planning directory
 * - branch: Feature branch name
 *
 * Additionally, on-status-change receives:
 * - statusFrom: Previous sprint status
 * - statusTo: New sprint status
 * - lifecyclePhase: 'pre' (before status update) or 'post' (after status update)
 */
export interface HookContext {
  /** Sprint identifier (e.g., "sprint-16-rgo90d") */
  sprintId: string;

  /** Absolute path to sprint worktree (e.g., "/path/.worktrees/sprint-16-rgo90d") */
  worktreePath: string;

  /** Absolute path to sprint planning directory */
  planningDir: string;

  /** Feature branch name (e.g., "feature/sprint-16-rgo90d-...") */
  branch: string;

  // Status change fields (only used by on-status-change hook)

  /** Previous sprint status (only for on-status-change) */
  statusFrom?: string;

  /** New sprint status (only for on-status-change) */
  statusTo?: string;

  /** Lifecycle phase: 'pre' (before) or 'post' (after) status update (only for on-status-change) */
  lifecyclePhase?: 'pre' | 'post';
}

/**
 * Result of hook execution
 *
 * - executed: Whether a hook was found and executed
 * - exitCode: Hook exit code (0 = success, non-zero = failure)
 * - stdout: Standard output from hook
 * - stderr: Standard error from hook
 * - error: Error message if execution failed
 */
export interface HookResult {
  /** Whether a hook was found and executed */
  executed: boolean;

  /** Exit code from hook (0 = success, non-zero = failure) */
  exitCode?: number;

  /** Standard output captured from hook */
  stdout?: string;

  /** Standard error captured from hook */
  stderr?: string;

  /** Error message if hook execution failed */
  error?: string;
}

/**
 * Environment variable names passed to hooks
 *
 * These constants ensure consistent environment variable naming across the system.
 */
export const HOOK_ENV_VARS = {
  /** Sprint identifier */
  SPRINT_ID: 'SPRINT_ID',

  /** Sprint worktree path */
  SPRINT_WORKTREE: 'SPRINT_WORKTREE',

  /** Sprint planning directory path */
  SPRINT_PLANNING_DIR: 'SPRINT_PLANNING_DIR',

  /** Feature branch name */
  SPRINT_BRANCH: 'SPRINT_BRANCH',

  /** Hook name being executed */
  SPRINT_EVENT: 'SPRINT_EVENT',

  // Status change variables (on-status-change only)

  /** Previous status (on-status-change) */
  SPRINT_STATUS_FROM: 'SPRINT_STATUS_FROM',

  /** New status (on-status-change) */
  SPRINT_STATUS_TO: 'SPRINT_STATUS_TO',

  /** Lifecycle phase: 'pre' or 'post' (on-status-change) */
  SPRINT_LIFECYCLE_PHASE: 'SPRINT_LIFECYCLE_PHASE',
} as const;
