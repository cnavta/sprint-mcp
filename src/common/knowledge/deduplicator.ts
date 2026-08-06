/**
 * Knowledge Deduplication Module
 *
 * Implements similarity-based deduplication for lessons, patterns, and anti-patterns.
 * Merges duplicate knowledge entries by incrementing frequency and updating metadata.
 */

import { logger } from '../logger.js';
import type {
  Lesson,
  Pattern,
  AntiPattern,
  ExtractedKnowledge,
} from '../../types/knowledge.js';

/**
 * Deduplication configuration
 *
 * Controls similarity thresholds and matching behavior.
 */
export interface DeduplicationConfig {
  /**
   * Similarity threshold for lessons (0-1)
   *
   * Two lessons are considered duplicates if similarity >= threshold.
   *
   * Default: 0.8 (80% similar)
   */
  lessonSimilarityThreshold: number;

  /**
   * Similarity threshold for patterns (0-1)
   *
   * Two patterns are considered duplicates if similarity >= threshold.
   *
   * Default: 0.75 (75% similar)
   */
  patternSimilarityThreshold: number;

  /**
   * Case-sensitive comparison
   *
   * When true, "TypeScript" and "typescript" are different.
   * When false, they are the same.
   *
   * Default: false (case-insensitive)
   */
  caseSensitive: boolean;

  /**
   * Normalize whitespace before comparison
   *
   * When true, multiple spaces/newlines collapsed to single space.
   *
   * Default: true
   */
  normalizeWhitespace: boolean;
}

/**
 * Default deduplication configuration
 */
export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  lessonSimilarityThreshold: 0.8,
  patternSimilarityThreshold: 0.75,
  caseSensitive: false,
  normalizeWhitespace: true,
};

/**
 * Normalize text for comparison
 *
 * Applies case normalization and whitespace normalization based on config.
 *
 * @param text - Text to normalize
 * @param config - Deduplication config
 * @returns Normalized text
 *
 * @example
 * ```typescript
 * const normalized = normalizeText("  TypeScript  is   great  ", config);
 * // Returns: "typescript is great" (if case-insensitive)
 * ```
 */
export function normalizeText(
  text: string,
  config: DeduplicationConfig
): string {
  let normalized = text;

  // Normalize whitespace
  if (config.normalizeWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  // Normalize case
  if (!config.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Calculate Jaccard similarity between two texts
 *
 * Jaccard similarity = |intersection| / |union|
 *
 * Splits texts into words and calculates overlap.
 *
 * @param text1 - First text
 * @param text2 - Second text
 * @param config - Deduplication config
 * @returns Similarity score (0-1)
 *
 * @example
 * ```typescript
 * const similarity = calculateSimilarity(
 *   "Always validate input types",
 *   "Always validate input data",
 *   config
 * );
 * // Returns: 0.8 (4 out of 5 words match)
 * ```
 */
export function calculateSimilarity(
  text1: string,
  text2: string,
  config: DeduplicationConfig
): number {
  const normalized1 = normalizeText(text1, config);
  const normalized2 = normalizeText(text2, config);

  // Split into words
  const words1 = new Set(normalized1.split(/\s+/));
  const words2 = new Set(normalized2.split(/\s+/));

  // Calculate intersection
  const intersection = new Set(
    [...words1].filter((word) => words2.has(word))
  );

  // Calculate union
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity
  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Find duplicate lesson in existing lessons
 *
 * Searches for a lesson with similar content in the lessons array.
 *
 * @param lesson - Lesson to check
 * @param existingLessons - Array of existing lessons
 * @param config - Deduplication config
 * @returns Index of duplicate lesson or -1 if not found
 *
 * @example
 * ```typescript
 * const duplicateIndex = findDuplicateLesson(
 *   newLesson,
 *   existingLessons,
 *   config
 * );
 *
 * if (duplicateIndex >= 0) {
 *   // Merge with existing lesson
 * }
 * ```
 */
export function findDuplicateLesson(
  lesson: Lesson,
  existingLessons: Lesson[],
  config: DeduplicationConfig
): number {
  for (let i = 0; i < existingLessons.length; i++) {
    const existing = existingLessons[i];

    // Only compare lessons in the same category
    if (existing.category !== lesson.category) {
      continue;
    }

    const similarity = calculateSimilarity(
      lesson.content,
      existing.content,
      config
    );

    if (similarity >= config.lessonSimilarityThreshold) {
      logger.debug(
        `Found duplicate lesson (similarity: ${similarity.toFixed(2)}): "${lesson.content}" ~ "${existing.content}"`
      );
      return i;
    }
  }

  return -1;
}

/**
 * Merge lesson into existing lesson
 *
 * Updates frequency, lastSeenAt, and optionally merges context.
 *
 * @param existing - Existing lesson to update
 * @param newLesson - New lesson to merge
 * @returns Merged lesson
 *
 * @example
 * ```typescript
 * const merged = mergeLessons(existingLesson, newLesson);
 * console.log(merged.frequency); // Incremented by 1
 * ```
 */
export function mergeLessons(existing: Lesson, newLesson: Lesson): Lesson {
  return {
    ...existing,
    frequency: existing.frequency + 1,
    lastSeenAt: newLesson.lastSeenAt,
    // Merge context if new lesson has context and it's different
    context:
      newLesson.context &&
      newLesson.context !== existing.context &&
      !existing.context?.includes(newLesson.context)
        ? existing.context
          ? `${existing.context}; ${newLesson.context}`
          : newLesson.context
        : existing.context,
  };
}

/**
 * Deduplicate lessons
 *
 * Merges duplicate lessons based on content similarity.
 *
 * @param lessons - Array of lessons to deduplicate
 * @param config - Deduplication config
 * @returns Deduplicated lessons
 *
 * @example
 * ```typescript
 * const deduplicated = deduplicateLessons(extractedLessons, config);
 * console.log(`Reduced from ${extractedLessons.length} to ${deduplicated.length}`);
 * ```
 */
export function deduplicateLessons(
  lessons: Lesson[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Lesson[] {
  const deduplicated: Lesson[] = [];

  for (const lesson of lessons) {
    const duplicateIndex = findDuplicateLesson(lesson, deduplicated, config);

    if (duplicateIndex >= 0) {
      // Merge with existing
      deduplicated[duplicateIndex] = mergeLessons(
        deduplicated[duplicateIndex],
        lesson
      );
    } else {
      // Add new lesson
      deduplicated.push(lesson);
    }
  }

  logger.info(
    `Deduplicated lessons: ${lessons.length} → ${deduplicated.length} (${lessons.length - deduplicated.length} duplicates merged)`
  );

  return deduplicated;
}

/**
 * Find duplicate pattern in existing patterns
 *
 * Searches for a pattern with similar name or description.
 *
 * @param pattern - Pattern to check
 * @param existingPatterns - Array of existing patterns
 * @param config - Deduplication config
 * @returns Index of duplicate pattern or -1 if not found
 *
 * @example
 * ```typescript
 * const duplicateIndex = findDuplicatePattern(
 *   newPattern,
 *   existingPatterns,
 *   config
 * );
 * ```
 */
export function findDuplicatePattern(
  pattern: Pattern,
  existingPatterns: Pattern[],
  config: DeduplicationConfig
): number {
  for (let i = 0; i < existingPatterns.length; i++) {
    const existing = existingPatterns[i];

    // Only compare patterns in the same category
    if (existing.category !== pattern.category) {
      continue;
    }

    // Compare by name first (higher weight)
    const nameSimilarity = calculateSimilarity(
      pattern.name,
      existing.name,
      config
    );

    // Compare by description (lower weight)
    const descriptionSimilarity = calculateSimilarity(
      pattern.description,
      existing.description,
      config
    );

    // Weighted average: name (60%), description (40%)
    const similarity = nameSimilarity * 0.6 + descriptionSimilarity * 0.4;

    if (similarity >= config.patternSimilarityThreshold) {
      logger.debug(
        `Found duplicate pattern (similarity: ${similarity.toFixed(2)}): "${pattern.name}" ~ "${existing.name}"`
      );
      return i;
    }
  }

  return -1;
}

/**
 * Merge pattern into existing pattern
 *
 * Updates frequency and optionally merges benefits/examples.
 *
 * @param existing - Existing pattern to update
 * @param newPattern - New pattern to merge
 * @returns Merged pattern
 *
 * @example
 * ```typescript
 * const merged = mergePatterns(existingPattern, newPattern);
 * console.log(merged.frequency); // Incremented by 1
 * ```
 */
export function mergePatterns(existing: Pattern, newPattern: Pattern): Pattern {
  return {
    ...existing,
    frequency: existing.frequency + 1,
    // Merge benefits if new pattern has unique benefits
    benefits: newPattern.benefits
      ? [
          ...(existing.benefits || []),
          ...newPattern.benefits.filter(
            (b) => !(existing.benefits || []).includes(b)
          ),
        ]
      : existing.benefits,
    // Merge examples if new pattern has unique examples
    examples: newPattern.examples
      ? [
          ...(existing.examples || []),
          ...newPattern.examples.filter(
            (e) => !(existing.examples || []).includes(e)
          ),
        ]
      : existing.examples,
    // Merge context
    context:
      newPattern.context &&
      newPattern.context !== existing.context &&
      !existing.context?.includes(newPattern.context)
        ? existing.context
          ? `${existing.context}; ${newPattern.context}`
          : newPattern.context
        : existing.context,
  };
}

/**
 * Deduplicate patterns
 *
 * Merges duplicate patterns based on name and description similarity.
 *
 * @param patterns - Array of patterns to deduplicate
 * @param config - Deduplication config
 * @returns Deduplicated patterns
 *
 * @example
 * ```typescript
 * const deduplicated = deduplicatePatterns(extractedPatterns, config);
 * console.log(`Reduced from ${extractedPatterns.length} to ${deduplicated.length}`);
 * ```
 */
export function deduplicatePatterns(
  patterns: Pattern[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): Pattern[] {
  const deduplicated: Pattern[] = [];

  for (const pattern of patterns) {
    const duplicateIndex = findDuplicatePattern(pattern, deduplicated, config);

    if (duplicateIndex >= 0) {
      // Merge with existing
      deduplicated[duplicateIndex] = mergePatterns(
        deduplicated[duplicateIndex],
        pattern
      );
    } else {
      // Add new pattern
      deduplicated.push(pattern);
    }
  }

  logger.info(
    `Deduplicated patterns: ${patterns.length} → ${deduplicated.length} (${patterns.length - deduplicated.length} duplicates merged)`
  );

  return deduplicated;
}

/**
 * Find duplicate anti-pattern in existing anti-patterns
 *
 * Searches for an anti-pattern with similar name or description.
 *
 * @param antiPattern - Anti-pattern to check
 * @param existingAntiPatterns - Array of existing anti-patterns
 * @param config - Deduplication config
 * @returns Index of duplicate anti-pattern or -1 if not found
 */
export function findDuplicateAntiPattern(
  antiPattern: AntiPattern,
  existingAntiPatterns: AntiPattern[],
  config: DeduplicationConfig
): number {
  for (let i = 0; i < existingAntiPatterns.length; i++) {
    const existing = existingAntiPatterns[i];

    // Only compare anti-patterns in the same category
    if (existing.category !== antiPattern.category) {
      continue;
    }

    // Compare by name first (higher weight)
    const nameSimilarity = calculateSimilarity(
      antiPattern.name,
      existing.name,
      config
    );

    // Compare by description (lower weight)
    const descriptionSimilarity = calculateSimilarity(
      antiPattern.description,
      existing.description,
      config
    );

    // Weighted average: name (60%), description (40%)
    const similarity = nameSimilarity * 0.6 + descriptionSimilarity * 0.4;

    if (similarity >= config.patternSimilarityThreshold) {
      logger.debug(
        `Found duplicate anti-pattern (similarity: ${similarity.toFixed(2)}): "${antiPattern.name}" ~ "${existing.name}"`
      );
      return i;
    }
  }

  return -1;
}

/**
 * Merge anti-pattern into existing anti-pattern
 *
 * Updates frequency and optionally merges examples and solution.
 *
 * @param existing - Existing anti-pattern to update
 * @param newAntiPattern - New anti-pattern to merge
 * @returns Merged anti-pattern
 */
export function mergeAntiPatterns(
  existing: AntiPattern,
  newAntiPattern: AntiPattern
): AntiPattern {
  return {
    ...existing,
    frequency: existing.frequency + 1,
    // Merge examples if new anti-pattern has unique examples
    examples: newAntiPattern.examples
      ? [
          ...(existing.examples || []),
          ...newAntiPattern.examples.filter(
            (e) => !(existing.examples || []).includes(e)
          ),
        ]
      : existing.examples,
    // Keep existing solution, or add new one if existing doesn't have one
    solution: existing.solution || newAntiPattern.solution,
  };
}

/**
 * Deduplicate anti-patterns
 *
 * Merges duplicate anti-patterns based on name and description similarity.
 *
 * @param antiPatterns - Array of anti-patterns to deduplicate
 * @param config - Deduplication config
 * @returns Deduplicated anti-patterns
 */
export function deduplicateAntiPatterns(
  antiPatterns: AntiPattern[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): AntiPattern[] {
  const deduplicated: AntiPattern[] = [];

  for (const antiPattern of antiPatterns) {
    const duplicateIndex = findDuplicateAntiPattern(
      antiPattern,
      deduplicated,
      config
    );

    if (duplicateIndex >= 0) {
      // Merge with existing
      deduplicated[duplicateIndex] = mergeAntiPatterns(
        deduplicated[duplicateIndex],
        antiPattern
      );
    } else {
      // Add new anti-pattern
      deduplicated.push(antiPattern);
    }
  }

  logger.info(
    `Deduplicated anti-patterns: ${antiPatterns.length} → ${deduplicated.length} (${antiPatterns.length - deduplicated.length} duplicates merged)`
  );

  return deduplicated;
}

/**
 * Deduplicate extracted knowledge
 *
 * Main deduplication function that processes all knowledge types.
 *
 * @param knowledge - Extracted knowledge to deduplicate
 * @param config - Deduplication config
 * @returns Deduplicated knowledge
 *
 * @example
 * ```typescript
 * const extracted = await extractKnowledge(sprint);
 * const deduplicated = deduplicateKnowledge(extracted);
 *
 * console.log(`Lessons: ${extracted.lessons.length} → ${deduplicated.lessons.length}`);
 * console.log(`Patterns: ${extracted.patterns.length} → ${deduplicated.patterns.length}`);
 * ```
 */
export function deduplicateKnowledge(
  knowledge: ExtractedKnowledge,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): ExtractedKnowledge {
  logger.info(`Deduplicating knowledge from ${knowledge.sprintId}`);

  const deduplicated: ExtractedKnowledge = {
    ...knowledge,
    lessons: deduplicateLessons(knowledge.lessons, config),
    patterns: deduplicatePatterns(knowledge.patterns, config),
    antiPatterns: deduplicateAntiPatterns(knowledge.antiPatterns, config),
  };

  logger.info(
    `Deduplication complete for ${knowledge.sprintId}: ${deduplicated.lessons.length} lessons, ${deduplicated.patterns.length} patterns, ${deduplicated.antiPatterns.length} anti-patterns`
  );

  return deduplicated;
}

/**
 * Deduplicate batch of extracted knowledge
 *
 * Deduplicates each sprint's knowledge individually.
 *
 * @param knowledgeBatch - Array of extracted knowledge
 * @param config - Deduplication config
 * @returns Array of deduplicated knowledge
 *
 * @example
 * ```typescript
 * const extractedBatch = await extractKnowledgeBatch(sprints);
 * const deduplicatedBatch = deduplicateKnowledgeBatch(extractedBatch);
 * ```
 */
export function deduplicateKnowledgeBatch(
  knowledgeBatch: ExtractedKnowledge[],
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): ExtractedKnowledge[] {
  logger.info(`Deduplicating batch of ${knowledgeBatch.length} sprints`);

  const deduplicated = knowledgeBatch.map((knowledge) =>
    deduplicateKnowledge(knowledge, config)
  );

  const totalLessons = deduplicated.reduce(
    (sum, k) => sum + k.lessons.length,
    0
  );
  const totalPatterns = deduplicated.reduce(
    (sum, k) => sum + k.patterns.length,
    0
  );
  const totalAntiPatterns = deduplicated.reduce(
    (sum, k) => sum + k.antiPatterns.length,
    0
  );

  logger.info(
    `Batch deduplication complete: ${totalLessons} lessons, ${totalPatterns} patterns, ${totalAntiPatterns} anti-patterns`
  );

  return deduplicated;
}
