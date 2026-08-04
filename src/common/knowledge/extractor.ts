/**
 * Knowledge Extractor Module
 *
 * Main extraction logic with priority fallback.
 * Coordinates artifact discovery, markdown parsing, and metric computation.
 */

import { join } from 'path';
import { logger } from '../logger.js';
import { getProjectRoot } from '../path-utils.js';
import { readFile } from '../file-utils.js';
import {
  discoverArtifacts,
  hasKnowledgeArtifacts,
  getPrioritizedArtifacts,
} from './artifact-discovery.js';
import {
  parseKeyLearningsMarkdown,
  parseRetroMarkdown,
  extractFromSummary,
} from './markdown-parser.js';
import type {
  ExtractedKnowledge,
  SprintMetrics,
  Lesson,
  Pattern,
} from '../../types/knowledge.js';
import type { SprintIndexEntry } from '../../types/sprint-index.js';

/**
 * Compute sprint metrics from sprint index entry
 *
 * Calculates quantitative metrics for a sprint.
 *
 * @param sprint - Sprint index entry
 * @returns Sprint metrics
 *
 * @example
 * ```typescript
 * const metrics = computeSprintMetrics(sprintEntry);
 * // Returns: { sprintId, duration, completionMode, ... }
 * ```
 */
export function computeSprintMetrics(sprint: SprintIndexEntry): SprintMetrics {
  const metrics: SprintMetrics = {
    sprintId: sprint.id,
    completionMode: sprint.completionMode,
  };

  // Calculate duration if both createdAt and completedAt exist
  if (sprint.createdAt && sprint.completedAt) {
    const created = new Date(sprint.createdAt);
    const completed = new Date(sprint.completedAt);
    const durationMs = completed.getTime() - created.getTime();

    // Convert to ISO 8601 duration format (PT{hours}H{minutes}M)
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    metrics.duration = `PT${hours}H${minutes}M`;
  }

  return metrics;
}

/**
 * Extract knowledge from a single artifact file
 *
 * Reads and parses a knowledge artifact file.
 *
 * @param artifactPath - Relative path to artifact
 * @param sprintId - Sprint identifier
 * @returns Extracted lessons and patterns
 *
 * @example
 * ```typescript
 * const knowledge = await extractFromArtifact(
 *   'planning/sprint-13-eaydun/key-learnings.md',
 *   'sprint-13-eaydun'
 * );
 * ```
 */
async function extractFromArtifact(
  artifactPath: string,
  sprintId: string
): Promise<{ lessons: Lesson[]; patterns: Pattern[] }> {
  const projectRoot = getProjectRoot();
  const absolutePath = join(projectRoot, artifactPath);

  try {
    logger.debug(`Reading artifact: ${artifactPath}`);
    const content = await readFile(absolutePath);

    // Determine file type and parse accordingly
    const filename = artifactPath.split('/').pop()?.toLowerCase() || '';

    // Key learnings files
    if (
      filename.includes('key-learning') ||
      filename.includes('lessons-learned') ||
      filename.includes('learning')
    ) {
      const lessons = parseKeyLearningsMarkdown(content, sprintId);
      return { lessons, patterns: [] };
    }

    // Retrospective files
    if (filename.includes('retro')) {
      return parseRetroMarkdown(content, sprintId);
    }

    // Summary files
    if (
      filename.includes('summary') ||
      filename.includes('SPRINT_COMPLETE')
    ) {
      const lessons = extractFromSummary(content, sprintId);
      return { lessons, patterns: [] };
    }

    // Verification report (fallback)
    if (filename.includes('verification')) {
      // For verification reports, just extract bullet points as lessons
      const lessons = extractFromSummary(content, sprintId);
      return { lessons, patterns: [] };
    }

    // Unknown file type - return empty
    logger.warn(`Unknown artifact type: ${filename}`);
    return { lessons: [], patterns: [] };
  } catch (error) {
    logger.error(`Failed to extract from artifact ${artifactPath}`, error);
    return { lessons: [], patterns: [] };
  }
}

/**
 * Extract knowledge from a sprint
 *
 * Main extraction function. Discovers artifacts, extracts knowledge with
 * priority fallback, and computes metrics.
 *
 * **Extraction Priority:**
 * 1. Explicit learning files (key-learnings.md, lessons-learned.md)
 * 2. Retrospective files (retro.md)
 * 3. Summary files (SPRINT_COMPLETE.md, *-summary.md)
 * 4. Verification report (fallback)
 *
 * **Fallback Behavior:**
 * - Tries each artifact type in priority order
 * - Stops when sufficient knowledge found (lessons or patterns)
 * - Logs extraction source for transparency
 *
 * @param sprint - Sprint index entry
 * @returns Promise resolving to extracted knowledge
 *
 * @example
 * ```typescript
 * const knowledge = await extractKnowledge(sprintEntry);
 * console.log(`Extracted ${knowledge.lessons.length} lessons`);
 * console.log(`Source: ${knowledge.source.join(', ')}`);
 * ```
 */
export async function extractKnowledge(
  sprint: SprintIndexEntry
): Promise<ExtractedKnowledge> {
  const sprintId = sprint.id;

  logger.info(`Extracting knowledge from ${sprintId}`);

  const extracted: ExtractedKnowledge = {
    sprintId,
    lessons: [],
    patterns: [],
    antiPatterns: [],
    metrics: computeSprintMetrics(sprint),
    source: [],
    extractedAt: new Date().toISOString(),
  };

  // Step 1: Discover artifacts
  const artifacts = await discoverArtifacts(sprintId, sprint.manifestPath);

  if (!hasKnowledgeArtifacts(artifacts)) {
    logger.warn(`No knowledge artifacts found for ${sprintId}`);
    return extracted;
  }

  // Step 2: Get prioritized artifacts
  const prioritized = getPrioritizedArtifacts(artifacts);

  logger.debug(`Found ${prioritized.length} artifacts to extract from`);

  // Step 3: Extract from artifacts in priority order
  for (const artifactPath of prioritized) {
    const { lessons, patterns } = await extractFromArtifact(
      artifactPath,
      sprintId
    );

    if (lessons.length > 0 || patterns.length > 0) {
      extracted.lessons.push(...lessons);
      extracted.patterns.push(...patterns);
      extracted.source.push(artifactPath);

      logger.debug(
        `Extracted from ${artifactPath}: ${lessons.length} lessons, ${patterns.length} patterns`
      );

      // Continue extracting from all available artifacts
      // (don't stop at first success - aggregate knowledge from all sources)
    }
  }

  logger.info(
    `Extracted knowledge from ${sprintId}: ${extracted.lessons.length} lessons, ${extracted.patterns.length} patterns from ${extracted.source.length} sources`
  );

  return extracted;
}

/**
 * Extract knowledge from multiple sprints
 *
 * Batch extraction for multiple sprints.
 *
 * @param sprints - Array of sprint index entries
 * @returns Promise resolving to array of extracted knowledge
 *
 * @example
 * ```typescript
 * const allKnowledge = await extractKnowledgeBatch(sprints);
 * const totalLessons = allKnowledge.reduce((sum, k) => sum + k.lessons.length, 0);
 * console.log(`Extracted ${totalLessons} lessons from ${sprints.length} sprints`);
 * ```
 */
export async function extractKnowledgeBatch(
  sprints: SprintIndexEntry[]
): Promise<ExtractedKnowledge[]> {
  logger.info(`Batch extracting knowledge from ${sprints.length} sprints`);

  const results: ExtractedKnowledge[] = [];

  for (const sprint of sprints) {
    const knowledge = await extractKnowledge(sprint);
    results.push(knowledge);
  }

  const totalLessons = results.reduce((sum, k) => sum + k.lessons.length, 0);
  const totalPatterns = results.reduce((sum, k) => sum + k.patterns.length, 0);

  logger.info(
    `Batch extraction complete: ${totalLessons} lessons, ${totalPatterns} patterns from ${sprints.length} sprints`
  );

  return results;
}
