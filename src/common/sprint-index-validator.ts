/**
 * Sprint Index Validator
 *
 * Validates the sprint index for consistency, completeness, and correctness.
 * Detects issues like missing manifests, data mismatches, orphaned sprints,
 * and incorrect statistics.
 *
 * Key principles:
 * - Non-fatal: Always returns a result, never throws
 * - Structured errors: Categorized by severity (error vs warning)
 * - Actionable: Error codes and messages guide remediation
 * - Comprehensive: Checks schema, data, files, and statistics
 */

import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { logger } from './logger.js';
import {
  fileExists,
  readFile,
  listDirectories,
} from './file-utils.js';
import { loadSprintIndex } from './sprint-index-manager.js';
import type {
  SprintIndex,
  ValidationIssue,
  IndexValidationResult,
} from '../types/sprint-index.js';
import type { SprintStatus, SprintManifest } from '../types/sprint.js';

/**
 * Valid sprint status values
 */
const VALID_STATUSES: SprintStatus[] = [
  'planning',
  'in-progress',
  'validating',
  'verifying',
  'published',
  'complete',
];

/**
 * Required fields for sprint index root
 */
const REQUIRED_INDEX_FIELDS = [
  'version',
  'generatedAt',
  'totalSprints',
  'activeSprints',
  'completedSprints',
  'sprints',
  'statistics',
];

/**
 * Required fields for each sprint entry
 */
const REQUIRED_ENTRY_FIELDS = [
  'id',
  'title',
  'status',
  'owner',
  'createdAt',
  'manifestPath',
  'branch',
];

/**
 * Get the path to the planning directory
 * Computed dynamically to support test isolation via process.chdir()
 */
function getPlanningDir(): string {
  return join(process.cwd(), 'planning');
}

/**
 * Validate the sprint index for consistency and correctness
 *
 * Performs comprehensive validation including:
 * - Schema validation (required fields, valid values)
 * - Entry validation (each sprint has required fields)
 * - File existence (manifests exist on disk)
 * - Data consistency (index matches manifest data)
 * - Orphan detection (manifests not in index)
 * - Statistics accuracy (computed values match actual data)
 *
 * @returns Promise<IndexValidationResult> Validation result with errors and warnings
 */
export async function validateSprintIndex(): Promise<IndexValidationResult> {
  logger.info('Validating sprint index');

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  try {
    // Load the sprint index
    const index = await loadSprintIndex();

    // 1. Schema validation
    validateSchema(index, errors);

    // 2. Entry validation
    validateEntries(index, errors, warnings);

    // 3. File existence validation
    await validateManifestFiles(index, errors);

    // 4. Data consistency validation
    await validateDataConsistency(index, errors, warnings);

    // 5. Orphaned manifest detection
    await detectOrphanedManifests(index, warnings);

    // 6. Statistics validation
    validateStatistics(index, errors);

    const valid = errors.length === 0;

    logger.info(
      `Validation complete: ${valid ? 'PASSED' : 'FAILED'} (${errors.length} errors, ${warnings.length} warnings)`
    );

    return {
      valid,
      errors,
      warnings,
      validatedAt: new Date().toISOString(),
    };
  } catch (error) {
    // If we can't even load the index, return a fatal error
    logger.error('Fatal error during validation', error);

    return {
      valid: false,
      errors: [
        {
          severity: 'error',
          code: 'VALIDATION_FATAL',
          message: `Fatal error during validation: ${error}`,
        },
      ],
      warnings: [],
      validatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Validate index schema (required fields and version)
 */
function validateSchema(index: SprintIndex, errors: ValidationIssue[]): void {
  // Check version field
  if (!index.version) {
    errors.push({
      severity: 'error',
      code: 'MISSING_VERSION',
      message: 'Sprint index is missing required field: version',
    });
  }

  // Check all required root fields
  for (const field of REQUIRED_INDEX_FIELDS) {
    if (!(field in index)) {
      errors.push({
        severity: 'error',
        code: 'MISSING_FIELD',
        message: `Sprint index is missing required field: ${field}`,
        context: { field },
      });
    }
  }

  // Validate version format (should be semantic version or "1.0" format)
  if (index.version && !/^\d+\.\d+/.test(index.version)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_VERSION',
      message: `Invalid version format: ${index.version} (expected format: X.Y)`,
      context: { version: index.version },
    });
  }
}

/**
 * Validate each sprint entry has required fields and valid values
 */
function validateEntries(
  index: SprintIndex,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  if (!Array.isArray(index.sprints)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_SPRINTS_ARRAY',
      message: 'Sprint index "sprints" field must be an array',
    });
    return;
  }

  for (const entry of index.sprints) {
    // Check required fields
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (!(field in entry) || !(entry as any)[field]) {
        errors.push({
          severity: 'error',
          code: 'MISSING_ENTRY_FIELD',
          message: `Sprint ${entry.id || 'unknown'} is missing required field: ${field}`,
          sprintId: entry.id,
          context: { field },
        });
      }
    }

    // Validate status is a valid enum value
    if (entry.status && !VALID_STATUSES.includes(entry.status)) {
      errors.push({
        severity: 'error',
        code: 'INVALID_STATUS',
        message: `Sprint ${entry.id} has invalid status: ${entry.status}`,
        sprintId: entry.id,
        context: {
          actualStatus: entry.status,
          validStatuses: VALID_STATUSES,
        },
      });
    }

    // Validate sprint ID format (should be sprint-N-hash)
    if (entry.id && !/^sprint-\d+-[a-z0-9]+$/.test(entry.id)) {
      warnings.push({
        severity: 'warning',
        code: 'INVALID_ID_FORMAT',
        message: `Sprint ${entry.id} has non-standard ID format (expected: sprint-N-hash)`,
        sprintId: entry.id,
      });
    }

    // Validate completedAt exists if status is complete
    if (entry.status === 'complete' && !entry.completedAt) {
      warnings.push({
        severity: 'warning',
        code: 'MISSING_COMPLETED_AT',
        message: `Sprint ${entry.id} is complete but missing completedAt timestamp`,
        sprintId: entry.id,
      });
    }

    // Validate completionMode exists if status is complete
    if (entry.status === 'complete' && !entry.completionMode) {
      warnings.push({
        severity: 'warning',
        code: 'MISSING_COMPLETION_MODE',
        message: `Sprint ${entry.id} is complete but missing completionMode`,
        sprintId: entry.id,
      });
    }
  }
}

/**
 * Validate that manifest files exist for all index entries
 */
async function validateManifestFiles(
  index: SprintIndex,
  errors: ValidationIssue[]
): Promise<void> {
  if (!Array.isArray(index.sprints)) {
    return; // Already reported in validateEntries
  }

  for (const entry of index.sprints) {
    // Skip if manifestPath is missing, null, undefined, or empty string
    if (!entry.manifestPath || typeof entry.manifestPath !== 'string') {
      continue; // Already reported in validateEntries
    }

    const manifestPath = join(process.cwd(), entry.manifestPath);
    const exists = await fileExists(manifestPath);

    if (!exists) {
      errors.push({
        severity: 'error',
        code: 'MANIFEST_NOT_FOUND',
        message: `Sprint ${entry.id} manifest file not found: ${entry.manifestPath}`,
        sprintId: entry.id,
        context: { manifestPath: entry.manifestPath },
      });
    }
  }
}

/**
 * Validate that index data matches manifest data
 */
async function validateDataConsistency(
  index: SprintIndex,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): Promise<void> {
  if (!Array.isArray(index.sprints)) {
    return;
  }

  for (const entry of index.sprints) {
    // Skip if manifestPath is missing, null, undefined, or empty string
    if (!entry.manifestPath || typeof entry.manifestPath !== 'string') {
      continue;
    }

    const manifestPath = join(process.cwd(), entry.manifestPath);

    if (!(await fileExists(manifestPath))) {
      continue; // Already reported in validateManifestFiles
    }

    try {
      const manifestContent = await readFile(manifestPath);
      const manifest = parseYaml(manifestContent) as SprintManifest;

      // Check critical fields match
      if (manifest.id !== entry.id) {
        errors.push({
          severity: 'error',
          code: 'DATA_MISMATCH_ID',
          message: `Sprint ${entry.id} ID mismatch: index has "${entry.id}", manifest has "${manifest.id}"`,
          sprintId: entry.id,
          context: { indexId: entry.id, manifestId: manifest.id },
        });
      }

      if (manifest.title !== entry.title) {
        warnings.push({
          severity: 'warning',
          code: 'DATA_MISMATCH_TITLE',
          message: `Sprint ${entry.id} title mismatch between index and manifest`,
          sprintId: entry.id,
          context: { indexTitle: entry.title, manifestTitle: manifest.title },
        });
      }

      if (manifest.status !== entry.status) {
        errors.push({
          severity: 'error',
          code: 'DATA_MISMATCH_STATUS',
          message: `Sprint ${entry.id} status mismatch: index has "${entry.status}", manifest has "${manifest.status}"`,
          sprintId: entry.id,
          context: {
            indexStatus: entry.status,
            manifestStatus: manifest.status,
          },
        });
      }

      if (manifest.owner !== entry.owner) {
        warnings.push({
          severity: 'warning',
          code: 'DATA_MISMATCH_OWNER',
          message: `Sprint ${entry.id} owner mismatch between index and manifest`,
          sprintId: entry.id,
          context: { indexOwner: entry.owner, manifestOwner: manifest.owner },
        });
      }
    } catch (error) {
      errors.push({
        severity: 'error',
        code: 'MANIFEST_PARSE_ERROR',
        message: `Sprint ${entry.id} manifest could not be parsed: ${error}`,
        sprintId: entry.id,
        context: { manifestPath: entry.manifestPath },
      });
    }
  }
}

/**
 * Detect manifests that exist on disk but are not in the index
 */
async function detectOrphanedManifests(
  index: SprintIndex,
  warnings: ValidationIssue[]
): Promise<void> {
  const planningDir = getPlanningDir();
  let sprintDirs: string[];

  try {
    sprintDirs = await listDirectories(planningDir);
  } catch (error) {
    logger.warn('Could not list planning directory for orphan detection', error);
    return;
  }

  // Get set of sprint IDs in the index
  const indexedSprintIds = new Set(
    Array.isArray(index.sprints) ? index.sprints.map((s) => s.id) : []
  );

  for (const sprintDir of sprintDirs) {
    const dirName = sprintDir.split('/').pop() || '';

    // Skip non-sprint directories
    if (!dirName.startsWith('sprint-')) {
      continue;
    }

    const manifestPath = join(sprintDir, 'sprint-manifest.yaml');

    if (await fileExists(manifestPath)) {
      try {
        const manifestContent = await readFile(manifestPath);
        const manifest = parseYaml(manifestContent) as SprintManifest;

        // Check if this sprint is in the index
        if (!indexedSprintIds.has(manifest.id)) {
          warnings.push({
            severity: 'warning',
            code: 'ORPHANED_MANIFEST',
            message: `Sprint ${manifest.id} has a manifest but is not in the index`,
            sprintId: manifest.id,
            context: { manifestPath: `planning/${dirName}/sprint-manifest.yaml` },
          });
        }
      } catch (error) {
        // Can't parse manifest, skip
        logger.debug(`Could not parse manifest at ${manifestPath}`, error);
      }
    }
  }
}

/**
 * Validate that statistics match actual sprint data
 */
function validateStatistics(
  index: SprintIndex,
  errors: ValidationIssue[]
): void {
  if (!Array.isArray(index.sprints)) {
    return;
  }

  // Validate totalSprints
  if (index.totalSprints !== index.sprints.length) {
    errors.push({
      severity: 'error',
      code: 'STATS_MISMATCH_TOTAL',
      message: `Statistics mismatch: totalSprints is ${index.totalSprints} but found ${index.sprints.length} sprints`,
      context: {
        reportedTotal: index.totalSprints,
        actualTotal: index.sprints.length,
      },
    });
  }

  // Validate activeSprints
  const actualActive = index.sprints.filter((s) => s.status !== 'complete')
    .length;
  if (index.activeSprints !== actualActive) {
    errors.push({
      severity: 'error',
      code: 'STATS_MISMATCH_ACTIVE',
      message: `Statistics mismatch: activeSprints is ${index.activeSprints} but found ${actualActive} active sprints`,
      context: {
        reportedActive: index.activeSprints,
        actualActive,
      },
    });
  }

  // Validate completedSprints
  const actualCompleted = index.sprints.filter((s) => s.status === 'complete')
    .length;
  if (index.completedSprints !== actualCompleted) {
    errors.push({
      severity: 'error',
      code: 'STATS_MISMATCH_COMPLETED',
      message: `Statistics mismatch: completedSprints is ${index.completedSprints} but found ${actualCompleted} completed sprints`,
      context: {
        reportedCompleted: index.completedSprints,
        actualCompleted,
      },
    });
  }

  // Validate statistics.byStatus counts
  if (index.statistics && index.statistics.byStatus) {
    const actualByStatus: Record<string, number> = {};

    // Initialize all status counts to 0
    for (const status of VALID_STATUSES) {
      actualByStatus[status] = 0;
    }

    // Count actual statuses
    for (const sprint of index.sprints) {
      if (sprint.status) {
        actualByStatus[sprint.status] = (actualByStatus[sprint.status] || 0) + 1;
      }
    }

    // Compare with reported statistics
    for (const status of VALID_STATUSES) {
      const reportedCount = index.statistics.byStatus[status] || 0;
      const actualCount = actualByStatus[status] || 0;

      if (reportedCount !== actualCount) {
        errors.push({
          severity: 'error',
          code: 'STATS_MISMATCH_BY_STATUS',
          message: `Statistics mismatch: byStatus.${status} is ${reportedCount} but found ${actualCount} sprints with that status`,
          context: {
            status,
            reportedCount,
            actualCount,
          },
        });
      }
    }
  }

  // Validate statistics.byCompletionMode counts
  if (index.statistics && index.statistics.byCompletionMode) {
    const completedSprints = index.sprints.filter((s) => s.status === 'complete');
    const actualNormal = completedSprints.filter(
      (s) => s.completionMode === 'normal'
    ).length;
    const actualForced = completedSprints.filter(
      (s) => s.completionMode === 'forced'
    ).length;

    if (index.statistics.byCompletionMode.normal !== actualNormal) {
      errors.push({
        severity: 'error',
        code: 'STATS_MISMATCH_COMPLETION_MODE',
        message: `Statistics mismatch: byCompletionMode.normal is ${index.statistics.byCompletionMode.normal} but found ${actualNormal}`,
        context: {
          reportedNormal: index.statistics.byCompletionMode.normal,
          actualNormal,
        },
      });
    }

    if (index.statistics.byCompletionMode.forced !== actualForced) {
      errors.push({
        severity: 'error',
        code: 'STATS_MISMATCH_COMPLETION_MODE',
        message: `Statistics mismatch: byCompletionMode.forced is ${index.statistics.byCompletionMode.forced} but found ${actualForced}`,
        context: {
          reportedForced: index.statistics.byCompletionMode.forced,
          actualForced,
        },
      });
    }
  }
}
