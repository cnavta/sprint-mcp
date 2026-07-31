# Architecture Document: Sprint Index System

**Document Type**: Architecture Design
**Author**: Claude (Architect)
**Date**: 2026-07-30
**Status**: Proposed
**Target Sprint**: Sprint 4

---

## Executive Summary

This document defines the architecture for a centralized sprint index system that provides fast, denormalized access to sprint metadata across the sprint-mcp repository. The sprint index (`planning/sprint-index.yaml`) serves as a **derived, regenerable cache** of sprint information sourced from individual sprint manifests.

### Key Principles

1. **Single Source of Truth**: Sprint manifests remain authoritative
2. **Derived Data**: Index is computed from manifests, never manually edited
3. **Validation Enforced**: Index schema validated at generation/update
4. **Regenerable**: Can be rebuilt from scratch at any time
5. **Protocol Integration**: Updated at specific protocol lifecycle points

---

## 1. Problem Statement

### Current State

- Sprint metadata scattered across individual manifest files (`planning/sprint-*/sprint-manifest.yaml`)
- No centralized view of all sprints and their current status
- Tools must scan entire `planning/` directory to get overview
- `check-sprint-status` tool does full directory scan on every invocation
- No fast way to query "how many completed sprints exist?" without filesystem traversal

### Desired State

- Single `planning/sprint-index.yaml` providing O(1) access to sprint list
- Fast queries for active/completed sprints without directory scanning
- Structured metadata enables future analytics and reporting
- Index automatically maintained by MCP tools and protocol workflow
- Validation ensures index accuracy and consistency

---

## 2. Architecture Overview

### 2.1 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sprint Lifecycle Events                      │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │  MCP Tools (start-sprint, update-status)    │
         └─────────────────────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │   1. Update Sprint Manifest (authoritative)  │
         │      planning/sprint-X/sprint-manifest.yaml  │
         └─────────────────────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │   2. Update Sprint Index (derived)           │
         │      planning/sprint-index.yaml              │
         └─────────────────────────────────────────────┘
                                   │
                                   ▼
         ┌─────────────────────────────────────────────┐
         │   3. Validate Index Schema                   │
         │      Ensure consistency and correctness      │
         └─────────────────────────────────────────────┘
```

### 2.2 Component Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        MCP Server Layer                        │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  start-sprint   │  │ update-sprint-   │  │ regenerate-  │ │
│  │      Tool       │  │   status Tool    │  │ index Tool   │ │
│  └────────┬────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                    │                    │         │
│           └────────────────────┴────────────────────┘         │
│                                │                               │
└────────────────────────────────┼───────────────────────────────┘
                                 ▼
┌───────────────────────────────────────────────────────────────┐
│                    Core Index Services                         │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │            SprintIndexManager (new module)                │ │
│  │                                                            │ │
│  │  - loadIndex(): SprintIndex                               │ │
│  │  - addSprint(metadata): void                              │ │
│  │  - updateSprintStatus(id, status, metadata): void         │ │
│  │  - regenerateIndex(): SprintIndex                         │ │
│  │  - validateIndex(index): ValidationResult                 │ │
│  │  - saveIndex(index): void                                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────┐
│                      Data Layer                                │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  planning/sprint-index.yaml  (DERIVED - DO NOT EDIT)          │
│  planning/sprint-*/sprint-manifest.yaml  (AUTHORITATIVE)       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### 3.1 Sprint Index Schema

```yaml
# planning/sprint-index.yaml
#
# THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
# Regenerate with: regenerate-sprint-index MCP tool
# Last updated: 2026-07-30T19:45:00Z

version: "1.0"
generatedAt: "2026-07-30T19:45:00Z"
totalSprints: 3
activeSprints: 0
completedSprints: 3

sprints:
  - id: "sprint-1-abc123"
    title: "Initial MCP Server Implementation"
    status: "complete"
    owner: "Christopher Navta"
    createdAt: "2026-07-28T10:00:00Z"
    completedAt: "2026-07-28T18:00:00Z"
    completionMode: "normal"
    manifestPath: "planning/sprint-1-abc123/sprint-manifest.yaml"
    branch: "feature/sprint-1-abc123-initial-mcp"
    pr: "https://github.com/cnavta/sprint-mcp/pull/1"

  - id: "sprint-2-def456"
    title: "Protocol Documentation and Sprint Workflow"
    status: "complete"
    owner: "Christopher Navta"
    createdAt: "2026-07-29T09:00:00Z"
    completedAt: "2026-07-29T17:00:00Z"
    completionMode: "normal"
    manifestPath: "planning/sprint-2-def456/sprint-manifest.yaml"
    branch: "feature/sprint-2-def456-protocol"
    pr: "https://github.com/cnavta/sprint-mcp/pull/2"

  - id: "sprint-3-c8f2a9"
    title: "Git Worktrees Integration and MCP Testing"
    status: "complete"
    owner: "Christopher Navta"
    createdAt: "2026-07-30T14:00:00Z"
    completedAt: "2026-07-30T19:40:00Z"
    completionMode: "normal"
    manifestPath: "planning/sprint-3-c8f2a9/sprint-manifest.yaml"
    branch: "feature/sprint-3-c8f2a9-worktrees-and-testing"
    pr: "https://github.com/cnavta/sprint-mcp/pull/2"

# Statistics (computed)
statistics:
  byStatus:
    planning: 0
    in-progress: 0
    validating: 0
    verifying: 0
    published: 0
    complete: 3

  byCompletionMode:
    normal: 3
    forced: 0

  averageSprintDuration: "6h 40m"  # Computed from createdAt/completedAt
```

### 3.2 TypeScript Type Definitions

```typescript
// src/types/sprint-index.ts

/**
 * Sprint Index Entry - Derived from sprint manifest
 * Contains denormalized sprint metadata for fast access
 */
export interface SprintIndexEntry {
  id: string;
  title: string;
  status: SprintStatus;
  owner: string;
  createdAt: string;  // ISO 8601
  completedAt?: string;  // ISO 8601, optional (only if complete)
  completionMode?: 'normal' | 'forced';  // Optional (only if complete)
  manifestPath: string;  // Relative path to authoritative manifest
  branch: string;
  pr?: string;  // Optional PR URL
  worktreePath?: string;  // Optional worktree path (if exists)
}

/**
 * Sprint Index - Central registry of all sprints
 */
export interface SprintIndex {
  version: string;  // Schema version (e.g., "1.0")
  generatedAt: string;  // ISO 8601 timestamp of last generation
  totalSprints: number;
  activeSprints: number;  // Count of non-complete sprints
  completedSprints: number;

  sprints: SprintIndexEntry[];

  statistics: {
    byStatus: Record<SprintStatus, number>;
    byCompletionMode: {
      normal: number;
      forced: number;
    };
    averageSprintDuration?: string;  // Human-readable (e.g., "6h 40m")
  };
}

/**
 * Validation result for sprint index
 */
export interface IndexValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  manifestCount: number;  // Expected count from filesystem
  indexCount: number;  // Actual count in index
  missingInIndex: string[];  // Sprint IDs in filesystem but not index
  extraInIndex: string[];  // Sprint IDs in index but not filesystem
}
```

---

## 4. Update Triggers and Lifecycle

### 4.1 When Index Must Be Updated

| Event | Trigger | Tool Responsible | Index Operation |
|-------|---------|------------------|-----------------|
| Sprint creation | `start-sprint` invoked | `start-sprint` | Add new entry |
| Status change | Manual status update | `update-sprint-status` | Update existing entry |
| Sprint completion | "Sprint complete" confirmation | LLM Agent + `update-sprint-status` | Update status, completedAt, completionMode |
| PR creation | GitHub PR created | LLM Agent + `update-sprint-status` | Add PR URL to entry |
| Index corruption | Index validation fails | `regenerate-sprint-index` | Full rebuild from manifests |
| Manual request | User invokes regenerate tool | `regenerate-sprint-index` | Full rebuild from manifests |

### 4.2 Protocol Integration Points

**Sprint Protocol Section 2.2 (Sprint Start)**:
```markdown
6. **Update sprint index** (NEW)
   ```bash
   # Automatically handled by start-sprint MCP tool
   # Adds sprint entry to planning/sprint-index.yaml
   ```
   The index is updated atomically with manifest creation.
```

**Sprint Protocol Section 2.5 (Status Changes)**:
```markdown
When updating sprint status (planning → in-progress → validating → verifying → published → complete):

1. Update sprint manifest (authoritative source)
2. Update sprint index (derived cache)
3. Validate index consistency

Use the `update-sprint-status` MCP tool to ensure all updates occur atomically.
```

**Sprint Protocol Section 2.10 (Sprint Completion)**:
```markdown
7. **Update sprint index with completion metadata** (NEW)
   ```bash
   # Automatically handled by update-sprint-status tool
   # Updates status, completedAt, completionMode, PR URL
   ```
```

---

## 5. Technical Implementation

### 5.1 Core Module: SprintIndexManager

**Location**: `src/common/sprint-index-manager.ts`

**Responsibilities**:
- Load and parse sprint-index.yaml
- Add/update/remove sprint entries
- Regenerate index from scratch by scanning manifests
- Validate index against filesystem reality
- Compute statistics (counts, averages)
- Atomic write operations with backup

**Key Functions**:

```typescript
/**
 * Load sprint index from disk
 * Creates empty index if file doesn't exist
 */
export function loadSprintIndex(): SprintIndex;

/**
 * Add a new sprint to the index
 * Called by start-sprint tool
 */
export function addSprintToIndex(metadata: SprintIndexEntry): void;

/**
 * Update sprint status and related metadata
 * Called by update-sprint-status tool
 */
export function updateSprintInIndex(
  sprintId: string,
  updates: Partial<SprintIndexEntry>
): void;

/**
 * Regenerate entire index from sprint manifests
 * Scans planning/ directory, reads all manifests
 */
export async function regenerateSprintIndex(): SprintIndex;

/**
 * Validate index against filesystem reality
 * Returns validation result with errors/warnings
 */
export async function validateSprintIndex(
  index: SprintIndex
): Promise<IndexValidationResult>;

/**
 * Save index to disk with atomic write
 * Creates backup before overwriting
 */
export function saveSprintIndex(index: SprintIndex): void;
```

### 5.2 MCP Tool: start-sprint (Enhanced)

**Changes Required**:
1. After creating sprint manifest, add sprint to index
2. Call `addSprintToIndex()` with sprint metadata
3. Handle index update failures gracefully (log warning, continue)

**Implementation Location**: `src/tools/start-sprint.ts`

**Pseudocode**:
```typescript
export async function startSprintTool(args) {
  // ... existing validation and manifest creation ...

  // NEW: Step 7 - Add to sprint index
  try {
    const indexEntry: SprintIndexEntry = {
      id: sprintId,
      title: sprintArgs.title,
      status: 'planning',
      owner: sprintArgs.owner,
      createdAt: manifest.createdAt,
      manifestPath: `planning/${sprintId}/sprint-manifest.yaml`,
      branch: branchName,
      worktreePath: worktreePath,
    };

    addSprintToIndex(indexEntry);
    logger.info('Added sprint to index');
  } catch (error) {
    // Non-fatal: log warning but don't fail sprint creation
    logger.warn('Failed to update sprint index', error);
    // Index can be regenerated later
  }

  // ... return success message ...
}
```

### 5.3 MCP Tool: update-sprint-status (New)

**Purpose**: Atomically update sprint status in both manifest and index

**Parameters**:
- `sprintId` (string, required): Sprint ID to update
- `status` (SprintStatus, required): New status value
- `completedAt` (string, optional): Completion timestamp (ISO 8601)
- `completionMode` (string, optional): 'normal' or 'forced'
- `pr` (string, optional): PR URL

**Implementation Location**: `src/tools/update-sprint-status.ts`

**Pseudocode**:
```typescript
export async function updateSprintStatusTool(args) {
  const { sprintId, status, completedAt, completionMode, pr } = args;

  // Step 1: Validate sprint exists
  const manifestPath = `planning/${sprintId}/sprint-manifest.yaml`;
  if (!await fileExists(manifestPath)) {
    throw new Error(`Sprint ${sprintId} not found`);
  }

  // Step 2: Update manifest (authoritative source)
  const manifest = await readManifest(manifestPath);
  manifest.status = status;
  if (completedAt) manifest.completedAt = completedAt;
  if (completionMode) manifest.completionMode = completionMode;
  if (pr) manifest.links.pr = pr;
  await writeManifest(manifestPath, manifest);

  // Step 3: Update index (derived cache)
  const updates: Partial<SprintIndexEntry> = {
    status,
    completedAt,
    completionMode,
    pr,
  };
  updateSprintInIndex(sprintId, updates);

  // Step 4: Validate index consistency
  const index = loadSprintIndex();
  const validation = await validateSprintIndex(index);
  if (!validation.valid) {
    logger.warn('Index validation warnings', validation.warnings);
  }

  return {
    content: [{
      type: 'text',
      text: `✅ Updated sprint ${sprintId} status to ${status}\n\n` +
            `Manifest and index updated successfully.`
    }]
  };
}
```

### 5.4 MCP Tool: regenerate-sprint-index (New)

**Purpose**: Rebuild sprint index from scratch by scanning all manifests

**Parameters**: None

**Implementation Location**: `src/tools/regenerate-sprint-index.ts`

**Pseudocode**:
```typescript
export async function regenerateSprintIndexTool() {
  logger.info('Regenerating sprint index from manifests...');

  // Step 1: Scan planning/ directory for sprint manifests
  const planningDir = 'planning';
  const sprintDirs = await listDirectories(planningDir);
  const sprintIds = sprintDirs
    .filter(dir => dir.match(/^sprint-\d+-[a-z0-9]+$/))
    .map(dir => path.basename(dir));

  // Step 2: Read each manifest and extract metadata
  const entries: SprintIndexEntry[] = [];
  for (const sprintId of sprintIds) {
    const manifestPath = `planning/${sprintId}/sprint-manifest.yaml`;
    try {
      const manifest = await readManifest(manifestPath);
      entries.push({
        id: manifest.id,
        title: manifest.title,
        status: manifest.status,
        owner: manifest.owner,
        createdAt: manifest.createdAt,
        completedAt: manifest.completedAt,
        completionMode: manifest.completionMode,
        manifestPath,
        branch: manifest.links.branch,
        pr: manifest.links.pr,
        // Check if worktree exists
        worktreePath: await getWorktreePathIfExists(sprintId),
      });
    } catch (error) {
      logger.warn(`Failed to read manifest for ${sprintId}`, error);
    }
  }

  // Step 3: Sort by sprint number (ascending)
  entries.sort((a, b) => {
    const numA = parseInt(a.id.match(/sprint-(\d+)-/)?.[1] || '0');
    const numB = parseInt(b.id.match(/sprint-(\d+)-/)?.[1] || '0');
    return numA - numB;
  });

  // Step 4: Compute statistics
  const statistics = computeStatistics(entries);

  // Step 5: Build index object
  const index: SprintIndex = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    totalSprints: entries.length,
    activeSprints: entries.filter(e => e.status !== 'complete').length,
    completedSprints: entries.filter(e => e.status === 'complete').length,
    sprints: entries,
    statistics,
  };

  // Step 6: Validate before saving
  const validation = await validateSprintIndex(index);
  if (!validation.valid) {
    logger.error('Index validation failed', validation.errors);
    throw new Error('Generated index failed validation');
  }

  // Step 7: Save with backup
  saveSprintIndex(index);

  return {
    content: [{
      type: 'text',
      text: `✅ Sprint index regenerated successfully\n\n` +
            `Total sprints: ${index.totalSprints}\n` +
            `Active: ${index.activeSprints}\n` +
            `Completed: ${index.completedSprints}\n\n` +
            `Index saved to: planning/sprint-index.yaml`
    }]
  };
}
```

---

## 6. Validation Strategy

### 6.1 Validation Rules

**Schema Validation**:
- `version` must be "1.0"
- `generatedAt` must be valid ISO 8601 timestamp
- `totalSprints` must equal `sprints.length`
- `activeSprints + completedSprints` must equal `totalSprints`
- Each entry must have required fields (id, title, status, owner, createdAt, manifestPath, branch)

**Consistency Validation**:
- Every sprint in index must have corresponding manifest file
- Every manifest file must be represented in index
- Status counts in `statistics.byStatus` must match actual entries
- Completion mode counts must match entries with completionMode set

**Data Integrity**:
- Sprint IDs must match pattern: `sprint-\d+-[a-z0-9]+`
- Status must be valid SprintStatus value
- Timestamps must be valid ISO 8601
- Manifest paths must be relative and point to existing files

### 6.2 Validation Implementation

**Location**: `src/common/sprint-index-validator.ts`

```typescript
export async function validateSprintIndex(
  index: SprintIndex
): Promise<IndexValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema validation
  if (index.version !== '1.0') {
    errors.push(`Invalid version: ${index.version} (expected "1.0")`);
  }

  if (index.totalSprints !== index.sprints.length) {
    errors.push(`totalSprints mismatch: ${index.totalSprints} != ${index.sprints.length}`);
  }

  // Filesystem consistency
  const manifestFiles = await scanForManifests();
  const manifestIds = new Set(manifestFiles.map(f => extractSprintId(f)));
  const indexIds = new Set(index.sprints.map(s => s.id));

  const missingInIndex = Array.from(manifestIds).filter(id => !indexIds.has(id));
  const extraInIndex = Array.from(indexIds).filter(id => !manifestIds.has(id));

  if (missingInIndex.length > 0) {
    errors.push(`Sprints missing from index: ${missingInIndex.join(', ')}`);
  }

  if (extraInIndex.length > 0) {
    warnings.push(`Sprints in index but no manifest: ${extraInIndex.join(', ')}`);
  }

  // Statistics validation
  const expectedByStatus = computeStatusCounts(index.sprints);
  for (const [status, count] of Object.entries(expectedByStatus)) {
    if (index.statistics.byStatus[status] !== count) {
      errors.push(`Status count mismatch for ${status}: ${index.statistics.byStatus[status]} != ${count}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    manifestCount: manifestIds.size,
    indexCount: indexIds.size,
    missingInIndex,
    extraInIndex,
  };
}
```

---

## 7. Error Handling and Recovery

### 7.1 Failure Modes

| Failure Mode | Impact | Recovery Strategy |
|--------------|--------|-------------------|
| Index file corrupted | Tools can't read index | Regenerate from manifests |
| Index file missing | No centralized view | Create new index via regenerate |
| Index out of sync | Stale data shown | Regenerate from manifests |
| Manifest missing but in index | Index has orphan entry | Validation warns, remove on regenerate |
| Manifest exists but not in index | Sprint invisible to index queries | Validation detects, add on regenerate |
| Index update fails during tool call | Index stale but manifests correct | Non-fatal warning, regenerate later |

### 7.2 Recovery Procedures

**Automatic Recovery**:
- Tools that update index wrap updates in try/catch
- Failures logged as warnings, not errors
- Sprint operations continue even if index update fails
- Index marked as "needs regeneration" in logs

**Manual Recovery**:
```bash
# User or agent can regenerate index at any time
# Via MCP tool:
mcp-tool: regenerate-sprint-index

# Or manually delete and regenerate:
rm planning/sprint-index.yaml
mcp-tool: regenerate-sprint-index
```

**Validation on Load**:
```typescript
// Every time index is loaded, validate it
const index = loadSprintIndex();
const validation = await validateSprintIndex(index);

if (!validation.valid) {
  logger.warn('Sprint index validation failed, regenerating...');
  const newIndex = await regenerateSprintIndex();
  return newIndex;
}

return index;
```

---

## 8. Performance Considerations

### 8.1 Index File Size

**Estimated Size**:
- 100 sprints: ~20KB (200 bytes per entry)
- 1000 sprints: ~200KB
- 10000 sprints: ~2MB

**Analysis**: YAML file size negligible for foreseeable sprint volumes. No pagination needed.

### 8.2 Read Performance

**Before** (without index):
- `check-sprint-status`: O(n) directory scan + O(n) manifest reads
- 100 sprints: ~200ms (filesystem traversal + YAML parsing)

**After** (with index):
- `check-sprint-status`: O(1) single file read + O(1) parse
- 100 sprints: ~5ms (single YAML parse)

**Improvement**: ~40x faster for status checks

### 8.3 Write Performance

**Index Update Cost**:
- Read index: ~5ms
- Modify in-memory: ~1ms
- Write index: ~10ms (atomic write with backup)
- **Total**: ~16ms per update

**Impact**: Negligible overhead on sprint operations (< 20ms added latency)

---

## 9. Testing Strategy

### 9.1 Unit Tests

**SprintIndexManager Tests**:
```typescript
describe('SprintIndexManager', () => {
  describe('loadSprintIndex', () => {
    it('should create empty index if file missing');
    it('should parse valid index file');
    it('should throw on invalid YAML');
  });

  describe('addSprintToIndex', () => {
    it('should add new sprint entry');
    it('should increment totalSprints count');
    it('should update statistics');
  });

  describe('updateSprintInIndex', () => {
    it('should update existing sprint');
    it('should throw if sprint not found');
    it('should update statistics when status changes');
  });

  describe('regenerateSprintIndex', () => {
    it('should rebuild index from manifests');
    it('should handle missing manifests gracefully');
    it('should sort sprints by number');
    it('should compute correct statistics');
  });

  describe('validateSprintIndex', () => {
    it('should pass valid index');
    it('should detect missing sprints');
    it('should detect extra sprints');
    it('should detect count mismatches');
  });
});
```

### 9.2 Integration Tests

**Tool Integration Tests**:
```typescript
describe('start-sprint with index', () => {
  it('should add sprint to index on creation');
  it('should handle index update failure gracefully');
  it('should validate index after adding sprint');
});

describe('update-sprint-status', () => {
  it('should update both manifest and index');
  it('should handle status transitions');
  it('should add PR URL when provided');
});

describe('regenerate-sprint-index', () => {
  it('should rebuild from scratch');
  it('should match expected structure');
  it('should pass validation');
});
```

### 9.3 End-to-End Tests

**Scenario Tests**:
1. Create 5 sprints via start-sprint, verify index updated each time
2. Complete 3 sprints via update-sprint-status, verify statistics correct
3. Delete index file, regenerate, verify matches expected
4. Corrupt index, verify auto-regeneration on validation failure

---

## 10. Migration Plan

### 10.1 Existing Repository Migration

**Initial State**: Repository has 3 completed sprints, no index file

**Migration Steps**:
1. Implement `SprintIndexManager` module
2. Implement `regenerate-sprint-index` tool
3. Run regenerate tool to create initial index from existing manifests
4. Commit `planning/sprint-index.yaml` to repository
5. Update `start-sprint` tool to maintain index going forward
6. Implement `update-sprint-status` tool for future status updates

### 10.2 Backward Compatibility

**Breaking Changes**: None

**Compatibility**:
- Existing sprint manifests unchanged
- Index is additive, doesn't replace manifests
- Tools that don't use index continue working
- `check-sprint-status` can optionally use index for performance

### 10.3 Rollback Plan

If index system causes issues:
1. Remove index-related code from tools
2. Delete `planning/sprint-index.yaml`
3. Tools fall back to directory scanning
4. No data loss (manifests unchanged)

---

## 11. Documentation Updates Required

### 11.1 Protocol Documentation

**AGENTS-uncompressed.md** updates:
- Section 2.2: Add step for index update on sprint start
- Section 2.5: Add guidance on using update-sprint-status tool
- Section 2.10: Add step for index update on completion
- New section: "Sprint Index Management" explaining index purpose and maintenance

**README.md** updates:
- Add section on sprint index under "Sprint Management"
- Document regenerate-sprint-index tool
- Document update-sprint-status tool
- Add troubleshooting section for index issues

### 11.2 Code Documentation

**Inline Documentation**:
- JSDoc comments for all SprintIndexManager functions
- Type annotations for SprintIndex and related types
- README in src/common/ explaining index architecture

**Architecture Documentation**:
- This document becomes permanent reference in `/planning/`
- Link from main README to architecture doc

---

## 12. Security Considerations

### 12.1 File System Security

**Concerns**:
- Index file must be readable by MCP server process
- Index file must be writable by MCP server process
- Atomic writes prevent corruption during concurrent access

**Mitigations**:
- Use atomic write pattern (write to temp file, rename)
- Create backup before overwriting
- Validate file permissions on load

### 12.2 Input Validation

**Concerns**:
- Malicious sprint IDs could cause path traversal
- Invalid YAML could crash parser
- Large manifests could cause DoS

**Mitigations**:
- Validate sprint ID format (regex: `^sprint-\d+-[a-z0-9]+$`)
- Wrap YAML parsing in try/catch with size limits
- Limit manifest file size (e.g., 1MB max)

---

## 13. Success Metrics

### 13.1 Functional Metrics

- ✅ Index regeneration completes successfully for existing 3 sprints
- ✅ Index updates automatically on sprint creation
- ✅ Index updates automatically on status changes
- ✅ Validation detects all inconsistencies
- ✅ All tests pass (unit, integration, e2e)

### 13.2 Performance Metrics

- ✅ `check-sprint-status` execution time < 10ms (vs ~200ms before)
- ✅ Index file size < 1KB for 3 sprints
- ✅ Index update overhead < 20ms per operation

### 13.3 Quality Metrics

- ✅ Test coverage > 80% for new modules
- ✅ Zero manual edits required to index file
- ✅ Index automatically recovers from corruption

---

## 14. Open Questions

### 14.1 To Be Decided

1. **Index versioning**: If schema changes, how do we migrate?
   - **Recommendation**: Include schema version, write migration functions

2. **Index location**: `planning/sprint-index.yaml` vs `sprint-index.yaml` at root?
   - **Recommendation**: Keep in `planning/` to colocate with sprint data

3. **Statistics granularity**: What additional stats are valuable?
   - **Recommendation**: Start minimal, add based on user feedback

4. **Concurrent writes**: How to handle multiple tools updating index simultaneously?
   - **Recommendation**: File-based locking or accept last-write-wins (regenerate recovers)

5. **Index in git**: Should index be committed or gitignored?
   - **Recommendation**: Commit index for visibility, regenerable if conflicts occur

### 14.2 Future Enhancements

- **Sprint search**: Full-text search across sprint titles/goals
- **Sprint analytics**: Trend analysis, velocity tracking
- **Index compression**: For repositories with 1000+ sprints
- **Index API**: REST API exposing sprint data for external tools
- **Real-time updates**: Watch for manifest changes, auto-update index

---

## 15. Implementation Phases

### Phase 1: Foundation (P0-CRITICAL)
1. Implement `SprintIndexManager` module
2. Define TypeScript types
3. Write unit tests for core functions

### Phase 2: Regeneration (P0-CRITICAL)
1. Implement `regenerate-sprint-index` MCP tool
2. Write integration tests
3. Run initial regeneration on existing sprints
4. Commit initial index file

### Phase 3: Tool Integration (P1-HIGH)
1. Update `start-sprint` to add entries
2. Implement `update-sprint-status` tool
3. Update protocol documentation

### Phase 4: Validation (P1-HIGH)
1. Implement validation logic
2. Add validation tests
3. Integrate validation into tools

### Phase 5: Documentation (P2-MEDIUM)
1. Update AGENTS-uncompressed.md
2. Update README.md
3. Create troubleshooting guide

---

## 16. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Index gets out of sync with manifests | Medium | Medium | Validation + regeneration tool |
| Concurrent write corruption | Low | High | Atomic writes + backup |
| Large index impacts performance | Low | Low | Lazy loading + pagination (future) |
| Schema evolution breaks compatibility | Medium | Medium | Version field + migration logic |
| Tools fail to update index | Medium | Low | Non-fatal warnings + regeneration |

---

## 17. Conclusion

The sprint index system provides a **centralized, performant, derived cache** of sprint metadata that significantly improves query performance and enables future analytics capabilities. The architecture follows key principles:

- **Single source of truth**: Manifests remain authoritative
- **Regenerable**: Index can be rebuilt at any time
- **Validated**: Consistency enforced automatically
- **Low risk**: Non-fatal failures, easy recovery
- **High value**: 40x performance improvement for status queries

**Recommendation**: Proceed with implementation in Sprint 4, following the phased approach outlined in Section 15.

---

**Document Status**: Ready for review and sprint planning
**Next Step**: Create Sprint 4 execution plan based on this architecture

