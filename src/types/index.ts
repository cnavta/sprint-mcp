/**
 * Types Barrel Export
 *
 * Centralized export of all sprint-mcp TypeScript type definitions.
 * Provides a single import location for consumers.
 *
 * Usage:
 * ```typescript
 * import type { SprintManifest, ArchiveConfig } from './types/index.js';
 * ```
 */

// Sprint types
export type {
  SprintManifest,
  SprintStatus,
  RequestLogEntry,
  DeliverableItem,
  VerificationReport,
  PublicationInfo,
} from './sprint.js';

// Sprint index types
export type {
  SprintIndex,
  SprintIndexEntry,
  SprintStatistics,
  SprintCompletionMode,
  ValidationSeverity,
  ValidationIssue,
  IndexValidationResult,
} from './sprint-index.js';

// Archive configuration types
export type {
  ArchiveConfig,
  AutoArchiveConfig,
  KnowledgeExtractionConfig,
  MigrationMetadata,
  ArchiveSchedule,
  ArchiveCriteria,
  KnowledgeCategory,
} from './archive-config.js';

// Archive configuration defaults
export {
  DEFAULT_ARCHIVE_CONFIG,
  RECOMMENDED_ARCHIVE_CONFIG,
} from './archive-config.js';
