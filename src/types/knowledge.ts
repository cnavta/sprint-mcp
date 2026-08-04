/**
 * Knowledge Extraction System Types
 *
 * Type definitions for extracting, storing, and aggregating sprint knowledge.
 * Supports lessons learned, patterns, anti-patterns, and metrics.
 */

/**
 * Category of knowledge artifact
 *
 * - technical: Technical learnings (architecture, coding practices, tools)
 * - process: Process improvements (workflow, methodology, sprint protocol)
 * - tooling: Tooling insights (IDE, CI/CD, development tools)
 * - testing: Testing strategies and lessons
 * - documentation: Documentation practices
 * - collaboration: Team collaboration insights
 * - performance: Performance optimization learnings
 * - security: Security best practices
 * - deployment: Deployment and infrastructure learnings
 * - general: General uncategorized learnings
 */
export type KnowledgeCategory =
  | 'technical'
  | 'process'
  | 'tooling'
  | 'testing'
  | 'documentation'
  | 'collaboration'
  | 'performance'
  | 'security'
  | 'deployment'
  | 'general';

/**
 * Individual lesson learned from a sprint
 *
 * Represents a discrete insight, learning, or takeaway from sprint execution.
 *
 * @property content - The lesson text (markdown supported)
 * @property category - Classification of the lesson
 * @property sprintId - Sprint where lesson was learned
 * @property context - Optional additional context or background
 * @property frequency - Number of times similar lesson appeared across sprints
 * @property firstSeenAt - ISO timestamp when first recorded
 * @property lastSeenAt - ISO timestamp when most recently recorded
 *
 * @example
 * ```typescript
 * const lesson: Lesson = {
 *   content: "Always run dry-run before executing migrations",
 *   category: "process",
 *   sprintId: "sprint-13-eaydun",
 *   context: "Avoided data loss by previewing migration first",
 *   frequency: 1,
 *   firstSeenAt: "2026-08-03T14:00:00Z",
 *   lastSeenAt: "2026-08-03T14:00:00Z"
 * };
 * ```
 */
export interface Lesson {
  /** The lesson text (markdown supported) */
  content: string;

  /** Classification of the lesson */
  category: KnowledgeCategory;

  /** Sprint where lesson was learned */
  sprintId: string;

  /** Optional additional context or background */
  context?: string;

  /** Number of times similar lesson appeared across sprints */
  frequency: number;

  /** ISO timestamp when first recorded */
  firstSeenAt: string;

  /** ISO timestamp when most recently recorded */
  lastSeenAt: string;
}

/**
 * Positive pattern or best practice identified
 *
 * Represents a successful approach, technique, or practice that should be repeated.
 *
 * @property name - Short name for the pattern
 * @property description - Detailed description of the pattern
 * @property category - Classification of the pattern
 * @property sprintId - Sprint where pattern was identified
 * @property context - When to apply this pattern
 * @property benefits - Benefits of using this pattern
 * @property examples - Code snippets or usage examples
 * @property frequency - Number of times pattern appeared
 *
 * @example
 * ```typescript
 * const pattern: Pattern = {
 *   name: "Dry-Run Validation",
 *   description: "Preview destructive operations before execution",
 *   category: "process",
 *   sprintId: "sprint-13-eaydun",
 *   context: "Use for migrations, deletions, or bulk updates",
 *   benefits: ["Prevents data loss", "Builds user confidence", "Allows review"],
 *   examples: ["migration --dry-run", "archive-sprint --dryRun"],
 *   frequency: 3
 * };
 * ```
 */
export interface Pattern {
  /** Short name for the pattern */
  name: string;

  /** Detailed description of the pattern */
  description: string;

  /** Classification of the pattern */
  category: KnowledgeCategory;

  /** Sprint where pattern was identified */
  sprintId: string;

  /** When to apply this pattern */
  context?: string;

  /** Benefits of using this pattern */
  benefits?: string[];

  /** Code snippets or usage examples */
  examples?: string[];

  /** Number of times pattern appeared */
  frequency: number;
}

/**
 * Anti-pattern or practice to avoid
 *
 * Represents an approach or technique that led to problems and should be avoided.
 *
 * @property name - Short name for the anti-pattern
 * @property description - What went wrong
 * @property category - Classification of the anti-pattern
 * @property sprintId - Sprint where anti-pattern was identified
 * @property problem - The problem caused by this anti-pattern
 * @property solution - How to avoid or fix this anti-pattern
 * @property examples - Examples of the anti-pattern in practice
 * @property frequency - Number of times anti-pattern appeared
 *
 * @example
 * ```typescript
 * const antiPattern: AntiPattern = {
 *   name: "Hardcoded Paths",
 *   description: "Using process.cwd() instead of configurable path utilities",
 *   category: "technical",
 *   sprintId: "sprint-13-eaydun",
 *   problem: "Breaks multi-repository support and makes testing difficult",
 *   solution: "Use centralized path utilities that respect SPRINT_ROOT",
 *   examples: ["join(process.cwd(), 'planning')"],
 *   frequency: 1
 * };
 * ```
 */
export interface AntiPattern {
  /** Short name for the anti-pattern */
  name: string;

  /** What went wrong */
  description: string;

  /** Classification of the anti-pattern */
  category: KnowledgeCategory;

  /** Sprint where anti-pattern was identified */
  sprintId: string;

  /** The problem caused by this anti-pattern */
  problem: string;

  /** How to avoid or fix this anti-pattern */
  solution?: string;

  /** Examples of the anti-pattern in practice */
  examples?: string[];

  /** Number of times anti-pattern appeared */
  frequency: number;
}

/**
 * Sprint metrics and statistics
 *
 * Quantitative data about sprint execution.
 *
 * @property sprintId - Sprint identifier
 * @property duration - Sprint duration in ISO 8601 format (e.g., "PT8H30M")
 * @property testsAdded - Number of tests added
 * @property testsPassing - Number of tests passing at completion
 * @property linesOfCode - Approximate lines of code added
 * @property filesModified - Number of files modified
 * @property filesCreated - Number of files created
 * @property commitsCount - Number of commits made
 * @property tasksCompleted - Number of tasks completed
 * @property tasksDeferred - Number of tasks deferred
 * @property completionMode - How sprint was completed (normal/forced)
 *
 * @example
 * ```typescript
 * const metrics: SprintMetrics = {
 *   sprintId: "sprint-13-eaydun",
 *   duration: "PT24H",
 *   testsAdded: 15,
 *   testsPassing: 241,
 *   linesOfCode: 2500,
 *   filesModified: 20,
 *   filesCreated: 12,
 *   commitsCount: 15,
 *   tasksCompleted: 15,
 *   tasksDeferred: 0,
 *   completionMode: "normal"
 * };
 * ```
 */
export interface SprintMetrics {
  /** Sprint identifier */
  sprintId: string;

  /** Sprint duration in ISO 8601 format */
  duration?: string;

  /** Number of tests added */
  testsAdded?: number;

  /** Number of tests passing at completion */
  testsPassing?: number;

  /** Approximate lines of code added */
  linesOfCode?: number;

  /** Number of files modified */
  filesModified?: number;

  /** Number of files created */
  filesCreated?: number;

  /** Number of commits made */
  commitsCount?: number;

  /** Number of tasks completed */
  tasksCompleted?: number;

  /** Number of tasks deferred */
  tasksDeferred?: number;

  /** How sprint was completed */
  completionMode?: 'normal' | 'forced';
}

/**
 * Artifacts discovered in a sprint directory
 *
 * Categorizes found knowledge artifacts by type.
 *
 * @property sprintId - Sprint identifier
 * @property learningFiles - Files explicitly about learnings (key-learnings.md, lessons-learned.md)
 * @property retroFiles - Retrospective files (retro.md, retrospective.md)
 * @property summaryFiles - Summary files (SPRINT_COMPLETE.md, completion-summary.md)
 * @property verificationFile - Verification report path
 * @property publicationFile - Publication YAML path
 *
 * @example
 * ```typescript
 * const artifacts: KnowledgeArtifacts = {
 *   sprintId: "sprint-13-eaydun",
 *   learningFiles: ["planning/sprint-13-eaydun/key-learnings.md"],
 *   retroFiles: ["planning/sprint-13-eaydun/retro.md"],
 *   summaryFiles: [],
 *   verificationFile: "planning/sprint-13-eaydun/verification-report.md",
 *   publicationFile: "planning/sprint-13-eaydun/publication.yaml"
 * };
 * ```
 */
export interface KnowledgeArtifacts {
  /** Sprint identifier */
  sprintId: string;

  /** Files explicitly about learnings */
  learningFiles: string[];

  /** Retrospective files */
  retroFiles: string[];

  /** Summary files */
  summaryFiles: string[];

  /** Verification report path */
  verificationFile?: string;

  /** Publication YAML path */
  publicationFile?: string;
}

/**
 * Complete knowledge base extracted from sprints
 *
 * Aggregates all knowledge extracted from sprint artifacts.
 *
 * @property lessons - All lessons learned
 * @property patterns - Successful patterns identified
 * @property antiPatterns - Anti-patterns to avoid
 * @property metrics - Sprint metrics aggregated
 * @property lastUpdated - ISO timestamp when knowledge base was last updated
 * @property sprintCount - Number of sprints analyzed
 * @property version - Knowledge base schema version
 *
 * @example
 * ```typescript
 * const kb: KnowledgeBase = {
 *   lessons: [lesson1, lesson2],
 *   patterns: [pattern1],
 *   antiPatterns: [antiPattern1],
 *   metrics: [metrics1, metrics2],
 *   lastUpdated: "2026-08-03T15:00:00Z",
 *   sprintCount: 13,
 *   version: "1.0"
 * };
 * ```
 */
export interface KnowledgeBase {
  /** All lessons learned */
  lessons: Lesson[];

  /** Successful patterns identified */
  patterns: Pattern[];

  /** Anti-patterns to avoid */
  antiPatterns: AntiPattern[];

  /** Sprint metrics aggregated */
  metrics: SprintMetrics[];

  /** ISO timestamp when knowledge base was last updated */
  lastUpdated: string;

  /** Number of sprints analyzed */
  sprintCount: number;

  /** Knowledge base schema version */
  version: string;
}

/**
 * Result of knowledge extraction from a single sprint
 *
 * Internal type returned by extraction functions.
 *
 * @property sprintId - Sprint identifier
 * @property lessons - Lessons extracted from this sprint
 * @property patterns - Patterns identified in this sprint
 * @property antiPatterns - Anti-patterns found in this sprint
 * @property metrics - Metrics for this sprint
 * @property source - Which artifact(s) knowledge was extracted from
 * @property extractedAt - ISO timestamp when extraction occurred
 */
export interface ExtractedKnowledge {
  /** Sprint identifier */
  sprintId: string;

  /** Lessons extracted from this sprint */
  lessons: Lesson[];

  /** Patterns identified in this sprint */
  patterns: Pattern[];

  /** Anti-patterns found in this sprint */
  antiPatterns: AntiPattern[];

  /** Metrics for this sprint */
  metrics: SprintMetrics;

  /** Which artifact(s) knowledge was extracted from */
  source: string[];

  /** ISO timestamp when extraction occurred */
  extractedAt: string;
}
