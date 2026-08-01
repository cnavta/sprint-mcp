#!/usr/bin/env node

/**
 * Sprint Cleanup CLI Script
 *
 * Safely removes git worktrees for completed sprints while preserving
 * sprint planning artifacts.
 *
 * Usage:
 *   npm run sprint:cleanup
 *   npm run sprint:cleanup -- --sprint=sprint-6-24txmg
 *   npm run sprint:cleanup -- --yes
 *   npm run sprint:cleanup -- --sprint=sprint-6-24txmg --force --yes
 */

import { createInterface } from 'readline';
import {
  getCleanupCandidates,
  cleanupSprint,
} from '../dist/common/sprint-cleanup-utils.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Parse command line arguments
 */
function parseArgs(argv) {
  const args = {
    sprint: null,
    force: false,
    yes: false,
    help: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--force' || arg === '-f') {
      args.force = true;
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg.startsWith('--sprint=')) {
      args.sprint = arg.substring('--sprint='.length);
    }
  }

  return args;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colors.bright}Sprint Cleanup Tool${colors.reset}

Safely removes git worktrees for completed sprints while preserving
sprint planning artifacts in planning/sprint-X/ directories.

${colors.bright}Usage:${colors.reset}
  npm run sprint:cleanup [options]

${colors.bright}Options:${colors.reset}
  --sprint=<id>    Cleanup specific sprint (e.g., --sprint=sprint-6-24txmg)
                   If omitted, shows all completed sprints with worktrees

  --force          Force removal even if worktree has uncommitted changes
                   ${colors.yellow}WARNING: Uncommitted changes will be lost!${colors.reset}

  --yes, -y        Skip confirmation prompt and proceed with cleanup
                   Useful for automation

  --help, -h       Show this help message

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}# List all cleanup candidates (interactive)${colors.reset}
  npm run sprint:cleanup

  ${colors.cyan}# Cleanup specific sprint (interactive)${colors.reset}
  npm run sprint:cleanup -- --sprint=sprint-6-24txmg

  ${colors.cyan}# Cleanup with auto-confirm (for scripts)${colors.reset}
  npm run sprint:cleanup -- --sprint=sprint-6-24txmg --yes

  ${colors.cyan}# Force cleanup even with uncommitted changes${colors.reset}
  npm run sprint:cleanup -- --sprint=sprint-6-24txmg --force --yes

${colors.bright}What Gets Deleted:${colors.reset}
  ${colors.red}✗${colors.reset} Git worktree in .worktrees/sprint-X/
  ${colors.green}✓${colors.reset} Sprint planning artifacts in planning/sprint-X/ ${colors.green}(preserved)${colors.reset}
  ${colors.green}✓${colors.reset} Sprint index entry ${colors.green}(preserved)${colors.reset}
`);
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Prompt user for confirmation
 */
async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main CLI function
 */
async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`\n${colors.bright}${colors.blue}🧹 Sprint Cleanup${colors.reset}\n`);

  // Step 1: Find cleanup candidates
  let candidates;
  try {
    candidates = await getCleanupCandidates(args.sprint);
  } catch (err) {
    console.error(
      `${colors.red}Error:${colors.reset} Failed to find cleanup candidates`
    );
    console.error(err.message);
    process.exit(1);
  }

  if (candidates.length === 0) {
    if (args.sprint) {
      console.log(
        `${colors.yellow}No worktree found for sprint ${args.sprint}${colors.reset}`
      );
      console.log(
        `Either the sprint doesn't exist, is not complete, or has already been cleaned up.\n`
      );
    } else {
      console.log(
        `${colors.green}✓ No completed sprints with worktrees found${colors.reset}`
      );
      console.log(`All sprints are already cleaned up!\n`);
    }
    process.exit(0);
  }

  // Step 2: Display cleanup candidates
  console.log(
    `Found ${colors.bright}${candidates.length}${colors.reset} completed sprint(s) with worktrees:\n`
  );

  let totalDiskUsage = 0;

  candidates.forEach((candidate, index) => {
    console.log(`  ${colors.bright}${index + 1}. ${candidate.sprintId}${colors.reset}`);
    console.log(`     ${colors.cyan}Path:${colors.reset} ${candidate.worktreePath}`);
    console.log(`     ${colors.cyan}Branch:${colors.reset} ${candidate.branch}`);
    console.log(
      `     ${colors.cyan}Size:${colors.reset} ~${formatBytes(candidate.diskUsage)}`
    );
    console.log(`     ${colors.cyan}Status:${colors.reset} ${candidate.status}`);

    if (candidate.hasUncommittedChanges) {
      console.log(
        `     ${colors.yellow}⚠️  Has uncommitted changes${colors.reset}`
      );
    }

    console.log('');

    totalDiskUsage += candidate.diskUsage;
  });

  console.log(
    `${colors.bright}Total disk space to be freed:${colors.reset} ~${formatBytes(totalDiskUsage)}\n`
  );

  // Step 3: Show warnings
  console.log(
    `${colors.yellow}⚠️  WARNING:${colors.reset} This will permanently remove the worktrees listed above.`
  );
  console.log(
    `Sprint planning artifacts in ${colors.green}planning/sprint-X/${colors.reset} will be ${colors.green}preserved${colors.reset}.\n`
  );

  const hasUncommittedChanges = candidates.some((c) => c.hasUncommittedChanges);

  if (hasUncommittedChanges && !args.force) {
    console.log(
      `${colors.red}ERROR:${colors.reset} Some worktrees have uncommitted changes.`
    );
    console.log(
      `Use ${colors.bright}--force${colors.reset} flag to cleanup anyway (changes will be lost).\n`
    );
    process.exit(1);
  }

  if (hasUncommittedChanges && args.force) {
    console.log(
      `${colors.red}⚠️  FORCE MODE:${colors.reset} Uncommitted changes will be ${colors.red}LOST${colors.reset}!\n`
    );
  }

  // Step 4: Confirm (unless --yes flag)
  if (!args.yes) {
    const confirmed = await confirm(
      `${colors.bright}Continue? (y/N):${colors.reset} `
    );

    if (!confirmed) {
      console.log(`\n${colors.yellow}Cleanup cancelled.${colors.reset}\n`);
      process.exit(0);
    }
    console.log('');
  }

  // Step 5: Perform cleanup
  console.log(`${colors.bright}Cleaning up...${colors.reset}\n`);

  let successCount = 0;
  let totalFreed = 0;
  const errors = [];

  for (const candidate of candidates) {
    process.stdout.write(
      `  ${colors.cyan}Removing worktree for ${candidate.sprintId}...${colors.reset} `
    );

    try {
      const result = await cleanupSprint(candidate.sprintId, {
        force: args.force,
      });

      if (result.success) {
        console.log(`${colors.green}✓${colors.reset}`);
        successCount++;
        totalFreed += result.diskFreed;
      } else {
        console.log(`${colors.red}✗${colors.reset}`);
        errors.push({
          sprintId: candidate.sprintId,
          errors: result.errors,
        });
      }
    } catch (err) {
      console.log(`${colors.red}✗${colors.reset}`);
      errors.push({
        sprintId: candidate.sprintId,
        errors: [err.message],
      });
    }
  }

  // Step 6: Show summary
  console.log('');
  console.log(`${colors.bright}Cleanup Summary:${colors.reset}`);
  console.log(
    `  ${colors.green}✓ Successfully cleaned:${colors.reset} ${successCount} sprint(s)`
  );
  console.log(
    `  ${colors.green}✓ Disk space freed:${colors.reset} ~${formatBytes(totalFreed)}`
  );

  if (errors.length > 0) {
    console.log(
      `  ${colors.red}✗ Failed:${colors.reset} ${errors.length} sprint(s)`
    );
    console.log('');
    console.log(`${colors.red}Errors:${colors.reset}`);
    errors.forEach((error) => {
      console.log(`  ${colors.red}${error.sprintId}:${colors.reset}`);
      error.errors.forEach((msg) => {
        console.log(`    - ${msg}`);
      });
    });
  }

  console.log('');

  if (errors.length > 0) {
    process.exit(1);
  }
}

// Run main function
main().catch((err) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
