/**
 * Type definitions for Sprint Index System
 *
 * The sprint index is a derived, regenerable cache of sprint metadata sourced
 * from individual sprint manifests. It provides fast, denormalized access to
 * sprint information without scanning the filesystem.
 */

import { SprintStatus } from './sprint.js';

/**
 * Completion mode for a sprint
 * - normal: Sprint completed with all acceptance criteria met
 * - forced: Sprint force-completed with documented exceptions
 */
export type SprintCompletionMode = 'normal' | 'forced';

/**
 * Single sprint entry in the index
 *
 * Contains denormalized metadata extracted from the sprint manifest plus
 * additional derived information for quick lookups.
 */
export interface SprintIndexEntry {
  /** Unique sprint identifier (e.g., "sprint-1-a9f3c2") */
  id: string;

  /** Human-readable sprint title */
  title: string;

  /** Current sprint status */
  status: SprintStatus;

  /** Sprint owner (GitHub handle or name) */
  owner: string;

  /** ISO 8601 timestamp when sprint was created */
  createdAt: string;

  /** ISO 8601 timestamp when sprint was started (optional) */
  startedAt?: string;

  /** ISO 8601 timestamp when sprint was completed (optional) */
  completedAt?: string;

  /** How the sprint was completed (optional) */
  completionMode?: SprintCompletionMode;

  /** Relative path to sprint manifest file */
  manifestPath: string;

  /** Git feature branch name */
  branch: string;

  /** GitHub Pull Request URL (optional) */
  pr?: string;

  /** Relative path to git worktree (optional) */
  worktreePath?: string;
}

/**
 * Statistics computed from sprint index entries
 */
export interface SprintStatistics {
  /** Count of sprints by status */
  byStatus: Record<SprintStatus, number>;

  /** Count of completed sprints by completion mode */
  byCompletionMode: {
    normal: number;
    forced: number;
  };

  /** Average sprint duration in ISO 8601 duration format (optional) */
  averageSprintDuration?: string;
}

/**
 * Complete sprint index structure
 *
 * This is the root structure written to planning/sprint-index.yaml.
 * It is a derived cache that can be regenerated from manifests at any time.
 */
export interface SprintIndex {
  /** Schema version for future compatibility */
  version: string;

  /** ISO 8601 timestamp when index was last generated */
  generatedAt: string;

  /** Total number of sprints in the index */
  totalSprints: number;

  /** Number of sprints currently in progress */
  activeSprints: number;

  /** Number of completed sprints */
  completedSprints: number;

  /** Array of sprint entries, sorted by sprint number (ascending) */
  sprints: SprintIndexEntry[];

  /** Computed statistics from sprint data */
  statistics: SprintStatistics;
}

/**
 * Validation rule severity levels
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  /** Severity of the issue */
  severity: ValidationSeverity;

  /** Issue code for categorization */
  code: string;

  /** Human-readable message describing the issue */
  message: string;

  /** Affected sprint ID (if applicable) */
  sprintId?: string;

  /** Additional context data (optional) */
  context?: Record<string, unknown>;
}

/**
 * Result of validating a sprint index
 *
 * Contains all validation issues found, categorized by severity.
 * Fatal errors should prevent index save operations.
 */
export interface IndexValidationResult {
  /** Whether validation passed (no errors) */
  valid: boolean;

  /** Fatal errors that must be fixed */
  errors: ValidationIssue[];

  /** Non-fatal warnings that should be addressed */
  warnings: ValidationIssue[];

  /** ISO 8601 timestamp when validation was performed */
  validatedAt: string;
}
