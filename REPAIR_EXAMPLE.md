# Sprint Index Repair Feature

## Overview

The sprint index regeneration tool now includes an optional **repair mode** that can automatically create minimal manifests for sprint directories that are missing them.

## When to Use Repair Mode

Use repair mode when:
- You have sprint directories with content but no `sprint-manifest.yaml`
- You want to quickly recover from missing manifests
- You're migrating old sprint data into the system

## How It Works

When `repair: true` is enabled:

1. **Scans directories**: Finds all `sprint-*` directories in `planning/`
2. **Identifies missing manifests**: Checks which directories lack `sprint-manifest.yaml`
3. **Validates directories**: Only creates manifests for directories with files (skips empty directories)
4. **Creates minimal manifests**: Generates manifests with:
   - `id`: Extracted from directory name (e.g., `sprint-123-abc456`)
   - `title`: Auto-generated (e.g., "Sprint 123 (Auto-generated)")
   - `goal`: Placeholder text indicating auto-generation
   - `owner`: "Unknown"
   - `createdAt`: Directory creation timestamp
   - `status`: "complete" (existing directories are assumed to be completed sprints)
   - `branch`: Default feature branch name
5. **Indexes all sprints**: Includes both existing and newly-created manifests in the index

## Usage

### Via MCP Tool

```javascript
// Call the MCP tool with repair enabled
await mcp.call('regenerate-sprint-index', { repair: true });
```

### Via Code

```typescript
import { regenerateSprintIndex } from './common/sprint-index-manager.js';

// Enable repair mode
const result = await regenerateSprintIndex({ repair: true });

console.log(`Total sprints: ${result.index.totalSprints}`);
console.log(`Repaired: ${result.repairedDirectories}`);
console.log(`Skipped: ${result.skippedDirectories}`);
```

## Example Output

### For small repositories (≤20 sprints)
All sprints are listed individually.

### For large repositories (>20 sprints)
Output is condensed to show only active sprints and the last 5 completed:

```
✅ Sprint index regenerated successfully!

**Summary:**
- Total sprints: 212
- Active sprints: 5
- Completed sprints: 207
- ✅ Repaired directories (manifests created): 48
- Generated at: 2026-08-02T21:45:00.000Z

**Repair mode enabled:**
Created 48 minimal manifest(s) for sprint directories that were missing them.
These manifests have auto-generated default values and should be reviewed and updated.

**Active sprints (5):**
→ **sprint-375-docker-compose-architecture**: Docker Compose Architecture (in-progress)
○ **sprint-376-bulk-deployment-securefile-bug**: Bulk Deployment Securefile Bug (validating)
→ **sprint-377-long-running-task-feedback**: Long Running Task Feedback (in-progress)
○ **sprint-378-deploy-all-enhancement**: Deploy All Enhancement (published)
○ **sprint-379-port-manager-integration**: Port Manager Integration (planning)

**Recent completed sprints (last 5):**
✓ **sprint-374-secure-file-deployment**: Secure File Deployment
✓ **sprint-373-storage-abstraction**: Storage Abstraction
✓ **sprint-372-unified-bit-deploy**: Unified Bit Deploy
✓ **sprint-371-debug-mode**: Debug Mode
✓ **sprint-370-custom-registry**: Custom Registry

**Statistics:**
- By status:
  - planning: 2
  - in-progress: 2
  - validating: 1
  - published: 1
  - complete: 207
- Average sprint duration: PT12H

📄 Index file: planning/sprint-index.yaml
```

This keeps the output manageable even with hundreds of sprints!

## After Repair: Next Steps

After running repair mode:

1. **Review generated manifests**: Check the auto-generated manifests in each repaired directory
2. **Update metadata**: Correct the `owner`, `title`, and `goal` fields with accurate information
3. **Adjust status if needed**: Repaired sprints default to `status: complete`. Change to `in-progress`, `validating`, etc. if the sprint is actually still active
4. **Verify timestamps**: Adjust `createdAt` if directory timestamp is incorrect

## Example Generated Manifest

```yaml
id: sprint-187-b8c9d0
title: Sprint 187 (Auto-generated)
goal: No goal specified - manifest was auto-generated during repair
owner: Unknown
createdAt: '2026-01-15T10:30:00.000Z'
status: complete
links:
  branch: feature/sprint-187-b8c9d0
```

## Skipped Directories

Repair mode will skip:
- Empty directories (no files)
- Directories with invalid names (don't match `sprint-*` pattern)
- Directories where manifest creation fails

These are counted in `skippedDirectories` and logged as warnings.

## Safety Features

- **Non-destructive**: Only creates new manifests, never modifies existing ones
- **Validation**: Checks directory contents before creating manifests
- **Logging**: All actions are logged for audit trail
- **Atomic writes**: Uses safe file writing to prevent corruption
- **Optional**: Repair mode is opt-in, default behavior unchanged
