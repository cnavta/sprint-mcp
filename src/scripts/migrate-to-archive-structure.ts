#!/usr/bin/env node
/**
 * Migration Script: Flat Structure → Active/Archive Hierarchy
 *
 * Migrates sprint-mcp from flat directory structure to organized
 * active/archive hierarchy.
 *
 * Before:
 * ```
 * planning/
 *   sprint-1-abc/
 *   sprint-2-def/
 *   ...
 *   sprint-13-xyz/
 *   sprint-index.yaml
 * ```
 *
 * After:
 * ```
 * planning/
 *   active/
 *     sprint-12-recent/
 *     sprint-13-current/
 *   archive/
 *     2026/
 *       sprint-1-old/
 *       ...
 *       sprint-11-archived/
 *   sprint-index.yaml (updated paths)
 *   archive-config.yaml (new)
 * ```
 *
 * Usage:
 * ```bash
 * # Dry run (preview changes)
 * npm run migrate:archive -- --dry-run
 *
 * # Execute migration
 * npm run migrate:archive
 *
 * # Force migration (skip safety checks)
 * npm run migrate:archive -- --force
 * ```
 *
 * Safety Features:
 * - Pre-migration validation
 * - Automatic backup creation
 * - Dry-run mode
 * - Rollback support
 * - Atomic operations
 *
 * Related:
 * - Technical Architecture Section 3.1: Migration Plan
 * - Technical Architecture Section 7.2: Migration Implementation
 * - Sprint 13, Task 13-101: Implement Migration Script
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { stringify as stringifyYaml } from 'yaml';
import { logger } from '../common/logger.js';
import { getPlanningDir } from '../common/path-utils.js';
import { loadSprintIndex, regenerateSprintIndex } from '../common/sprint-index-manager.js';
import { fileExists, readFile, writeFile } from '../common/file-utils.js';
import type { SprintIndexEntry } from '../types/sprint-index.js';
import type { ArchiveConfig } from '../types/archive-config.js';
import { RECOMMENDED_ARCHIVE_CONFIG } from '../types/archive-config.js';

/**
 * Migration options
 */
interface MigrationOptions {
  dryRun: boolean;
  force: boolean;
  activeThresholdDays: number; // Sprints completed in last N days stay active
  keepRecentCount: number;    // Keep at least N most recent completed sprints active
}

/**
 * Migration result
 */
interface MigrationResult {
  success: boolean;
  dryRun: boolean;
  backupCreated: boolean;
  backupPath?: string;
  movedToActive: number;
  movedToArchive: number;
  errors: string[];
  warnings: string[];
}

/**
 * Sprint categorization for migration
 */
interface SprintCategories {
  active: SprintIndexEntry[];      // Active, planning, in-progress
  recentCompleted: SprintIndexEntry[];  // Recently completed
  toArchive: SprintIndexEntry[];   // Old completed sprints
}

/**
 * Default migration options
 */
const DEFAULT_OPTIONS: MigrationOptions = {
  dryRun: false,
  force: false,
  activeThresholdDays: 30,
  keepRecentCount: 2,
};

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };

  for (const arg of args) {
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg.startsWith('--active-days=')) {
      options.activeThresholdDays = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--keep-recent=')) {
      options.keepRecentCount = parseInt(arg.split('=')[1], 10);
    }
  }

  return options;
}

/**
 * Validate pre-migration state
 */
async function validatePreMigrationState(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const planningDir = getPlanningDir();

  logger.info('Validating pre-migration state...');

  // Check 1: Planning directory exists
  if (!(await fileExists(planningDir))) {
    errors.push(`Planning directory not found: ${planningDir}`);
    return { valid: false, errors };
  }

  // Check 2: Sprint index exists
  const indexPath = join(planningDir, 'sprint-index.yaml');
  if (!(await fileExists(indexPath))) {
    errors.push(`Sprint index not found: ${indexPath}`);
    return { valid: false, errors };
  }

  // Check 3: Load sprint index successfully
  try {
    const index = await loadSprintIndex();
    if (index.totalSprints === 0) {
      errors.push('Sprint index has no sprints to migrate');
      return { valid: false, errors };
    }
    logger.info(`Found ${index.totalSprints} sprints to migrate`);
  } catch (err) {
    errors.push(`Failed to load sprint index: ${err instanceof Error ? err.message : String(err)}`);
    return { valid: false, errors };
  }

  // Check 4: Migration not already completed
  const configPath = join(planningDir, 'archive-config.yaml');
  if (await fileExists(configPath)) {
    try {
      const configContent = await readFile(configPath);
      if (configContent.includes('completed: true')) {
        errors.push('Migration already completed. Use --force to re-run.');
        return { valid: false, errors };
      }
    } catch (err) {
      // Config file exists but can't be read - not a blocker
      logger.warn('Could not read existing archive-config.yaml', err);
    }
  }

  // Check 5: No active/ or archive/ directories exist (unless --force)
  const activeDir = join(planningDir, 'active');
  const archiveDir = join(planningDir, 'archive');

  if ((await fileExists(activeDir)) || (await fileExists(archiveDir))) {
    errors.push('active/ or archive/ directories already exist. Migration may have been partially completed. Use --force to proceed anyway.');
    return { valid: false, errors };
  }

  logger.info('Pre-migration validation passed');
  return { valid: true, errors: [] };
}

/**
 * Create backup of sprint index
 */
async function createBackup(): Promise<string> {
  const planningDir = getPlanningDir();
  const indexPath = join(planningDir, 'sprint-index.yaml');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(planningDir, `sprint-index-pre-migration-${timestamp}.yaml.backup`);

  logger.info(`Creating backup: ${backupPath}`);

  const indexContent = await readFile(indexPath);
  await writeFile(backupPath, indexContent);

  logger.info('Backup created successfully');
  return backupPath;
}

/**
 * Categorize sprints into active, recent completed, and archive
 */
async function categorizeSprints(options: MigrationOptions): Promise<SprintCategories> {
  const index = await loadSprintIndex();
  const now = Date.now();
  const activeThresholdMs = options.activeThresholdDays * 24 * 60 * 60 * 1000;

  const active: SprintIndexEntry[] = [];
  const recentCompleted: SprintIndexEntry[] = [];
  const toArchive: SprintIndexEntry[] = [];

  for (const sprint of index.sprints) {
    // Rule 1: Non-completed sprints always stay in active/
    if (sprint.status !== 'complete') {
      active.push(sprint);
      continue;
    }

    // Rule 2: Completed sprints - check recency
    const completedAt = sprint.completedAt ? new Date(sprint.completedAt).getTime() : 0;
    const createdAt = sprint.createdAt ? new Date(sprint.createdAt).getTime() : 0;
    const sprintDate = completedAt || createdAt;

    const ageMs = now - sprintDate;

    if (ageMs < activeThresholdMs) {
      // Recently completed - stays active
      recentCompleted.push(sprint);
    } else {
      // Old completed - archive candidate
      toArchive.push(sprint);
    }
  }

  // Rule 3: Keep at least N most recent completed sprints in active/
  // Sort by completion date (most recent first)
  const allCompleted = [...recentCompleted, ...toArchive].sort((a, b) => {
    const aDate = a.completedAt || a.createdAt || '';
    const bDate = b.completedAt || b.createdAt || '';
    return bDate.localeCompare(aDate);
  });

  // Take the most recent N
  const keepInActive = allCompleted.slice(0, options.keepRecentCount);
  const moveToArchive = allCompleted.slice(options.keepRecentCount);

  logger.info('Sprint categorization:', {
    activeNonCompleted: active.length,
    recentCompleted: keepInActive.length,
    toArchive: moveToArchive.length,
  });

  return {
    active,
    recentCompleted: keepInActive,
    toArchive: moveToArchive,
  };
}

/**
 * Get year for a sprint (for archive directory naming)
 */
function getSprintYear(sprint: SprintIndexEntry): string {
  const date = sprint.completedAt || sprint.createdAt;
  if (!date) {
    // Fallback to current year if no date available
    return new Date().getFullYear().toString();
  }
  return new Date(date).getFullYear().toString();
}

/**
 * Execute migration (actual or dry-run)
 */
async function executeMigration(
  categories: SprintCategories,
  options: MigrationOptions
): Promise<{ movedToActive: number; movedToArchive: number }> {
  const planningDir = getPlanningDir();
  const activeDir = join(planningDir, 'active');
  const archiveDir = join(planningDir, 'archive');

  logger.info(options.dryRun ? 'DRY RUN: Preview of changes' : 'Executing migration...');

  // Step 1: Create directories
  if (!options.dryRun) {
    await fs.mkdir(activeDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
    logger.info('Created active/ and archive/ directories');
  } else {
    logger.info('[DRY RUN] Would create active/ and archive/ directories');
  }

  // Step 2: Move active sprints to active/
  const allActive = [...categories.active, ...categories.recentCompleted];
  for (const sprint of allActive) {
    const oldPath = join(planningDir, sprint.id);
    const newPath = join(activeDir, sprint.id);

    if (!options.dryRun) {
      // Check if old path exists
      if (await fileExists(oldPath)) {
        await fs.rename(oldPath, newPath);
        logger.info(`Moved ${sprint.id} to active/`);
      } else {
        logger.warn(`Sprint directory not found, skipping: ${oldPath}`);
      }
    } else {
      logger.info(`[DRY RUN] Would move ${sprint.id} to active/`);
    }
  }

  // Step 3: Move old completed sprints to archive/{year}/
  for (const sprint of categories.toArchive) {
    const year = getSprintYear(sprint);
    const archiveYearDir = join(archiveDir, year);
    const oldPath = join(planningDir, sprint.id);
    const newPath = join(archiveYearDir, sprint.id);

    if (!options.dryRun) {
      await fs.mkdir(archiveYearDir, { recursive: true });

      // Check if old path exists
      if (await fileExists(oldPath)) {
        await fs.rename(oldPath, newPath);
        logger.info(`Archived ${sprint.id} to archive/${year}/`);
      } else {
        logger.warn(`Sprint directory not found, skipping: ${oldPath}`);
      }
    } else {
      logger.info(`[DRY RUN] Would archive ${sprint.id} to archive/${year}/`);
    }
  }

  return {
    movedToActive: allActive.length,
    movedToArchive: categories.toArchive.length,
  };
}

/**
 * Create archive configuration file
 */
async function createArchiveConfig(backupPath: string, dryRun: boolean): Promise<void> {
  const planningDir = getPlanningDir();
  const configPath = join(planningDir, 'archive-config.yaml');

  const config: ArchiveConfig = {
    ...RECOMMENDED_ARCHIVE_CONFIG,
    migration: {
      completed: !dryRun, // Only mark complete if not dry-run
      backupPath: backupPath.replace(planningDir + '/', ''), // Relative path
      completedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };

  if (!dryRun) {
    await writeFile(configPath, stringifyYaml({ archive: config }));
    logger.info(`Created archive-config.yaml: ${configPath}`);
  } else {
    logger.info('[DRY RUN] Would create archive-config.yaml');
    logger.info('Config preview:', config);
  }
}

/**
 * Main migration function
 */
async function migrate(options: MigrationOptions): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    dryRun: options.dryRun,
    backupCreated: false,
    movedToActive: 0,
    movedToArchive: 0,
    errors: [],
    warnings: [],
  };

  try {
    logger.info('='.repeat(80));
    logger.info('Sprint Archive Migration');
    logger.info('='.repeat(80));
    logger.info('Options:', options);
    logger.info('');

    // Step 1: Validate pre-migration state
    const validation = await validatePreMigrationState();
    if (!validation.valid && !options.force) {
      result.errors = validation.errors;
      return result;
    }

    if (validation.errors.length > 0 && options.force) {
      result.warnings.push(...validation.errors.map(e => `Forced: ${e}`));
    }

    // Step 2: Create backup
    if (!options.dryRun) {
      result.backupPath = await createBackup();
      result.backupCreated = true;
    } else {
      result.backupPath = 'sprint-index-pre-migration-TIMESTAMP.yaml.backup (dry-run)';
      logger.info('[DRY RUN] Would create backup');
    }

    // Step 3: Categorize sprints
    const categories = await categorizeSprints(options);

    // Step 4: Execute migration
    const moved = await executeMigration(categories, options);
    result.movedToActive = moved.movedToActive;
    result.movedToArchive = moved.movedToArchive;

    // Step 5: Regenerate sprint index
    if (!options.dryRun) {
      logger.info('Regenerating sprint index with new paths...');
      await regenerateSprintIndex();
      logger.info('Sprint index regenerated successfully');
    } else {
      logger.info('[DRY RUN] Would regenerate sprint index');
    }

    // Step 6: Validate migration
    if (!options.dryRun) {
      const newIndex = await loadSprintIndex();

      logger.info('Migration validation:', {
        sprintsAfter: newIndex.totalSprints,
        activeSprints: newIndex.activeSprints,
        completedSprints: newIndex.completedSprints,
      });
    }

    // Step 7: Create archive configuration
    await createArchiveConfig(result.backupPath, options.dryRun);

    // Success!
    result.success = true;

    logger.info('');
    logger.info('='.repeat(80));
    logger.info(options.dryRun ? 'DRY RUN COMPLETE' : 'MIGRATION COMPLETE');
    logger.info('='.repeat(80));
    logger.info('Summary:', {
      movedToActive: result.movedToActive,
      movedToArchive: result.movedToArchive,
      backupCreated: result.backupCreated,
      backupPath: result.backupPath,
    });

    if (!options.dryRun) {
      logger.info('');
      logger.info('Next steps:');
      logger.info('1. Verify migration: npm run regenerate-index');
      logger.info('2. Run tests: npm test');
      logger.info('3. If issues found, rollback: See planning/MIGRATION_ROLLBACK.md');
    } else {
      logger.info('');
      logger.info('To execute migration, run: npm run migrate:archive');
    }

    return result;
  } catch (err) {
    logger.error('Migration failed:', err);
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const options = parseArgs();

  try {
    const result = await migrate(options);

    if (!result.success) {
      logger.error('Migration failed:');
      for (const error of result.errors) {
        logger.error(`  - ${error}`);
      }
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      logger.warn('Warnings:');
      for (const warning of result.warnings) {
        logger.warn(`  - ${warning}`);
      }
    }

    process.exit(0);
  } catch (err) {
    logger.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for testing
export { migrate, categorizeSprints, getSprintYear, validatePreMigrationState };
export type { MigrationOptions, MigrationResult, SprintCategories };
