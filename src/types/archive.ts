/**
 * Archive Sprint Tool Types
 *
 * Type definitions for manual sprint archival operations.
 * Supports moving completed sprints from active/ to archive/{year}/.
 */

/**
 * Arguments for archive-sprint MCP tool
 *
 * @property sprintId - Sprint identifier (e.g., 'sprint-12-sdwpw0')
 * @property dryRun - If true, preview archival without making changes (optional)
 *
 * @example
 * ```typescript
 * const args: ArchiveSprintArgs = {
 *   sprintId: 'sprint-12-sdwpw0',
 *   dryRun: false
 * };
 * ```
 */
export interface ArchiveSprintArgs {
  /** Sprint ID to archive (e.g., 'sprint-12-sdwpw0') */
  sprintId: string;

  /** Preview archival without making changes (default: false) */
  dryRun?: boolean;
}

/**
 * Result from archive-sprint MCP tool
 *
 * Standard MCP tool result format with text content and optional error flag.
 *
 * @property content - Array of text content blocks
 * @property isError - True if operation failed, false/undefined if succeeded
 *
 * @example
 * ```typescript
 * const result: ArchiveSprintResult = {
 *   content: [{
 *     type: 'text',
 *     text: '✅ Sprint archived successfully!'
 *   }],
 *   isError: false
 * };
 * ```
 */
export interface ArchiveSprintResult {
  /** Array of text content blocks */
  content: Array<{
    type: 'text';
    text: string;
  }>;

  /** True if operation failed */
  isError?: boolean;
}

/**
 * Archive destination information
 *
 * Internal type representing where a sprint will be archived.
 *
 * @property year - Archive year (e.g., 2026)
 * @property sourcePath - Current sprint location (e.g., 'planning/active/sprint-12-sdwpw0')
 * @property destinationPath - Target archive location (e.g., 'planning/archive/2026/sprint-12-sdwpw0')
 * @property manifestPath - Relative path for sprint index (e.g., 'planning/archive/2026/sprint-12-sdwpw0/sprint-manifest.yaml')
 */
export interface ArchiveDestination {
  /** Archive year determined from sprint completion or creation date */
  year: number;

  /** Current sprint directory path */
  sourcePath: string;

  /** Target archive directory path */
  destinationPath: string;

  /** Relative manifest path for sprint index */
  manifestPath: string;
}

/**
 * Archive validation result
 *
 * Internal type for pre-archival validation checks.
 *
 * @property valid - True if sprint can be archived
 * @property errors - Blocking errors preventing archival
 * @property warnings - Non-blocking warnings about archival
 * @property destination - Archive destination info (if valid)
 */
export interface ArchiveValidationResult {
  /** True if sprint passes validation and can be archived */
  valid: boolean;

  /** Blocking errors preventing archival */
  errors: string[];

  /** Non-blocking warnings about archival */
  warnings: string[];

  /** Archive destination info (undefined if validation failed) */
  destination?: ArchiveDestination;
}

/**
 * Archive operation summary
 *
 * Internal type summarizing what was archived.
 *
 * @property sprintId - Sprint that was archived
 * @property year - Archive year
 * @property sourcePath - Original location
 * @property destinationPath - Archive location
 * @property manifestUpdated - True if sprint index was updated
 * @property knowledgeExtracted - True if knowledge extraction ran
 */
export interface ArchiveOperationSummary {
  /** Sprint ID that was archived */
  sprintId: string;

  /** Archive year */
  year: number;

  /** Original sprint location */
  sourcePath: string;

  /** Archive destination */
  destinationPath: string;

  /** True if sprint-index.yaml was updated */
  manifestUpdated: boolean;

  /** True if knowledge extraction was performed */
  knowledgeExtracted: boolean;
}
