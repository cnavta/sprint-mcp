/**
 * Type definitions for Sprint Protocol entities
 */

export type SprintStatus =
  | 'planning'
  | 'in-progress'
  | 'validating'
  | 'verifying'
  | 'published'
  | 'complete';

/**
 * Publication method used to create the PR
 */
export type PublicationMethod = 'github-cli' | 'github-api' | 'manual';

/**
 * Optional publication metadata for tracking PR creation details
 *
 * This metadata supplements the basic links.pr field with additional
 * context about how and when the PR was published. All fields are optional.
 */
export interface PublicationMetadata {
  /** Publication method used (github-cli, github-api, or manual) */
  method?: PublicationMethod;

  /** ISO 8601 timestamp when PR was created */
  prCreatedAt?: string;

  /** ISO 8601 timestamp when branch was pushed to remote */
  branchPushedAt?: string;

  /** Additional notes about publication process */
  notes?: string;
}

/**
 * Sprint manifest - canonical source of truth for sprint metadata
 *
 * The manifest is the authoritative record of sprint state, stored in
 * planning/sprint-{id}/sprint-manifest.yaml. The sprint index is derived
 * from manifests and can be regenerated at any time.
 */
export interface SprintManifest {
  /** Unique sprint identifier (e.g., "sprint-1-a9f3c2") */
  id: string;

  /** Human-readable sprint title */
  title: string;

  /** Sprint goal or objective */
  goal: string;

  /** Sprint owner (GitHub handle or name) */
  owner: string;

  /** ISO 8601 timestamp when sprint was created */
  createdAt: string;

  /** Current sprint status */
  status: SprintStatus;

  /** Git and PR links */
  links?: {
    /** GitHub Pull Request URL (optional) */
    pr?: string;

    /** Git feature branch name */
    branch: string;
  };

  /**
   * Optional publication metadata
   *
   * Replaces the deprecated publication.yaml file. Use this to track
   * detailed information about PR creation, branch pushing, and publication
   * method. All fields are optional.
   *
   * @since Protocol v2.5 (Sprint 20 - publication.yaml deprecation)
   */
  publication?: PublicationMetadata;

  /** General notes about the sprint (optional) */
  notes?: string;
}

export interface RequestLogEntry {
  timestamp: string;
  requestId: string;
  prompt: string;
  interpretation: string;
  commands?: string[];
  filesModified?: string[];
}

export interface DeliverableItem {
  description: string;
  completed: boolean;
}

export interface VerificationReport {
  completed: DeliverableItem[];
  partial: DeliverableItem[];
  deferred: DeliverableItem[];
  alignmentNotes?: string;
}

export interface PublicationInfo {
  pr_url?: string;
  branch: string;
  status: 'created' | 'failed' | 'pending';
  error?: string;
}
