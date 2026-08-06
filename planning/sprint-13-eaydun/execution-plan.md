# Sprint 13 Execution Plan
**Sprint Archive System with Knowledge Capture**

**Sprint ID:** sprint-13-eaydun
**Owner:** Christopher Navta
**Role:** Lead Implementor
**Date:** 2026-08-02
**Status:** Planning → In Progress (pending approval)

---

## Executive Summary

This sprint implements a comprehensive archive system for completed sprints with integrated knowledge capture. The system organizes sprints into `active/` and `archive/{year}/` directories while extracting and aggregating lessons learned, patterns, and metrics into a queryable knowledge base.

**Critical Blocker Identified:** SPRINT_ROOT path resolution defect must be fixed in Phase 0 before archive system can proceed.

**Key Deliverables:**
1. **Phase 0 (Blocker):** Multi-repository support via SPRINT_ROOT environment variable
2. **Phase 1:** Archive directory structure and migration
3. **Phase 2:** Archive sprint tool
4. **Phase 3:** Knowledge extraction and aggregation
5. **Phase 4:** Validation and documentation

**Validation Against Real-World Data:**
- Architecture validated against BitBratPlatform's 262 completed sprints
- Flexible artifact discovery supports multiple naming conventions
- Pattern-based extraction handles 37% of sprints with non-standard artifacts

---

## Phase 0: Critical Path Resolution Fix 🔥

**Priority:** P0 (BLOCKING)
**Duration:** 0.5-1 day
**Blocker Reason:** Archive system depends on correct path resolution across repositories

### Context

The MCP server runs from sprint-mcp directory, but `process.cwd()` returns that path instead of the target repository (BitBratPlatform). This causes:
- Sprint creation in wrong directory
- Index scanning wrong planning folder
- Worktree creation failures

Error encountered:
```
Error: The "path" argument must be of type string. Received undefined
```

### Objectives

1. Create centralized path utilities that respect `SPRINT_ROOT` environment variable
2. Refactor all tools to use new path utilities
3. Enable multi-repository support via MCP server configuration
4. Verify fix works in both sprint-mcp and BitBratPlatform

### Tasks

#### Task 0.1: Create Path Utilities Module
**File:** `src/common/path-utils.ts`
**Effort:** 1-2 hours

Create new module with functions:
```typescript
export function getProjectRoot(): string {
  return process.env.SPRINT_ROOT || process.cwd();
}

export function getPlanningDir(): string {
  return join(getProjectRoot(), 'planning');
}

export function getWorktreeDir(sprintId: string): string {
  return join(getProjectRoot(), '.worktrees', sprintId);
}
```

**Acceptance Criteria:**
- Module exports 3 functions
- Respects SPRINT_ROOT when set
- Falls back to process.cwd() when not set
- Includes JSDoc comments

#### Task 0.2: Refactor Git Utilities
**File:** `src/common/git-utils.ts`
**Effort:** 30 minutes

Replace:
```typescript
const cwd = process.cwd();
return join(cwd, '.worktrees', sprintId);
```

With:
```typescript
import { getProjectRoot } from './path-utils.js';
return join(getProjectRoot(), '.worktrees', sprintId);
```

**Files to modify:**
- `getWorktreePath()` function

#### Task 0.3: Refactor Sprint Index Manager
**File:** `src/common/sprint-index-manager.ts`
**Effort:** 30 minutes

Replace all instances of:
```typescript
join(process.cwd(), 'planning')
```

With:
```typescript
import { getPlanningDir } from './path-utils.js';
getPlanningDir()
```

**Functions to update:**
- `getSprintIndexPath()`
- `getPlanningDir()`
- Any other path construction

#### Task 0.4: Refactor MCP Tools
**Files:** All 6 sprint tools
**Effort:** 2 hours

Update each tool to use path utilities:

**Tools to refactor:**
1. `src/tools/start-sprint.ts` - Use `getPlanningDir()`, `getWorktreeDir()`
2. `src/tools/check-sprint-status.ts` - Use `getPlanningDir()`
3. `src/tools/regenerate-sprint-index.ts` - Use `getPlanningDir()`
4. `src/tools/complete-sprint.ts` - Use `getPlanningDir()`
5. `src/tools/cleanup-sprint.ts` - Use `getProjectRoot()`
6. `src/tools/update-sprint-status.ts` - Use `getPlanningDir()`

**Pattern:**
```typescript
// Before
const planningDir = join(process.cwd(), 'planning');

// After
import { getPlanningDir } from '../common/path-utils.js';
const planningDir = getPlanningDir();
```

#### Task 0.5: Unit Tests for Path Utilities
**File:** `src/common/__tests__/path-utils.test.ts`
**Effort:** 1 hour

Test cases:
1. `getProjectRoot()` returns SPRINT_ROOT when set
2. `getProjectRoot()` falls back to process.cwd()
3. `getPlanningDir()` constructs correct path
4. `getWorktreeDir()` constructs correct path with sprint ID

**Coverage target:** 100%

#### Task 0.6: Integration Test for Multi-Repo
**File:** `src/__tests__/integration/multi-repo.test.ts`
**Effort:** 1-2 hours

Test scenario:
1. Create two temporary repositories
2. Set SPRINT_ROOT to repo A
3. Start sprint
4. Verify sprint created in repo A, not sprint-mcp
5. Change SPRINT_ROOT to repo B
6. Start sprint
7. Verify sprint created in repo B

#### Task 0.7: Update Documentation
**Files:** `CLAUDE.md`, `README.md`
**Effort:** 30 minutes

Add section on multi-repository setup:
```markdown
### Multi-Repository Setup

Configure multiple MCP servers in `claude_desktop_config.json`:

{
  "mcpServers": {
    "sprint-mcp-local": {
      "env": { "SPRINT_ROOT": "/path/to/sprint-mcp" }
    },
    "sprint-mcp": {
      "env": { "SPRINT_ROOT": "/path/to/BitBratPlatform" }
    }
  }
}

Use `mcp__sprint-mcp-local__*` for sprint-mcp repository.
Use `mcp__sprint-mcp__*` for BitBratPlatform repository.
```

#### Task 0.8: Build and Verify in BitBratPlatform
**Effort:** 30 minutes

1. Build: `npm run build`
2. Update Claude Desktop config to point to BitBratPlatform
3. Restart Claude Desktop
4. Attempt to start sprint in BitBratPlatform
5. Verify sprint created in correct location
6. Verify no errors

**Success Criteria:**
- Sprint creates in BitBratPlatform/planning/sprint-XXX/
- Worktree creates in BitBratPlatform/.worktrees/sprint-XXX/
- No path-related errors

### Phase 0 Exit Criteria

- [ ] All 8 tasks completed
- [ ] All tests passing (existing + new)
- [ ] Build successful
- [ ] Verified in BitBratPlatform
- [ ] Documentation updated
- [ ] **Can proceed to Phase 1**

---

## Phase 1: Archive Directory Structure & Migration

**Priority:** P0
**Duration:** 1-1.5 days
**Dependencies:** Phase 0 complete

### Context

Create the foundation for the archive system by establishing directory structure and migrating existing sprints. This is a one-time migration that moves sprints from flat structure to organized active/archive hierarchy.

**Current structure (13 sprints):**
```
planning/
  sprint-1-a9f3c2/
  sprint-2-b7e4d1/
  ...
  sprint-13-eaydun/
  sprint-index.yaml
```

**Target structure:**
```
planning/
  active/
    sprint-12-sdwpw0/
    sprint-13-eaydun/
  archive/
    2026/
      sprint-1-a9f3c2/
      sprint-2-b7e4d1/
      ...
      sprint-11-giiaka/
  knowledge/           # Created empty, populated in Phase 3
  sprint-index.yaml    # Paths updated
  archive-config.yaml  # New configuration
```

### Objectives

1. Create archive directory structure
2. Implement safe migration script
3. Migrate 13 existing sprints
4. Validate no data loss
5. Update sprint-index.yaml paths

### Tasks

#### Task 1.1: Create Archive Configuration Schema
**File:** `src/types/archive-config.ts`
**Effort:** 1 hour

Define TypeScript interfaces:
```typescript
export interface ArchiveConfig {
  archive: {
    enabled: boolean;
    autoArchive: {
      enabled: boolean;
      criteria: 'age' | 'count' | 'hybrid';
      ageDays: number;
      keepCount: number;
    };
    knowledge: {
      extractOnComplete: boolean;
      categories: string[];
    };
  };
  migration: {
    completed: boolean;
    backupPath?: string;
    migratedAt?: string;
  };
}
```

**Acceptance Criteria:**
- Interface matches architecture design
- Exported from types/index.ts
- JSDoc comments included

#### Task 1.2: Implement Migration Script
**File:** `src/scripts/migrate-to-archive-structure.ts`
**Effort:** 3-4 hours

Script functions:
1. Validate current state (load sprint-index.yaml)
2. Create backup of sprint-index.yaml
3. Create archive directories (active/, archive/, knowledge/)
4. Move recent sprints to active/ (last 2 completed + all non-complete)
5. Move old completed sprints to archive/{year}/
6. Regenerate sprint-index.yaml with updated paths
7. Create archive-config.yaml
8. Validate migration success

**Safety features:**
- Dry-run mode (default)
- Atomic operations (rollback on failure)
- Validation checkpoints
- Comprehensive logging

**Example usage:**
```bash
# Dry run (preview changes)
npm run migrate:archive -- --dry-run

# Execute migration
npm run migrate:archive

# Rollback if needed
npm run migrate:archive -- --rollback
```

#### Task 1.3: Migration Tests
**File:** `src/scripts/__tests__/migrate-archive.test.ts`
**Effort:** 2 hours

Test scenarios:
1. Creates directory structure correctly
2. Moves active sprints to active/
3. Moves completed sprints to archive/{year}/
4. Updates sprint-index.yaml paths
5. Preserves all sprint data
6. Rollback works correctly
7. Dry-run doesn't modify filesystem

#### Task 1.4: Update Regenerate Index Tool
**File:** `src/common/sprint-index-manager.ts`
**Effort:** 2 hours

Update `regenerateSprintIndex()` to scan both:
- `planning/active/`
- `planning/archive/{year}/`

```typescript
async function scanArchiveDirectory(archiveDir: string): Promise<string[]> {
  const yearDirs = await listDirectories(archiveDir); // [2026/, 2027/]
  const sprintDirs: string[] = [];

  for (const yearDir of yearDirs) {
    const yearSprintDirs = await listDirectories(yearDir);
    sprintDirs.push(...yearSprintDirs);
  }

  return sprintDirs;
}
```

#### Task 1.5: Update Check Sprint Status Tool
**File:** `src/tools/check-sprint-status.ts`
**Effort:** 30 minutes

Update to scan only `planning/active/` for active sprints:
```typescript
// Before: Scans all of planning/
const planningDir = getPlanningDir();
const sprintDirs = await listDirectories(planningDir);

// After: Scans only active/
const activeDir = join(getPlanningDir(), 'active');
const sprintDirs = await listDirectories(activeDir);
```

#### Task 1.6: Update Start Sprint Tool
**File:** `src/tools/start-sprint.ts`
**Effort:** 30 minutes

Update to create sprints in `planning/active/`:
```typescript
// Before
const sprintDir = join(planningDir, sprintId);

// After
const activeDir = join(planningDir, 'active');
await ensureDir(activeDir);
const sprintDir = join(activeDir, sprintId);
```

#### Task 1.7: Execute Migration on sprint-mcp
**Effort:** 30 minutes

1. Backup planning directory: `cp -r planning planning.backup`
2. Run migration: `npm run migrate:archive`
3. Verify structure:
   - `planning/active/` has sprint-12, sprint-13
   - `planning/archive/2026/` has sprint-1 through sprint-11
   - `planning/sprint-index.yaml` has updated paths
4. Run tests: `npm test`
5. Regenerate index: `npm run regenerate-index`
6. Verify all sprints found

#### Task 1.8: Create Rollback Documentation
**File:** `planning/MIGRATION_ROLLBACK.md`
**Effort:** 30 minutes

Document rollback procedure:
1. Restore backup index
2. Move sprints back to planning/
3. Remove archive directories
4. Regenerate index

### Phase 1 Exit Criteria

- [ ] All 8 tasks completed
- [ ] Migration script tested and working
- [ ] 13 sprints successfully migrated
- [ ] All tests passing
- [ ] Sprint index regenerates correctly
- [ ] Active/archive directory structure in place
- [ ] **Can proceed to Phase 2**

---

## Phase 2: Archive Sprint Tool

**Priority:** P0
**Duration:** 1-1.5 days
**Dependencies:** Phase 1 complete

### Context

Implement the `archive-sprint` MCP tool that moves completed sprints from `active/` to `archive/{year}/` with optional knowledge extraction.

### Objectives

1. Implement archive-sprint tool
2. Support manual archival workflow
3. Integrate with knowledge extraction
4. Update sprint-index.yaml automatically
5. Comprehensive testing

### Tasks

#### Task 2.1: Define Archive Sprint Types
**File:** `src/types/archive.ts`
**Effort:** 1 hour

```typescript
export interface ArchiveSprintArgs {
  sprintId: string;
  extractKnowledge?: boolean;
  dryRun?: boolean;
}

export interface ArchiveSprintResult {
  archived: boolean;
  fromPath: string;
  toPath: string;
  knowledgeExtracted: boolean;
  indexUpdated: boolean;
}
```

#### Task 2.2: Implement Archive Sprint Tool
**File:** `src/tools/archive-sprint.ts`
**Effort:** 4-5 hours

Algorithm:
1. Validate sprint exists in active/ and is completed
2. Determine target year from manifest.completedAt
3. Create archive/{year}/ if needed
4. Move sprint directory (preserve git history)
5. Extract knowledge if enabled
6. Update sprint-index.yaml manifestPath
7. Regenerate index to validate

**Key functions:**
```typescript
export async function archiveSprintTool(args: ArchiveSprintArgs): Promise<ArchiveSprintResult>
async function validateSprintForArchival(sprintId: string): Promise<void>
async function determineArchiveYear(manifest: SprintManifest): Promise<string>
async function moveSprintToArchive(fromPath: string, toPath: string): Promise<void>
async function updateIndexPaths(sprintId: string, newPath: string): Promise<void>
```

#### Task 2.3: Archive Sprint Tests
**File:** `src/tools/__tests__/archive-sprint.test.ts`
**Effort:** 2-3 hours

Test cases:
1. Archives completed sprint correctly
2. Determines year from completedAt
3. Falls back to createdAt if no completedAt
4. Updates sprint-index.yaml paths
5. Creates archive year directory if missing
6. Fails if sprint not completed
7. Fails if sprint not in active/
8. Dry-run doesn't modify filesystem
9. Knowledge extraction integration (if enabled)

#### Task 2.4: Integration Test - Full Lifecycle
**File:** `src/__tests__/integration/archive-lifecycle.test.ts`
**Effort:** 2 hours

Test scenario:
1. Start sprint → Verify in active/
2. Complete sprint → Verify stays in active/
3. Archive sprint → Verify moved to archive/2026/
4. Regenerate index → Verify paths correct
5. Check status → Verify active sprints exclude archived

#### Task 2.5: Register Archive Tool in MCP Server
**File:** `src/index.ts`
**Effort:** 15 minutes

Add tool registration:
```typescript
{
  name: 'archive-sprint',
  description: 'Move completed sprint from active/ to archive/{year}/',
  inputSchema: {
    type: 'object',
    properties: {
      sprintId: { type: 'string' },
      extractKnowledge: { type: 'boolean' },
      dryRun: { type: 'boolean' }
    },
    required: ['sprintId']
  }
}
```

### Phase 2 Exit Criteria

- [ ] All 5 tasks completed
- [ ] Archive tool working end-to-end
- [ ] All tests passing
- [ ] Tool registered in MCP server
- [ ] Can archive sprints manually
- [ ] **Can proceed to Phase 3**

---

## Phase 3: Knowledge Extraction System

**Priority:** P1
**Duration:** 2-2.5 days
**Dependencies:** Phase 2 complete

### Context

Implement automated knowledge extraction from sprint artifacts with flexible artifact discovery, multi-format parsing, and intelligent aggregation.

**Challenge:** BitBratPlatform analysis shows:
- 37% of sprints lack `key-learnings.md`
- 24% of sprints lack `retro.md`
- Multiple naming conventions used
- Knowledge embedded in various summary/completion files

**Solution:** Pattern-based artifact discovery with fallback extraction.

### Objectives

1. Flexible artifact discovery (handles multiple naming conventions)
2. Multi-format parsing (key-learnings, retro, summaries, SPRINT_COMPLETE)
3. Section-based extraction from non-standard files
4. Knowledge aggregation with deduplication
5. YAML knowledge base generation

### Tasks

#### Task 3.1: Define Knowledge Schemas
**File:** `src/types/knowledge.ts`
**Effort:** 1-2 hours

```typescript
export interface Lesson {
  id: string;
  sprintId: string;
  category: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  frequency: number;
  tags: string[];
  sources: string[];
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  applicability: string;
  examples: Array<{
    sprintId: string;
    outcome: string;
  }>;
  tags: string[];
}

export interface AntiPattern {
  id: string;
  name: string;
  description: string;
  observed: Array<{
    sprintId: string;
    impact: string;
  }>;
  mitigation: string;
  tags: string[];
}

export interface KnowledgeBase {
  lessons: Lesson[];
  patterns: Pattern[];
  antiPatterns: AntiPattern[];
  metrics: SprintMetrics;
}
```

#### Task 3.2: Implement Artifact Discovery
**File:** `src/common/knowledge/artifact-discovery.ts`
**Effort:** 2-3 hours

Pattern-based discovery:
```typescript
export async function findKnowledgeArtifacts(sprintDir: string): Promise<KnowledgeArtifacts> {
  const files = await fs.readdir(sprintDir);
  const artifacts = {
    learnings: [],
    retrospective: [],
    summary: []
  };

  for (const file of files) {
    const lower = file.toLowerCase();

    // Learning files: key-learnings.md, lessons-learned.md, *learn*.md
    if ((lower.includes('learn') || lower.includes('lesson')) && lower.endsWith('.md')) {
      artifacts.learnings.push(join(sprintDir, file));
    }

    // Retro files: retro.md, retrospective.md
    if (lower.includes('retro') && lower.endsWith('.md')) {
      artifacts.retrospective.push(join(sprintDir, file));
    }

    // Summary files: SPRINT_COMPLETE.md, completion-summary.md, etc.
    if ((lower.includes('summary') || lower.includes('complete')) && lower.endsWith('.md')) {
      artifacts.summary.push(join(sprintDir, file));
    }
  }

  return artifacts;
}
```

**Test coverage:** Handle all variations found in BitBratPlatform.

#### Task 3.3: Implement Markdown Parsers
**File:** `src/common/knowledge/markdown-parser.ts`
**Effort:** 3-4 hours

Functions:
1. `parseMarkdownSections()` - Split by H2/H3 headers
2. `parseKeyLearningsMarkdown()` - Parse structured key-learnings.md
3. `parseRetroMarkdown()` - Parse retro.md sections
4. `extractFromSummary()` - Extract from SPRINT_COMPLETE.md
5. `detectCategories()` - Identify Technical, Process, etc.

**Section detection patterns:**
```typescript
const learningsSections = [
  'Key Learnings',
  'Lessons Learned',
  'What We Learned',
  'Takeaways',
  'Insights'
];

const retroSections = [
  'What Worked',
  'What Didn\'t Work',
  'Challenges',
  'Successes',
  'Issues'
];
```

#### Task 3.4: Implement Knowledge Extractor
**File:** `src/common/knowledge/extractor.ts`
**Effort:** 4-5 hours

Main extraction logic with priority fallback:
```typescript
export async function extractKnowledge(sprintId: string): Promise<KnowledgeExtraction> {
  const sprintDir = getSprintDirectory(sprintId);
  const artifacts = await findKnowledgeArtifacts(sprintDir);
  const manifest = await loadManifest(sprintId);

  const lessons: Lesson[] = [];
  const retrospective: Retrospective = { worked: [], didntWork: [], deferred: [] };

  // Priority 1: Explicit learning files
  if (artifacts.learnings.length > 0) {
    for (const file of artifacts.learnings) {
      const parsed = await parseKeyLearningsMarkdown(file);
      lessons.push(...parsed);
    }
  }

  // Priority 2: Explicit retro files
  if (artifacts.retrospective.length > 0) {
    for (const file of artifacts.retrospective) {
      const parsed = await parseRetroMarkdown(file);
      Object.assign(retrospective, parsed);
    }
  }

  // Priority 3: Extract from summaries if no explicit files
  if (lessons.length === 0 && artifacts.summary.length > 0) {
    for (const file of artifacts.summary) {
      const extracted = await extractFromSummary(file);
      lessons.push(...extracted.lessons);
      if (!retrospective.worked.length) {
        Object.assign(retrospective, extracted.retrospective);
      }
    }
  }

  // Compute metrics
  const metrics = computeSprintMetrics(manifest);

  return { lessons, retrospective, metrics };
}
```

#### Task 3.5: Implement Deduplication
**File:** `src/common/knowledge/deduplication.ts`
**Effort:** 2-3 hours

Fuzzy matching for similar lessons:
```typescript
export function findSimilarLesson(newLesson: Lesson, existing: Lesson[]): Lesson | null {
  for (const lesson of existing) {
    const titleSim = similarity(newLesson.title, lesson.title);
    const descSim = similarity(newLesson.description, lesson.description);

    if (titleSim > 0.8 || descSim > 0.7) {
      return lesson; // Found duplicate
    }
  }
  return null;
}

export async function aggregateKnowledge(newExtraction: KnowledgeExtraction): Promise<void> {
  const kb = await loadOrCreate('planning/knowledge/lessons-learned.yaml');

  for (const lesson of newExtraction.lessons) {
    const existing = findSimilarLesson(lesson, kb.lessons);

    if (existing) {
      // Increment frequency, add sprint to sources
      existing.frequency++;
      existing.sources.push(lesson.sprintId);
    } else {
      // New lesson
      kb.lessons.push(lesson);
    }
  }

  await saveKnowledgeBase(kb);
}
```

**Similarity algorithm:** Levenshtein distance or simple token overlap.

#### Task 3.6: Implement Extract Knowledge Tool
**File:** `src/tools/extract-knowledge.ts`
**Effort:** 2-3 hours

MCP tool interface:
```typescript
export async function extractKnowledgeTool(args?: {
  sprintId?: string;
  regenerate?: boolean;
}): Promise<ExtractKnowledgeResult> {
  if (args?.regenerate) {
    // Extract from ALL sprints
    const allSprints = await getAllSprintIds();
    for (const id of allSprints) {
      await extractKnowledge(id);
    }
  } else if (args?.sprintId) {
    // Extract from specific sprint
    await extractKnowledge(args.sprintId);
  }

  // Aggregate into knowledge base
  await aggregateKnowledge();

  return {
    sprintsProcessed: count,
    lessonsExtracted: lessonCount,
    knowledgeBasePath: 'planning/knowledge/'
  };
}
```

#### Task 3.7: Knowledge Extraction Tests
**File:** `src/common/knowledge/__tests__/extractor.test.ts`
**Effort:** 3-4 hours

Test cases:
1. Finds key-learnings.md
2. Finds lessons-learned.md (variation)
3. Finds sprint-359-lessons-learned.md (custom)
4. Falls back to SPRINT_COMPLETE.md
5. Falls back to completion-summary.md
6. Extracts categories (Technical, Process)
7. Parses retro sections (What Worked, Didn't Work)
8. Handles missing artifacts gracefully
9. Deduplication works correctly
10. Frequency counting works

#### Task 3.8: Initialize Knowledge Base
**File:** Create `planning/knowledge/` structure
**Effort:** 1 hour

Create initial YAML files:
- `lessons-learned.yaml` (empty structure)
- `patterns.yaml` (empty structure)
- `anti-patterns.yaml` (empty structure)
- `metrics.yaml` (empty structure)
- `README.md` (knowledge base overview)

#### Task 3.9: Verify Extraction from BitBratPlatform
**Effort:** 2-3 hours

1. Point SPRINT_ROOT to BitBratPlatform
2. Run extract-knowledge tool on sprint-348 (has SPRINT_COMPLETE.md)
3. Run on sprint-200 (has completion-summary.md)
4. Run on sprint-250 (has key-learnings.md)
5. Run on sprint-359 (has lessons-learned.md variation)
6. Verify all formats parsed correctly
7. Check deduplication works across formats

### Phase 3 Exit Criteria

- [ ] All 9 tasks completed
- [ ] Artifact discovery handles all variations
- [ ] Multi-format parsing working
- [ ] Knowledge extraction tested on real BitBratPlatform sprints
- [ ] Deduplication working correctly
- [ ] Knowledge base initialized
- [ ] All tests passing
- [ ] **Can proceed to Phase 4**

---

## Phase 4: Auto-Archive and Polish

**Priority:** P2
**Duration:** 0.5-1 day
**Dependencies:** Phase 3 complete

### Context

Implement optional auto-archive functionality and polish the system with documentation and final testing.

### Objectives

1. Implement auto-archive-sprints tool (optional)
2. Complete documentation
3. Comprehensive testing
4. Validation script

### Tasks

#### Task 4.1: Implement Auto-Archive Tool (Optional)
**File:** `src/tools/auto-archive-sprints.ts`
**Effort:** 3-4 hours

**Note:** This can be deferred to v1.1 if time constrained.

Algorithm:
1. Load all sprints from active/
2. Apply archival criteria (age, count, hybrid)
3. Archive eligible sprints
4. Extract knowledge from each
5. Return summary

```typescript
export async function autoArchiveSprintsTool(args?: {
  criteria?: 'age' | 'count' | 'hybrid';
  ageDays?: number;
  keepCount?: number;
  dryRun?: boolean;
}): Promise<AutoArchiveResult> {
  const eligible = await findEligibleSprints(args);
  const archived: string[] = [];

  for (const sprintId of eligible) {
    if (!args?.dryRun) {
      await archiveSprintTool({ sprintId, extractKnowledge: true });
      archived.push(sprintId);
    }
  }

  return { eligible, archived };
}
```

#### Task 4.2: Update CLAUDE.md Documentation
**File:** `CLAUDE.md`
**Effort:** 1 hour

Add sections:
- Archive system overview
- When to archive sprints
- Knowledge base usage
- Multi-repository setup
- Common workflows

#### Task 4.3: Update README.md
**File:** `README.md`
**Effort:** 1 hour

Add:
- Feature list (archive system, knowledge extraction)
- Installation for multiple repositories
- Quick start guide
- MCP tool catalog

#### Task 4.4: Create Validation Script
**File:** `scripts/validate-archive-system.sh`
**Effort:** 1-2 hours

Validation checks:
1. Archive directory structure exists
2. All sprints in index are found (active or archive)
3. No orphaned sprint directories
4. Knowledge base files valid YAML
5. Sprint index valid
6. No duplicate sprint IDs

#### Task 4.5: Manual Testing Checklist
**File:** `planning/sprint-13-eaydun/MANUAL_TEST_CHECKLIST.md`
**Effort:** 1 hour

Checklist:
- [ ] Start sprint in BitBratPlatform
- [ ] Complete sprint
- [ ] Archive sprint manually
- [ ] Extract knowledge
- [ ] Verify knowledge base updated
- [ ] Auto-archive (if implemented)
- [ ] Regenerate index
- [ ] Check status shows correct active sprints
- [ ] Migration rollback works

#### Task 4.6: Final Integration Testing
**Effort:** 2-3 hours

Execute full lifecycle test:
1. Migrate sprint-mcp sprints
2. Start new sprint
3. Complete sprint
4. Archive sprint
5. Extract knowledge
6. Verify all artifacts correct
7. Check knowledge base populated

### Phase 4 Exit Criteria

- [ ] Auto-archive tool implemented (or deferred)
- [ ] Documentation complete
- [ ] Validation script working
- [ ] Manual testing complete
- [ ] All integration tests passing
- [ ] **Ready for sprint completion**

---

## Success Criteria

### Must Have (Sprint Completion Blockers)

- [x] Technical Architecture approved
- [x] Execution Plan approved
- [ ] Phase 0: SPRINT_ROOT fix complete and verified
- [ ] Phase 1: Migration complete (13 sprints moved)
- [ ] Phase 2: Archive tool working
- [ ] Phase 3: Knowledge extraction working
- [ ] All tests passing (unit + integration)
- [ ] Validation script passing
- [ ] Documentation complete

### Nice to Have (Can Defer)

- [ ] Auto-archive tool (can be v1.1)
- [ ] Pattern extraction (lessons only is acceptable)
- [ ] Anti-pattern detection (can be manual curation)
- [ ] LLM integration examples

### Sprint Completion Requirements

Per Sprint Protocol:
1. Validation script must pass OR failures documented and accepted
2. Verification report created
3. Retro and key learnings documented
4. PR created
5. User approval

---

## Risk Mitigation

### Risk: Migration Data Loss
**Mitigation:**
- Backup planning directory before migration
- Dry-run mode by default
- Atomic operations with rollback
- Validation at each step

### Risk: Phase 0 Takes Longer Than Expected
**Mitigation:**
- Timebox to 1 day
- If blocked, defer archive system and ship path fix as standalone improvement

### Risk: Knowledge Extraction Complexity
**Mitigation:**
- Start with simple key-learnings.md parsing
- Add fallbacks incrementally
- Graceful degradation (log warnings, don't fail)

### Risk: BitBratPlatform Variations Not Covered
**Mitigation:**
- Pattern-based discovery instead of exact matches
- Test on actual BitBratPlatform sprints early
- Iterate based on findings

---

## Dependencies and Sequencing

```
Phase 0 (Path Fix) ────┐
                       ├──→ Phase 1 (Migration) ──→ Phase 2 (Archive) ──→ Phase 3 (Knowledge) ──→ Phase 4 (Polish)
                       │
Technical Architecture ┘
```

**Critical Path:** Phase 0 → Phase 1 → Phase 2 → Phase 3

**Parallel Work Opportunities:**
- Documentation can be written during implementation
- Tests can be written in parallel with code

---

## Estimation Summary

| Phase | Duration | Effort | Priority |
|-------|----------|--------|----------|
| Phase 0: Path Fix | 0.5-1 day | 8-10 hours | P0 (Blocker) |
| Phase 1: Migration | 1-1.5 days | 10-12 hours | P0 |
| Phase 2: Archive Tool | 1-1.5 days | 10-12 hours | P0 |
| Phase 3: Knowledge Extraction | 2-2.5 days | 18-20 hours | P1 |
| Phase 4: Polish | 0.5-1 day | 6-8 hours | P2 |
| **Total** | **5-6 days** | **52-62 hours** | - |

**Note:** Estimates assume full-time focused work. Adjust for interruptions and context switching.

---

## Next Steps

1. **User Approval:** Present this plan to Christopher for approval
2. **Update Sprint Status:** Change sprint-13-eaydun status from `planning` to `in-progress`
3. **Begin Phase 0:** Start with path-utils.ts implementation
4. **Track Progress:** Update backlog.yaml as tasks complete
5. **Daily Check-ins:** Review progress and adjust as needed

---

**Execution Plan Created By:** Lead Implementor (LLM Agent)
**Date:** 2026-08-02
**Status:** Awaiting Approval
**Estimated Completion:** 5-6 days from approval
