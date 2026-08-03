/**
 * Archive System Configuration Types
 *
 * Defines TypeScript interfaces for the sprint archive system configuration.
 * This configuration controls archive behavior, auto-archiving, and knowledge
 * extraction.
 *
 * Configuration is typically stored in planning/archive-config.yaml.
 * Environment variables can override configuration values.
 *
 * Related:
 * - Technical Architecture Section 5: Configuration and Flags
 * - Sprint 13, Task 13-100: Create Archive Configuration Schema
 */

/**
 * Auto-archive scheduling strategy
 *
 * - on-complete: Archive sprints automatically when marked complete
 * - manual: Archive only via explicit archive-sprint tool invocation
 * - daily: Run auto-archive check on daily schedule (future)
 */
export type ArchiveSchedule = 'on-complete' | 'manual' | 'daily';

/**
 * Auto-archive criteria strategy
 *
 * - age: Archive sprints older than ageDays
 * - count: Keep only the most recent keepCount sprints in active/
 * - hybrid: Use both age AND count (sprint must meet both criteria)
 */
export type ArchiveCriteria = 'age' | 'count' | 'hybrid';

/**
 * Knowledge categories to extract from archived sprints
 *
 * - lessons: Key learnings, lessons learned
 * - patterns: Successful approaches, best practices
 * - anti-patterns: Things to avoid, known pitfalls
 * - metrics: Performance data, effort estimates, velocity
 */
export type KnowledgeCategory = 'lessons' | 'patterns' | 'anti-patterns' | 'metrics';

/**
 * Auto-archive configuration
 *
 * Controls when and how sprints are automatically archived.
 */
export interface AutoArchiveConfig {
  /**
   * Enable automatic archiving
   *
   * When true, sprints meeting archive criteria will be automatically moved
   * from planning/active/ to planning/archive/{year}/.
   *
   * When false, archiving is manual-only via archive-sprint tool.
   *
   * Environment override: SPRINT_AUTO_ARCHIVE_ENABLED
   */
  enabled: boolean;

  /**
   * Archive criteria strategy
   *
   * Determines which sprints are eligible for auto-archiving:
   * - age: Archive sprints older than ageDays
   * - count: Keep only the most recent keepCount sprints
   * - hybrid: Require both age AND count criteria
   *
   * Default: 'hybrid'
   */
  criteria: ArchiveCriteria;

  /**
   * Age threshold in days
   *
   * Sprints completed more than this many days ago are eligible for archiving.
   *
   * Only applies when criteria is 'age' or 'hybrid'.
   *
   * Default: 30 days
   */
  ageDays: number;

  /**
   * Maximum number of sprints to keep in active/
   *
   * When count exceeds this value, oldest sprints are archived.
   *
   * Only applies when criteria is 'count' or 'hybrid'.
   *
   * Default: 10 sprints
   */
  keepCount: number;

  /**
   * Archive scheduling strategy
   *
   * Determines when auto-archive checks run:
   * - on-complete: Check immediately when sprint marked complete
   * - manual: Never auto-archive, require explicit tool invocation
   * - daily: Run daily check (future enhancement)
   *
   * Default: 'on-complete'
   */
  schedule: ArchiveSchedule;
}

/**
 * Knowledge extraction configuration
 *
 * Controls automated knowledge extraction from archived sprints.
 */
export interface KnowledgeExtractionConfig {
  /**
   * Extract knowledge when sprint is archived
   *
   * When true, knowledge is automatically extracted from sprint artifacts
   * (retro.md, key-learnings.md, etc.) when the sprint is archived.
   *
   * When false, knowledge extraction is manual-only.
   *
   * Environment override: SPRINT_KNOWLEDGE_EXTRACTION_ENABLED
   */
  extractOnComplete: boolean;

  /**
   * Knowledge categories to extract
   *
   * Determines which types of knowledge to extract from sprint artifacts:
   * - lessons: Key learnings, lessons learned
   * - patterns: Successful approaches, best practices
   * - anti-patterns: Things to avoid, known pitfalls
   * - metrics: Performance data, effort estimates, velocity
   *
   * Default: ['lessons', 'patterns', 'anti-patterns', 'metrics']
   */
  categories: KnowledgeCategory[];

  /**
   * Aggregate knowledge after extraction
   *
   * When true, extracted knowledge is immediately deduplicated and aggregated
   * into the global knowledge base at planning/knowledge/knowledge-base.yaml.
   *
   * When false, knowledge is extracted but not aggregated (requires manual step).
   *
   * Default: true
   */
  aggregateOnExtraction: boolean;
}

/**
 * Migration tracking metadata
 *
 * Tracks archive system migration status and backup locations.
 */
export interface MigrationMetadata {
  /**
   * Migration completed flag
   *
   * Set to true after successful migration from flat structure to
   * active/archive hierarchy.
   *
   * Used to prevent re-running migration and enable archive features.
   */
  completed: boolean;

  /**
   * Path to pre-migration sprint index backup
   *
   * Absolute or relative path to the backup of sprint-index.yaml
   * created before migration.
   *
   * Example: 'planning/sprint-index-pre-migration.yaml.backup'
   */
  backupPath: string;

  /**
   * Timestamp when migration completed
   *
   * ISO 8601 timestamp of successful migration completion.
   *
   * Optional: May not be present in older configurations.
   */
  completedAt?: string;

  /**
   * Version of migration script that ran
   *
   * Semantic version of the migration script (e.g., "1.0.0").
   *
   * Optional: May not be present in older configurations.
   */
  version?: string;
}

/**
 * Archive system configuration
 *
 * Root configuration object for the sprint archive system.
 *
 * Typically stored in planning/archive-config.yaml as:
 * ```yaml
 * archive:
 *   enabled: true
 *   autoArchive: { ... }
 *   knowledge: { ... }
 *   migration: { ... }
 * ```
 */
export interface ArchiveConfig {
  /**
   * Master enable/disable switch for archive system
   *
   * When true, archive features are enabled:
   * - Sprints organized in active/ and archive/ directories
   * - Index scans both locations
   * - Archive tools available
   *
   * When false, falls back to legacy flat structure:
   * - All sprints in planning/ root
   * - Archive tools disabled
   *
   * Environment override: SPRINT_ARCHIVE_ENABLED
   *
   * Default: true (after migration)
   */
  enabled: boolean;

  /**
   * Auto-archive configuration
   *
   * Controls automatic archiving of old/completed sprints.
   */
  autoArchive: AutoArchiveConfig;

  /**
   * Knowledge extraction configuration
   *
   * Controls automated knowledge extraction from archived sprints.
   */
  knowledge: KnowledgeExtractionConfig;

  /**
   * Migration tracking metadata
   *
   * Tracks migration status and backup locations.
   */
  migration: MigrationMetadata;
}

/**
 * Default archive configuration
 *
 * Conservative defaults suitable for initial deployment:
 * - Auto-archive disabled (manual-only)
 * - Knowledge extraction disabled
 * - Migration incomplete
 *
 * After migration, auto-archive and knowledge extraction can be enabled.
 */
export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  enabled: false,
  autoArchive: {
    enabled: false,
    criteria: 'hybrid',
    ageDays: 30,
    keepCount: 10,
    schedule: 'manual',
  },
  knowledge: {
    extractOnComplete: false,
    categories: ['lessons', 'patterns', 'anti-patterns', 'metrics'],
    aggregateOnExtraction: true,
  },
  migration: {
    completed: false,
    backupPath: 'planning/sprint-index-pre-migration.yaml.backup',
  },
};

/**
 * Post-migration recommended configuration
 *
 * Enables core features while keeping auto-archive conservative:
 * - Archive system enabled
 * - Auto-archive enabled with 30-day/10-sprint hybrid criteria
 * - Knowledge extraction enabled on archival
 * - Triggers on sprint completion
 */
export const RECOMMENDED_ARCHIVE_CONFIG: ArchiveConfig = {
  enabled: true,
  autoArchive: {
    enabled: true,
    criteria: 'hybrid',
    ageDays: 30,
    keepCount: 10,
    schedule: 'on-complete',
  },
  knowledge: {
    extractOnComplete: true,
    categories: ['lessons', 'patterns', 'anti-patterns', 'metrics'],
    aggregateOnExtraction: true,
  },
  migration: {
    completed: true,
    backupPath: 'planning/sprint-index-pre-migration.yaml.backup',
  },
};
