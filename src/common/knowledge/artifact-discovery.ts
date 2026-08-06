/**
 * Artifact Discovery Module
 *
 * Pattern-based discovery of knowledge artifacts in sprint directories.
 * Finds learning files, retrospectives, summaries, and other knowledge sources.
 */

import { join, dirname } from 'path';
import { logger } from '../logger.js';
import { getProjectRoot } from '../path-utils.js';
import { readdir } from 'fs/promises';
import type { KnowledgeArtifacts } from '../../types/knowledge.js';

/**
 * Patterns for discovering knowledge artifacts
 *
 * Case-insensitive patterns for finding files containing sprint knowledge.
 */
const ARTIFACT_PATTERNS = {
  /** Explicit learning files */
  learning: [
    /^key-learnings\.md$/i,
    /^lessons-learned\.md$/i,
    /^learnings\.md$/i,
    /^lessons\.md$/i,
    /.*learn.*\.md$/i, // Any file with "learn" in name
  ],

  /** Retrospective files */
  retro: [
    /^retro\.md$/i,
    /^retrospective\.md$/i,
    /^sprint-retro\.md$/i,
    /^sprint-retrospective\.md$/i,
  ],

  /** Summary files */
  summary: [
    /^SPRINT_COMPLETE\.md$/i,
    /^completion-summary\.md$/i,
    /^sprint-summary\.md$/i,
    /.*-summary\.md$/i, // Any file ending with -summary.md
  ],

  /** Verification report */
  verification: [
    /^verification-report\.md$/i,
    /^verification\.md$/i,
  ],

  /** Publication metadata */
  publication: [
    /^publication\.yaml$/i,
    /^publication\.yml$/i,
  ],
};

/**
 * Check if filename matches any pattern in the list
 *
 * @param filename - Filename to test
 * @param patterns - Array of RegExp patterns
 * @returns true if filename matches any pattern
 */
function matchesAnyPattern(filename: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filename));
}

/**
 * Get sprint directory path from manifestPath
 *
 * @param manifestPath - Relative path to sprint manifest
 * @returns Absolute path to sprint directory
 *
 * @example
 * ```typescript
 * const dir = getSprintDir('planning/active/sprint-13-eaydun/sprint-manifest.yaml');
 * // Returns: /path/to/project/planning/active/sprint-13-eaydun
 * ```
 */
function getSprintDir(manifestPath: string): string {
  const projectRoot = getProjectRoot();
  const absoluteManifestPath = join(projectRoot, manifestPath);
  return dirname(absoluteManifestPath);
}

/**
 * Discover knowledge artifacts in a sprint directory
 *
 * Scans sprint directory for files matching knowledge artifact patterns.
 * Categorizes discovered files by type (learning, retro, summary, etc.).
 *
 * @param sprintId - Sprint identifier
 * @param manifestPath - Relative path to sprint manifest
 * @returns Promise resolving to categorized artifacts
 *
 * @example
 * ```typescript
 * const artifacts = await discoverArtifacts(
 *   'sprint-13-eaydun',
 *   'planning/active/sprint-13-eaydun/sprint-manifest.yaml'
 * );
 *
 * console.log(artifacts.learningFiles);
 * // ['planning/active/sprint-13-eaydun/key-learnings.md']
 * ```
 */
export async function discoverArtifacts(
  sprintId: string,
  manifestPath: string
): Promise<KnowledgeArtifacts> {
  logger.debug(`Discovering knowledge artifacts for ${sprintId}`);

  const sprintDir = getSprintDir(manifestPath);
  const sprintDirRelative = dirname(manifestPath);

  const artifacts: KnowledgeArtifacts = {
    sprintId,
    learningFiles: [],
    retroFiles: [],
    summaryFiles: [],
  };

  try {
    // Read all files in sprint directory
    const files = await readdir(sprintDir);

    logger.debug(`Found ${files.length} files in ${sprintDirRelative}`);

    // Categorize files by pattern
    for (const file of files) {
      const relativePath = join(sprintDirRelative, file);

      if (matchesAnyPattern(file, ARTIFACT_PATTERNS.learning)) {
        artifacts.learningFiles.push(relativePath);
        logger.debug(`Found learning file: ${file}`);
      } else if (matchesAnyPattern(file, ARTIFACT_PATTERNS.retro)) {
        artifacts.retroFiles.push(relativePath);
        logger.debug(`Found retro file: ${file}`);
      } else if (matchesAnyPattern(file, ARTIFACT_PATTERNS.summary)) {
        artifacts.summaryFiles.push(relativePath);
        logger.debug(`Found summary file: ${file}`);
      } else if (matchesAnyPattern(file, ARTIFACT_PATTERNS.verification)) {
        artifacts.verificationFile = relativePath;
        logger.debug(`Found verification file: ${file}`);
      } else if (matchesAnyPattern(file, ARTIFACT_PATTERNS.publication)) {
        artifacts.publicationFile = relativePath;
        logger.debug(`Found publication file: ${file}`);
      }
    }

    logger.info(`Discovered artifacts for ${sprintId}`, {
      learning: artifacts.learningFiles.length,
      retro: artifacts.retroFiles.length,
      summary: artifacts.summaryFiles.length,
      verification: artifacts.verificationFile ? 1 : 0,
      publication: artifacts.publicationFile ? 1 : 0,
    });

    return artifacts;
  } catch (error) {
    logger.error(`Failed to discover artifacts for ${sprintId}`, error);

    // Return empty artifacts on error
    return artifacts;
  }
}

/**
 * Check if sprint has any knowledge artifacts
 *
 * Quick check to determine if sprint contains extractable knowledge.
 *
 * @param artifacts - Discovered artifacts
 * @returns true if sprint has at least one knowledge artifact
 *
 * @example
 * ```typescript
 * const artifacts = await discoverArtifacts(...);
 * if (hasKnowledgeArtifacts(artifacts)) {
 *   // Proceed with extraction
 * }
 * ```
 */
export function hasKnowledgeArtifacts(artifacts: KnowledgeArtifacts): boolean {
  return (
    artifacts.learningFiles.length > 0 ||
    artifacts.retroFiles.length > 0 ||
    artifacts.summaryFiles.length > 0 ||
    !!artifacts.verificationFile
  );
}

/**
 * Get priority-ordered list of artifacts for extraction
 *
 * Returns artifacts in priority order:
 * 1. Learning files (most explicit)
 * 2. Retro files (structured lessons)
 * 3. Summary files (high-level insights)
 * 4. Verification file (task-level details)
 *
 * @param artifacts - Discovered artifacts
 * @returns Array of artifact paths in priority order
 *
 * @example
 * ```typescript
 * const artifacts = await discoverArtifacts(...);
 * const prioritized = getPrioritizedArtifacts(artifacts);
 *
 * // Try extracting from highest priority first
 * for (const artifactPath of prioritized) {
 *   const knowledge = await extractFromArtifact(artifactPath);
 *   if (knowledge.lessons.length > 0) break;
 * }
 * ```
 */
export function getPrioritizedArtifacts(
  artifacts: KnowledgeArtifacts
): string[] {
  const prioritized: string[] = [];

  // Priority 1: Explicit learning files
  prioritized.push(...artifacts.learningFiles);

  // Priority 2: Retrospective files
  prioritized.push(...artifacts.retroFiles);

  // Priority 3: Summary files
  prioritized.push(...artifacts.summaryFiles);

  // Priority 4: Verification report (fallback)
  if (artifacts.verificationFile) {
    prioritized.push(artifacts.verificationFile);
  }

  return prioritized;
}
