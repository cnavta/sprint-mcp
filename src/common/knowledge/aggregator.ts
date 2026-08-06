/**
 * Knowledge Aggregation Module
 *
 * Aggregates extracted knowledge into a global knowledge base.
 * Handles cross-sprint deduplication and knowledge base persistence.
 */

import { join } from 'path';
import { logger } from '../logger.js';
import { getProjectRoot } from '../path-utils.js';
import { readFile, writeFile, fileExists } from '../file-utils.js';
import {
  deduplicateLessons,
  deduplicatePatterns,
  deduplicateAntiPatterns,
  DEFAULT_DEDUP_CONFIG,
  type DeduplicationConfig,
} from './deduplicator.js';
import type {
  ExtractedKnowledge,
  KnowledgeBase,
  Lesson,
  Pattern,
  AntiPattern,
} from '../../types/knowledge.js';
import YAML from 'yaml';

/**
 * Knowledge base file path (relative to project root)
 */
export const KNOWLEDGE_BASE_PATH = 'planning/knowledge/knowledge-base.yaml';

/**
 * Knowledge base version
 *
 * Increment when format changes require migration.
 */
export const KNOWLEDGE_BASE_VERSION = '1.0.0';

/**
 * Load knowledge base from file
 *
 * Reads and parses the global knowledge base YAML file.
 *
 * @returns Promise resolving to knowledge base
 *
 * @example
 * ```typescript
 * const knowledgeBase = await loadKnowledgeBase();
 * console.log(`Loaded ${knowledgeBase.lessons.length} lessons`);
 * ```
 */
export async function loadKnowledgeBase(): Promise<KnowledgeBase> {
  const projectRoot = getProjectRoot();
  const knowledgeBasePath = join(projectRoot, KNOWLEDGE_BASE_PATH);

  logger.info(`Loading knowledge base from ${KNOWLEDGE_BASE_PATH}`);

  // Check if knowledge base exists
  if (!(await fileExists(knowledgeBasePath))) {
    logger.info('Knowledge base does not exist, creating empty knowledge base');

    return {
      lessons: [],
      patterns: [],
      antiPatterns: [],
      metrics: [],
      lastUpdated: new Date().toISOString(),
      sprintCount: 0,
      version: KNOWLEDGE_BASE_VERSION,
    };
  }

  try {
    const content = await readFile(knowledgeBasePath);
    const knowledgeBase = YAML.parse(content) as KnowledgeBase;

    logger.info(
      `Loaded knowledge base: ${knowledgeBase.lessons.length} lessons, ${knowledgeBase.patterns.length} patterns, ${knowledgeBase.antiPatterns.length} anti-patterns from ${knowledgeBase.sprintCount} sprints`
    );

    return knowledgeBase;
  } catch (error) {
    logger.error(`Failed to load knowledge base from ${KNOWLEDGE_BASE_PATH}`, error);
    throw new Error(
      `Failed to load knowledge base: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Save knowledge base to file
 *
 * Serializes and writes the knowledge base to YAML file.
 *
 * @param knowledgeBase - Knowledge base to save
 * @returns Promise that resolves when saved
 *
 * @example
 * ```typescript
 * const knowledgeBase = await loadKnowledgeBase();
 * knowledgeBase.lessons.push(newLesson);
 * await saveKnowledgeBase(knowledgeBase);
 * ```
 */
export async function saveKnowledgeBase(
  knowledgeBase: KnowledgeBase
): Promise<void> {
  const projectRoot = getProjectRoot();
  const knowledgeBasePath = join(projectRoot, KNOWLEDGE_BASE_PATH);

  logger.info(`Saving knowledge base to ${KNOWLEDGE_BASE_PATH}`);

  // Update metadata
  knowledgeBase.lastUpdated = new Date().toISOString();
  knowledgeBase.version = KNOWLEDGE_BASE_VERSION;

  try {
    // Serialize to YAML
    const yaml = YAML.stringify(knowledgeBase, {
      lineWidth: 0, // Disable line wrapping
      defaultStringType: 'QUOTE_DOUBLE',
    });

    await writeFile(knowledgeBasePath, yaml);

    logger.info(
      `Saved knowledge base: ${knowledgeBase.lessons.length} lessons, ${knowledgeBase.patterns.length} patterns, ${knowledgeBase.antiPatterns.length} anti-patterns`
    );
  } catch (error) {
    logger.error(`Failed to save knowledge base to ${KNOWLEDGE_BASE_PATH}`, error);
    throw new Error(
      `Failed to save knowledge base: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Merge lessons into knowledge base
 *
 * Merges new lessons with existing lessons using deduplication.
 *
 * @param existing - Existing lessons in knowledge base
 * @param newLessons - New lessons to merge
 * @param config - Deduplication config
 * @returns Merged lessons
 *
 * @example
 * ```typescript
 * const merged = mergeLessons(
 *   knowledgeBase.lessons,
 *   extractedKnowledge.lessons,
 *   config
 * );
 * ```
 */
export function mergeLessons(
  existing: Lesson[],
  newLessons: Lesson[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Lesson[] {
  logger.debug(
    `Merging ${newLessons.length} new lessons with ${existing.length} existing lessons`
  );

  // Combine existing and new lessons
  const combined = [...existing, ...newLessons];

  // Deduplicate across all lessons
  const deduplicated = deduplicateLessons(combined, config);

  logger.info(
    `Merged lessons: ${existing.length} + ${newLessons.length} → ${deduplicated.length}`
  );

  return deduplicated;
}

/**
 * Merge patterns into knowledge base
 *
 * Merges new patterns with existing patterns using deduplication.
 *
 * @param existing - Existing patterns in knowledge base
 * @param newPatterns - New patterns to merge
 * @param config - Deduplication config
 * @returns Merged patterns
 *
 * @example
 * ```typescript
 * const merged = mergePatterns(
 *   knowledgeBase.patterns,
 *   extractedKnowledge.patterns,
 *   config
 * );
 * ```
 */
export function mergePatterns(
  existing: Pattern[],
  newPatterns: Pattern[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Pattern[] {
  logger.debug(
    `Merging ${newPatterns.length} new patterns with ${existing.length} existing patterns`
  );

  // Combine existing and new patterns
  const combined = [...existing, ...newPatterns];

  // Deduplicate across all patterns
  const deduplicated = deduplicatePatterns(combined, config);

  logger.info(
    `Merged patterns: ${existing.length} + ${newPatterns.length} → ${deduplicated.length}`
  );

  return deduplicated;
}

/**
 * Merge anti-patterns into knowledge base
 *
 * Merges new anti-patterns with existing anti-patterns using deduplication.
 *
 * @param existing - Existing anti-patterns in knowledge base
 * @param newAntiPatterns - New anti-patterns to merge
 * @param config - Deduplication config
 * @returns Merged anti-patterns
 *
 * @example
 * ```typescript
 * const merged = mergeAntiPatterns(
 *   knowledgeBase.antiPatterns,
 *   extractedKnowledge.antiPatterns,
 *   config
 * );
 * ```
 */
export function mergeAntiPatterns(
  existing: AntiPattern[],
  newAntiPatterns: AntiPattern[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): AntiPattern[] {
  logger.debug(
    `Merging ${newAntiPatterns.length} new anti-patterns with ${existing.length} existing anti-patterns`
  );

  // Combine existing and new anti-patterns
  const combined = [...existing, ...newAntiPatterns];

  // Deduplicate across all anti-patterns
  const deduplicated = deduplicateAntiPatterns(combined, config);

  logger.info(
    `Merged anti-patterns: ${existing.length} + ${newAntiPatterns.length} → ${deduplicated.length}`
  );

  return deduplicated;
}

/**
 * Aggregate extracted knowledge into knowledge base
 *
 * Main aggregation function. Loads knowledge base, merges new knowledge,
 * and saves the updated knowledge base.
 *
 * @param extracted - Extracted knowledge from sprint(s)
 * @param config - Deduplication config
 * @returns Promise resolving to updated knowledge base
 *
 * @example
 * ```typescript
 * const extracted = await extractKnowledge(sprint);
 * const knowledgeBase = await aggregateKnowledge(extracted);
 * console.log(`Knowledge base now has ${knowledgeBase.lessons.length} lessons`);
 * ```
 */
export async function aggregateKnowledge(
  extracted: ExtractedKnowledge,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Promise<KnowledgeBase> {
  logger.info(`Aggregating knowledge from ${extracted.sprintId}`);

  // Step 1: Load existing knowledge base
  const knowledgeBase = await loadKnowledgeBase();

  // Step 2: Merge lessons
  knowledgeBase.lessons = mergeLessons(
    knowledgeBase.lessons,
    extracted.lessons,
    config
  );

  // Step 3: Merge patterns
  knowledgeBase.patterns = mergePatterns(
    knowledgeBase.patterns,
    extracted.patterns,
    config
  );

  // Step 4: Merge anti-patterns
  knowledgeBase.antiPatterns = mergeAntiPatterns(
    knowledgeBase.antiPatterns,
    extracted.antiPatterns,
    config
  );

  // Step 5: Add sprint metrics
  if (extracted.metrics) {
    knowledgeBase.metrics.push(extracted.metrics);
  }

  // Step 6: Update sprint count (track unique sprints)
  const uniqueSprints = new Set([
    ...knowledgeBase.lessons.map((l) => l.sprintId),
    ...knowledgeBase.patterns.map((p) => p.sprintId),
    ...knowledgeBase.antiPatterns.map((a) => a.sprintId),
    ...knowledgeBase.metrics.map((m) => m.sprintId),
  ]);
  knowledgeBase.sprintCount = uniqueSprints.size;

  // Step 7: Save updated knowledge base
  await saveKnowledgeBase(knowledgeBase);

  logger.info(
    `Aggregation complete: knowledge base now has ${knowledgeBase.lessons.length} lessons, ${knowledgeBase.patterns.length} patterns, ${knowledgeBase.antiPatterns.length} anti-patterns from ${knowledgeBase.sprintCount} sprints`
  );

  return knowledgeBase;
}

/**
 * Aggregate batch of extracted knowledge
 *
 * Aggregates multiple sprints' knowledge into the knowledge base.
 *
 * @param extractedBatch - Array of extracted knowledge
 * @param config - Deduplication config
 * @returns Promise resolving to updated knowledge base
 *
 * @example
 * ```typescript
 * const extractedBatch = await extractKnowledgeBatch(sprints);
 * const knowledgeBase = await aggregateKnowledgeBatch(extractedBatch);
 * ```
 */
export async function aggregateKnowledgeBatch(
  extractedBatch: ExtractedKnowledge[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Promise<KnowledgeBase> {
  logger.info(`Aggregating batch of ${extractedBatch.length} sprints`);

  // Load knowledge base once
  let knowledgeBase = await loadKnowledgeBase();

  // Aggregate each sprint's knowledge
  for (const extracted of extractedBatch) {
    logger.info(
      `Aggregating ${extracted.sprintId}: ${extracted.lessons.length} lessons, ${extracted.patterns.length} patterns, ${extracted.antiPatterns.length} anti-patterns`
    );

    // Merge lessons
    knowledgeBase.lessons = mergeLessons(
      knowledgeBase.lessons,
      extracted.lessons,
      config
    );

    // Merge patterns
    knowledgeBase.patterns = mergePatterns(
      knowledgeBase.patterns,
      extracted.patterns,
      config
    );

    // Merge anti-patterns
    knowledgeBase.antiPatterns = mergeAntiPatterns(
      knowledgeBase.antiPatterns,
      extracted.antiPatterns,
      config
    );

    // Add sprint metrics
    if (extracted.metrics) {
      knowledgeBase.metrics.push(extracted.metrics);
    }
  }

  // Update sprint count
  const uniqueSprints = new Set([
    ...knowledgeBase.lessons.map((l) => l.sprintId),
    ...knowledgeBase.patterns.map((p) => p.sprintId),
    ...knowledgeBase.antiPatterns.map((a) => a.sprintId),
    ...knowledgeBase.metrics.map((m) => m.sprintId),
  ]);
  knowledgeBase.sprintCount = uniqueSprints.size;

  // Save knowledge base once at the end
  await saveKnowledgeBase(knowledgeBase);

  logger.info(
    `Batch aggregation complete: knowledge base now has ${knowledgeBase.lessons.length} lessons, ${knowledgeBase.patterns.length} patterns, ${knowledgeBase.antiPatterns.length} anti-patterns from ${knowledgeBase.sprintCount} sprints`
  );

  return knowledgeBase;
}

/**
 * Export knowledge base summary
 *
 * Generates a human-readable summary of the knowledge base.
 *
 * @param knowledgeBase - Knowledge base to summarize
 * @returns Summary object
 *
 * @example
 * ```typescript
 * const summary = exportKnowledgeBaseSummary(knowledgeBase);
 * console.log(`Total insights: ${summary.totalInsights}`);
 * console.log(`Most common category: ${summary.topCategory}`);
 * ```
 */
export function exportKnowledgeBaseSummary(knowledgeBase: KnowledgeBase): {
  totalInsights: number;
  totalLessons: number;
  totalPatterns: number;
  totalAntiPatterns: number;
  sprintCount: number;
  topCategory: string;
  categoryBreakdown: Record<string, number>;
  lastUpdated: string;
  version: string;
} {
  // Count insights by category
  const categoryBreakdown: Record<string, number> = {};

  for (const lesson of knowledgeBase.lessons) {
    categoryBreakdown[lesson.category] =
      (categoryBreakdown[lesson.category] || 0) + 1;
  }

  for (const pattern of knowledgeBase.patterns) {
    categoryBreakdown[pattern.category] =
      (categoryBreakdown[pattern.category] || 0) + 1;
  }

  for (const antiPattern of knowledgeBase.antiPatterns) {
    categoryBreakdown[antiPattern.category] =
      (categoryBreakdown[antiPattern.category] || 0) + 1;
  }

  // Find top category
  const topCategory =
    Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'none';

  const totalInsights =
    knowledgeBase.lessons.length +
    knowledgeBase.patterns.length +
    knowledgeBase.antiPatterns.length;

  return {
    totalInsights,
    totalLessons: knowledgeBase.lessons.length,
    totalPatterns: knowledgeBase.patterns.length,
    totalAntiPatterns: knowledgeBase.antiPatterns.length,
    sprintCount: knowledgeBase.sprintCount,
    topCategory,
    categoryBreakdown,
    lastUpdated: knowledgeBase.lastUpdated,
    version: knowledgeBase.version,
  };
}
