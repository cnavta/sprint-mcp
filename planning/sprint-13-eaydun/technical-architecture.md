# Technical Architecture: Sprint Archive System with Knowledge Capture
**Sprint 13 - eaydun**
**Author:** Lead Architect
**Date:** 2026-08-02
**Status:** Architecture Design Phase

---

## Executive Summary

This document defines the technical architecture for implementing a sprint archiving system (Option 1: Simple Archive Directory) with integrated knowledge capture capabilities. The system will maintain the planning directory's cleanliness while preserving complete historical access and extracting forward-usable knowledge from completed sprints.

**Key Objectives:**
1. Implement `active/` and `archive/{year}/` directory structure
2. Automate archival of completed sprints based on configurable criteria
3. Extract and consolidate lessons learned, patterns, and critical knowledge
4. Maintain backward compatibility with existing 12 completed sprints
5. Preserve single source of truth: sprint-index.yaml remains authoritative

---

## 1. Current System Analysis

### 1.1 Existing Architecture

**Directory Structure:**
```
planning/
  sprint-1-a9f3c2/           # 11 artifacts (complete sprint)
  sprint-2-b7e4d1/           # 11 artifacts
  ...
  sprint-12-sdwpw0/          # 4 artifacts (minimal)
  sprint-13-eaydun/          # 2 artifacts (active)
  sprint-index.yaml          # Centralized metadata cache
  sprint-index.yaml.backup   # Backup copy
```

**Complete Sprint Artifacts (Sprint 11 example):**
```
sprint-11-giiaka/
  ├── backlog-status.md           # Backlog tracking
  ├── backlog.yaml                # Structured backlog
  ├── implementation-plan.md      # Detailed execution plan
  ├── key-learnings.md            # KNOWLEDGE: Lessons learned ⭐
  ├── publication.yaml            # PR metadata
  ├── request-log.md              # Execution trace
  ├── retro.md                    # KNOWLEDGE: Retrospective ⭐
  ├── sprint-manifest.yaml        # Authoritative metadata
  ├── verification-report.md      # Completion validation
  └── (validate_deliverable.sh)   # Optional validation script
```

**Key Observations:**
- 13 sprint directories currently in flat structure
- ~110-200KB per complete sprint (11 files)
- ~5-10KB per minimal sprint (2-4 files)
- **Knowledge artifacts exist** but not consolidated: `key-learnings.md`, `retro.md`
- Sprint index is 5.9KB and growing linearly

### 1.2 Existing Tool Responsibilities

| Tool | Current Behavior | Archive Impact |
|------|-----------------|----------------|
| `start-sprint` | Creates sprint dir at `planning/sprint-{n}-{hash}/` | Must create in `active/` |
| `complete-sprint` | Validates artifacts, updates manifest+index | Should trigger archival |
| `check-sprint-status` | Scans `planning/` for active sprints | Must scan `active/` only |
| `regenerate-sprint-index` | Scans `planning/` for all manifests | Must scan `active/` + `archive/` |
| `cleanup-sprint` | Removes worktrees for completed sprints | No change needed |
| `update-sprint-status` | Updates manifest and index atomically | No change needed |

### 1.3 Sprint Index Schema

**Current Structure:**
```yaml
version: "1.0"
generatedAt: 2026-08-02T23:12:33.918Z
totalSprints: 13
activeSprints: 1
completedSprints: 12
sprints:
  - id: sprint-1-a9f3c2
    title: Human-LLM Sprint Protocol revision
    status: complete
    owner: Christopher Navta
    createdAt: 2026-07-23T00:02:03Z
    manifestPath: planning/sprint-1-a9f3c2/sprint-manifest.yaml  # ⬅ Path includes planning/
    branch: feature/sprint-1-a9f3c2-human-llm-protocol
    completionMode: normal
    # Optional fields: startedAt, completedAt, pr, worktreePath
```

**Archive Impact:**
- `manifestPath` will change to `planning/archive/2026/sprint-1-a9f3c2/sprint-manifest.yaml`
- Index remains single source of truth for ALL sprints (active + archived)
- Query performance unaffected (index loads once into memory)

---

## 2. Target Architecture

### 2.1 Directory Structure

```
planning/
  sprint-index.yaml              # Single source of truth (ALL sprints)
  sprint-index.yaml.backup       # Backup

  active/                        # Active and recent completed sprints
    sprint-12-sdwpw0/
    sprint-13-eaydun/            # Current active sprint

  archive/                       # Completed sprints by year
    2026/
      sprint-1-a9f3c2/
      sprint-2-b7e4d1/
      ...
      sprint-11-giiaka/
    2027/                        # Future year grouping
      sprint-20-xxx/

  knowledge/                     # 🆕 Consolidated knowledge base
    lessons-learned.yaml         # Aggregated lessons from all sprints
    patterns.yaml                # Recurring patterns and solutions
    anti-patterns.yaml           # What to avoid (from retros)
    metrics.yaml                 # Sprint velocity, duration trends
    README.md                    # Knowledge base overview
```

### 2.2 Archive Lifecycle

```
┌─────────────┐
│ Sprint      │
│ Started     │
└──────┬──────┘
       │ Creates in: active/sprint-N-xxx/
       v
┌─────────────┐
│ Sprint      │
│ In Progress │
└──────┬──────┘
       │
       v
┌─────────────┐
│ Sprint      │
│ Completed   │  ⬅ complete-sprint tool
└──────┬──────┘
       │ Triggers: Knowledge Extraction (async)
       │ Stays in: active/ (configurable retention)
       v
┌─────────────┐
│ Archival    │
│ Eligible    │  ⬅ After N days OR N new sprints
└──────┬──────┘
       │ Triggered: Manual or auto
       │ Action: archive-sprint tool
       v
┌─────────────┐
│ Moved to    │  git mv active/sprint-N/ → archive/2026/sprint-N/
│ Archive     │  Update: sprint-index.yaml manifestPath
└──────┬──────┘
       │
       v
┌─────────────┐
│ Long-term   │  Available for reference
│ Storage     │  Knowledge extracted to knowledge/
└─────────────┘
```

**Archival Criteria (Configurable):**
- **Age-based:** Sprints completed > 30 days ago
- **Count-based:** Keep last N sprints in `active/` (e.g., N=10)
- **Manual:** User-triggered archival
- **Hybrid:** Combination (e.g., keep 10 OR < 30 days, whichever is greater)

### 2.3 Knowledge Extraction Pipeline

```
Sprint Completion
       │
       v
┌──────────────────────────────────────┐
│ Knowledge Extraction (Post-Complete) │
│                                      │
│  1. Parse key-learnings.md           │
│  2. Parse retro.md                   │
│  3. Extract patterns from impl-plan  │
│  4. Compute sprint metrics           │
│  5. Identify anti-patterns           │
└──────────────┬───────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│ Aggregate to knowledge/               │
│                                      │
│  • lessons-learned.yaml              │
│  • patterns.yaml                     │
│  • anti-patterns.yaml                │
│  • metrics.yaml                      │
└──────────────┬───────────────────────┘
               │
               v
       Knowledge Base Updated
       (Queryable, LLM-accessible)
```

**Knowledge Schema (Draft):**

```yaml
# lessons-learned.yaml
version: "1.0"
generatedAt: 2026-08-02T23:00:00Z
totalLessons: 45
lessons:
  - id: lesson-001
    sprintId: sprint-11-giiaka
    category: testing
    title: "Compression modules require integration test priority"
    description: |
      Compression logic has subtle edge cases (empty input, large payloads).
      Unit tests alone miss integration issues.
    impact: high
    frequency: 3  # Appeared in 3 sprints
    tags: [testing, compression, integration]

  - id: lesson-002
    sprintId: sprint-9-qpzk5e
    category: documentation
    title: "README updates should happen continuously, not at sprint end"
    description: |
      Deferring docs to end causes rushed, incomplete coverage.
      Better: Update README as features are implemented.
    impact: medium
    frequency: 5
    tags: [documentation, process]
```

```yaml
# patterns.yaml
version: "1.0"
generatedAt: 2026-08-02T23:00:00Z
patterns:
  - id: pattern-001
    name: "Test-Driven Validation Scripts"
    description: |
      Creating validate_deliverable.sh early in sprint forces
      clear acceptance criteria and enables TDD workflow.
    applicability: All implementation sprints
    examples:
      - sprintId: sprint-2-b7e4d1
        outcome: "Caught baseline issues early"
      - sprintId: sprint-10-t5kiid
        outcome: "Integration tests passed first run"
    tags: [testing, validation, tdd]
```

```yaml
# anti-patterns.yaml
version: "1.0"
generatedAt: 2026-08-02T23:00:00Z
antiPatterns:
  - id: anti-001
    name: "Late Test Writing"
    description: |
      Writing tests after implementation leads to biased tests
      that pass the code as written, not the requirements.
    observed:
      - sprintId: sprint-6-24txmg
        impact: "Missed edge cases in compression logic"
    mitigation: "TDD or test-first approach"
    tags: [testing, process]
```

```yaml
# metrics.yaml
version: "1.0"
generatedAt: 2026-08-02T23:00:00Z
metrics:
  overallStats:
    totalSprints: 13
    avgDuration: PT7H30M
    successRate: 100%  # All completed
    normalCompletions: 11
    forcedCompletions: 2

  byCategory:
    - category: testing
      sprintCount: 5
      avgDuration: PT8H

    - category: infrastructure
      sprintCount: 4
      avgDuration: PT6H

  trends:
    - metric: duration
      direction: decreasing
      note: "Sprints getting faster (tooling maturity)"

    - metric: deferredWork
      direction: decreasing
      note: "Fewer items deferred since sprint-8"
```

---

## 3. Implementation Strategy

### 3.1 Migration Plan (Backward Compatibility)

**Phase 1: Preparation (No Breaking Changes)**
1. Create `planning/active/` directory
2. Create `planning/archive/` directory
3. Update tools to support BOTH old and new paths (dual-mode)
4. Add configuration flag: `ARCHIVE_ENABLED=false` (default off)

**Phase 2: Migration (One-time)**
1. Run migration script: `migrate-to-archive-structure.ts`
2. Moves `sprint-1` through `sprint-11` → `archive/2026/`
3. Moves `sprint-12`, `sprint-13` → `active/`
4. Regenerates sprint-index.yaml with updated paths
5. Creates backup: `sprint-index-pre-migration.yaml.backup`
6. Validates all manifests are accessible

**Phase 3: Activation**
1. Set `ARCHIVE_ENABLED=true`
2. All new sprints go to `active/`
3. Archive tool becomes available

**Rollback Plan:**
- Keep `sprint-index-pre-migration.yaml.backup`
- Simple script: `git mv archive/2026/sprint-* ./` + regenerate index

### 3.2 New Tools

#### 3.2.1 `archive-sprint` Tool

**Function:** Move completed sprint from `active/` to `archive/{year}/`

**MCP Tool Signature:**
```typescript
interface ArchiveSprintArgs {
  sprintId: string;           // "sprint-11-giiaka"
  extractKnowledge?: boolean; // Default: true
  dryRun?: boolean;          // Default: false
}

interface ArchiveSprintResult {
  archived: boolean;
  fromPath: string;          // "planning/active/sprint-11-giiaka"
  toPath: string;            // "planning/archive/2026/sprint-11-giiaka"
  knowledgeExtracted: boolean;
  indexUpdated: boolean;
}
```

**Algorithm:**
```typescript
async function archiveSprint(args: ArchiveSprintArgs): Promise<ArchiveSprintResult> {
  // 1. Validate sprint exists in active/ and is completed
  // 2. Determine target year from manifest.completedAt or createdAt
  // 3. Create archive/{year}/ if needed
  // 4. git mv active/sprint-N → archive/{year}/sprint-N
  // 5. Extract knowledge if enabled
  // 6. Update sprint-index.yaml manifestPath
  // 7. Regenerate index to validate
  // 8. Return result
}
```

#### 3.2.2 `auto-archive-sprints` Tool

**Function:** Automatically archive eligible sprints based on criteria

**MCP Tool Signature:**
```typescript
interface AutoArchiveArgs {
  criteria?: 'age' | 'count' | 'hybrid'; // Default: hybrid
  ageDays?: number;                      // Default: 30
  keepCount?: number;                    // Default: 10
  dryRun?: boolean;                      // Default: false
}

interface AutoArchiveResult {
  eligible: string[];        // Sprint IDs eligible for archival
  archived: string[];        // Actually archived
  skipped: string[];         // Eligible but skipped (e.g., errors)
  knowledgeUpdated: boolean;
}
```

**Criteria Logic:**
```typescript
// Hybrid (default): Archive if BOTH conditions met
function isEligibleForArchival(sprint: SprintIndexEntry, criteria: AutoArchiveArgs): boolean {
  const completedDate = sprint.completedAt ? new Date(sprint.completedAt) : null;
  const daysSinceCompletion = completedDate
    ? (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const activeSprints = getActiveDirectorySprints();
  const sprintPosition = activeSprints.findIndex(s => s.id === sprint.id);

  switch (criteria.criteria) {
    case 'age':
      return daysSinceCompletion > (criteria.ageDays || 30);

    case 'count':
      return sprintPosition < (activeSprints.length - (criteria.keepCount || 10));

    case 'hybrid': // BOTH must be true
      return daysSinceCompletion > (criteria.ageDays || 30)
          && sprintPosition < (activeSprints.length - (criteria.keepCount || 10));
  }
}
```

#### 3.2.3 `extract-knowledge` Tool

**Function:** Extract knowledge from sprint artifacts into consolidated knowledge base

**MCP Tool Signature:**
```typescript
interface ExtractKnowledgeArgs {
  sprintId?: string;          // If omitted, extract from ALL sprints
  categories?: string[];      // ['lessons', 'patterns', 'metrics']
  regenerate?: boolean;       // Regenerate entire knowledge base
}

interface ExtractKnowledgeResult {
  sprintsProcessed: number;
  lessonsExtracted: number;
  patternsExtracted: number;
  metricsUpdated: boolean;
  knowledgeBasePath: string; // "planning/knowledge/"
}
```

**Extraction Logic:**

```typescript
async function extractKnowledge(sprintId: string): Promise<KnowledgeExtraction> {
  const manifest = await loadManifest(sprintId);
  const sprintDir = getSprintDirectory(sprintId);

  // 1. Extract lessons from key-learnings.md
  const lessonsFile = join(sprintDir, 'key-learnings.md');
  const lessons = await parseLessonsLearned(lessonsFile, sprintId);

  // 2. Extract anti-patterns from retro.md
  const retroFile = join(sprintDir, 'retro.md');
  const antiPatterns = await parseAntiPatterns(retroFile, sprintId);

  // 3. Extract patterns from implementation-plan.md + verification-report.md
  const implPlan = join(sprintDir, 'implementation-plan.md');
  const verifyReport = join(sprintDir, 'verification-report.md');
  const patterns = await extractPatterns(implPlan, verifyReport, sprintId);

  // 4. Compute metrics
  const metrics = computeSprintMetrics(manifest);

  return { lessons, antiPatterns, patterns, metrics };
}

async function parseLessonsLearned(file: string, sprintId: string): Promise<Lesson[]> {
  // Parse markdown structure:
  // ## Category Name
  // ### Lesson Title
  // Lesson description...
  //
  // Extract using markdown parser or regex
  // Return structured Lesson objects
}

async function parseAntiPatterns(retroFile: string, sprintId: string): Promise<AntiPattern[]> {
  // Parse retro.md for "What Didn't Work", "Challenges", "Issues"
  // Identify recurring problems
  // Return structured AntiPattern objects
}
```

**Aggregation Logic:**

```typescript
async function aggregateKnowledge(): Promise<void> {
  const allLessons = await loadOrCreate('planning/knowledge/lessons-learned.yaml');
  const allPatterns = await loadOrCreate('planning/knowledge/patterns.yaml');
  const allAntiPatterns = await loadOrCreate('planning/knowledge/anti-patterns.yaml');
  const allMetrics = await loadOrCreate('planning/knowledge/metrics.yaml');

  // Merge new extractions into existing knowledge base
  // Deduplicate by content similarity (title + description fuzzy match)
  // Increment frequency counters for recurring items
  // Update generatedAt timestamps
  // Save back to YAML
}
```

### 3.3 Tool Modifications

#### 3.3.1 `start-sprint` (BREAKING CHANGE)

**Current Behavior:**
```typescript
const sprintDir = join(getPlanningDir(), sprintId);
await mkdir(sprintDir, { recursive: true });
```

**New Behavior:**
```typescript
const activeDir = join(getPlanningDir(), 'active');
await mkdir(activeDir, { recursive: true });

const sprintDir = join(activeDir, sprintId);
await mkdir(sprintDir, { recursive: true });
```

#### 3.3.2 `complete-sprint` (ENHANCEMENT)

**Add Post-Completion Hook:**
```typescript
async function completeSprintTool(args: CompleteSprintArgs): Promise<CompleteSprintResult> {
  // ... existing validation and completion logic ...

  // NEW: Trigger knowledge extraction (async, non-blocking)
  if (config.ARCHIVE_ENABLED && args.extractKnowledge !== false) {
    // Fire and forget (or await if user wants immediate extraction)
    extractKnowledge({ sprintId: args.sprintId })
      .catch(err => logger.warn('Knowledge extraction failed', err));
  }

  return result;
}
```

#### 3.3.3 `check-sprint-status` (BREAKING CHANGE)

**Current Behavior:**
```typescript
const planningDir = getPlanningDir();
const sprintDirs = await listDirectories(planningDir);
// Scans ALL of planning/
```

**New Behavior:**
```typescript
const activeDir = join(getPlanningDir(), 'active');
const sprintDirs = await listDirectories(activeDir);
// Scans ONLY planning/active/
// Archived sprints not considered "active"
```

#### 3.3.4 `regenerate-sprint-index` (BREAKING CHANGE)

**Current Behavior:**
```typescript
const planningDir = getPlanningDir();
const sprintDirs = await listDirectories(planningDir);
```

**New Behavior:**
```typescript
const planningDir = getPlanningDir();
const activeDirs = await listDirectories(join(planningDir, 'active'));
const archiveDirs = await scanArchiveDirectory(join(planningDir, 'archive'));

const allSprintDirs = [...activeDirs, ...archiveDirs];

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

---

## 4. Knowledge Base Design

### 4.1 Schema Definitions

See YAML examples in Section 2.3 above.

**Key Principles:**
1. **Machine-readable:** YAML for easy parsing by tools and LLMs
2. **Structured:** Consistent schema across all knowledge types
3. **Traceable:** Every item links back to source sprint(s)
4. **Queryable:** Support filtering by category, tags, sprint, frequency
5. **Versioned:** Schema version field for future evolution

### 4.2 LLM Integration

**Use Cases:**
1. **Sprint Planning:** "What lessons learned are relevant to testing sprints?"
2. **Pattern Discovery:** "Show me recurring patterns in infrastructure work"
3. **Anti-pattern Avoidance:** "What should I avoid when implementing MCP tools?"
4. **Metric Trends:** "Are sprints getting faster or slower?"

**Implementation:**
```typescript
// In AGENTS.md or system prompts
/**
 * When planning or executing sprints, consult the knowledge base:
 * - planning/knowledge/lessons-learned.yaml
 * - planning/knowledge/patterns.yaml
 * - planning/knowledge/anti-patterns.yaml
 *
 * Filter by relevant tags and apply learnings to current work.
 */
```

**Example LLM Query:**
```
User: "Start implementing the archive tool"

LLM (internally):
1. Reads planning/knowledge/patterns.yaml
2. Finds pattern-001: "Test-Driven Validation Scripts"
3. Applies to current sprint: Create validate_deliverable.sh first
4. Reads lessons-learned.yaml
5. Finds lesson-002: "Update docs continuously"
6. Applies: Updates README as archive tool is built

LLM (responds):
"I'll implement the archive tool using TDD. First, I'll create
validate_deliverable.sh to define acceptance criteria..."
```

### 4.3 Knowledge Maintenance

**Automated:**
- Extraction triggered on sprint completion
- Metrics recomputed on every extraction
- Deduplication by fuzzy matching

**Manual (Future):**
- Curator reviews and tags lessons
- Promotes high-impact lessons
- Merges similar patterns
- Archives stale knowledge (lessons not seen in 20+ sprints)

---

## 5. Configuration and Flags

### 5.1 Configuration File

**Location:** `planning/archive-config.yaml` (or in architecture.yaml)

```yaml
# Archive System Configuration
archive:
  enabled: true  # Master switch

  autoArchive:
    enabled: true
    criteria: hybrid
    ageDays: 30
    keepCount: 10
    schedule: on-complete  # or: manual, daily

  knowledge:
    extractOnComplete: true
    categories:
      - lessons
      - patterns
      - anti-patterns
      - metrics
    aggregateOnExtraction: true

  migration:
    completed: true
    backupPath: planning/sprint-index-pre-migration.yaml.backup
```

### 5.2 Environment Variables (Override)

```bash
# Disable archive system (use old flat structure)
SPRINT_ARCHIVE_ENABLED=false

# Disable auto-archival (manual only)
SPRINT_AUTO_ARCHIVE_ENABLED=false

# Disable knowledge extraction
SPRINT_KNOWLEDGE_EXTRACTION_ENABLED=false
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**archive-sprint.test.ts:**
- Archive sprint to correct year directory
- Handle sprints without completedAt (use createdAt)
- Update sprint-index.yaml manifestPath correctly
- Validate git mv operation
- Rollback on failure

**extract-knowledge.test.ts:**
- Parse lessons from key-learnings.md
- Parse anti-patterns from retro.md
- Extract patterns from implementation-plan.md
- Compute sprint metrics from manifest
- Aggregate into knowledge base without duplicates
- Increment frequency for recurring lessons

**auto-archive-sprints.test.ts:**
- Age-based criteria
- Count-based criteria
- Hybrid criteria
- Dry-run mode
- Error handling (skip broken manifests)

### 6.2 Integration Tests

**full-lifecycle.test.ts:**
1. Start sprint → Verify created in `active/`
2. Complete sprint → Verify stays in `active/`
3. Archive sprint → Verify moved to `archive/2026/`
4. Regenerate index → Verify correct manifestPath
5. Check status → Verify active sprints only from `active/`
6. Extract knowledge → Verify knowledge base updated

**migration.test.ts:**
1. Create flat structure (old style)
2. Run migration script
3. Verify all sprints in correct locations
4. Verify index paths updated
5. Verify no data loss
6. Test rollback

### 6.3 Manual Testing

**Checklist:**
- [ ] Create new sprint → appears in `active/`
- [ ] Complete sprint → knowledge extracted
- [ ] Archive sprint → moved to `archive/{year}/`
- [ ] Query knowledge base → LLM can read and apply lessons
- [ ] Auto-archive runs → eligible sprints moved
- [ ] Regenerate index → all sprints found (active + archive)
- [ ] Check status → only active directory scanned
- [ ] Rollback migration → system restored to flat structure

---

## 7. Migration Procedure

### 7.1 Pre-Migration Checklist

- [ ] Commit all pending changes
- [ ] Run full test suite (ensure green)
- [ ] Backup sprint-index.yaml
- [ ] Backup entire planning/ directory
- [ ] Document rollback procedure
- [ ] Set migration flag in config

### 7.2 Migration Script

**File:** `src/scripts/migrate-to-archive-structure.ts`

```typescript
async function migrateToArchiveStructure(): Promise<MigrationResult> {
  logger.info('Starting migration to archive structure');

  // 1. Validation
  const index = await loadSprintIndex();
  const completedSprints = index.sprints.filter(s => s.status === 'complete');
  const activeSprints = index.sprints.filter(s => s.status !== 'complete');

  logger.info(`Found ${completedSprints.length} completed, ${activeSprints.length} active`);

  // 2. Create directories
  const planningDir = getPlanningDir();
  await fs.mkdir(join(planningDir, 'active'), { recursive: true });
  await fs.mkdir(join(planningDir, 'archive'), { recursive: true });

  // 3. Backup current index
  await fs.copyFile(
    join(planningDir, 'sprint-index.yaml'),
    join(planningDir, 'sprint-index-pre-migration.yaml.backup')
  );

  // 4. Move active/recent sprints to active/
  const recentCount = 2; // Keep last 2 completed sprints in active
  const recentCompleted = completedSprints.slice(-recentCount);
  const toArchive = completedSprints.slice(0, -recentCount);

  for (const sprint of [...activeSprints, ...recentCompleted]) {
    const oldPath = join(planningDir, sprint.id);
    const newPath = join(planningDir, 'active', sprint.id);
    await fs.rename(oldPath, newPath);
    logger.info(`Moved ${sprint.id} to active/`);
  }

  // 5. Move old completed sprints to archive/{year}/
  for (const sprint of toArchive) {
    const year = getSprintYear(sprint);
    const archiveYearDir = join(planningDir, 'archive', year);
    await fs.mkdir(archiveYearDir, { recursive: true });

    const oldPath = join(planningDir, sprint.id);
    const newPath = join(archiveYearDir, sprint.id);
    await fs.rename(oldPath, newPath);
    logger.info(`Archived ${sprint.id} to archive/${year}/`);
  }

  // 6. Regenerate index with new paths
  await regenerateSprintIndex();

  // 7. Validate
  const newIndex = await loadSprintIndex();
  if (newIndex.totalSprints !== index.totalSprints) {
    throw new Error('Sprint count mismatch after migration!');
  }

  // 8. Mark migration complete
  await updateConfig({ migration: { completed: true } });

  logger.info('Migration complete!');
  return {
    success: true,
    movedToActive: activeSprints.length + recentCompleted.length,
    movedToArchive: toArchive.length,
  };
}

function getSprintYear(sprint: SprintIndexEntry): string {
  const date = sprint.completedAt || sprint.createdAt;
  return new Date(date).getFullYear().toString();
}
```

### 7.3 Rollback Procedure

```bash
# If migration fails or needs to be undone:

# 1. Move all sprints back to planning/ root
cd planning/
mv active/sprint-* ./
mv archive/*/sprint-* ./

# 2. Remove new directories
rm -rf active/ archive/

# 3. Restore backup index
cp sprint-index-pre-migration.yaml.backup sprint-index.yaml

# 4. Regenerate index to validate
npm run regenerate-index

# 5. Update config flag
# Set migration.completed = false in planning/archive-config.yaml
```

---

## 8. Performance Considerations

### 8.1 Index Scan Performance

**Current (Flat):**
- Scan 1 directory with 13 entries: ~1ms

**After Archive (Nested):**
- Scan `active/` (2-10 entries): ~0.5ms
- Scan `archive/2026/` (11 entries): ~0.5ms
- Scan `archive/2027/` (future): ~0.5ms
- **Total:** ~1.5ms (negligible increase)

**At Scale (100 sprints):**
- `active/` (10 entries): ~0.5ms
- `archive/` (5 years × 18 sprints/year): ~2.5ms
- **Total:** ~3ms (still negligible)

### 8.2 Knowledge Base Size

**Projection (100 sprints):**
- 5 lessons/sprint × 100 = 500 lessons
- Deduplicated by ~50% = 250 unique lessons
- ~100 bytes/lesson × 250 = 25KB
- **Total knowledge base:** ~100KB (lessons + patterns + metrics)

**Load Time:** < 10ms (loaded once into memory)

### 8.3 Git Operations

**Archive operation:**
- `git mv` = fast (metadata update, no file copy)
- Index regeneration = ~3ms
- **Total:** < 100ms

**Scaling:** Linear with sprint count (acceptable)

---

## 9. Critical Defect: SPRINT_ROOT Path Resolution

**Discovery Date:** 2026-08-02
**Severity:** Critical
**Impact:** Blocks multi-repository usage

### Issue Description

While attempting to start a sprint in BitBratPlatform, the following error occurred:
```
Error: The "path" argument must be of type string. Received undefined
```

**Root Cause:** All tools use `process.cwd()` for path resolution, which points to the MCP server's installation directory (`sprint-mcp`), not the target repository (`BitBratPlatform`).

**Current Behavior:**
```typescript
// In start-sprint.ts:129
const worktreePath = getWorktreePath(sprintId);

// In git-utils.ts:233
export function getWorktreePath(sprintId: string): string {
  const cwd = process.cwd();  // ❌ Returns sprint-mcp path, not BitBratPlatform!
  return join(cwd, '.worktrees', sprintId);
}
```

**MCP Server Configuration:**
```json
// claude_desktop_config.json
"sprint-mcp-local": {
  "command": "node",
  "args": ["/Users/christophernavta/IdeaProjects/sprint-mcp/dist/index.js"],
  "env": {
    "SPRINT_ROOT": "/Users/christophernavta/IdeaProjects/sprint-mcp"  // ⬅ Set but not used!
  }
}
```

### Impact Analysis

**Affected Tools:**
- ✅ `start-sprint` - Creates directories in wrong location
- ✅ `check-sprint-status` - Scans wrong planning directory
- ✅ `regenerate-sprint-index` - Scans wrong planning directory
- ✅ `complete-sprint` - Validates wrong artifacts
- ✅ `cleanup-sprint` - Removes wrong worktrees
- ✅ `archive-sprint` (new) - Would archive to wrong location
- ✅ `extract-knowledge` (new) - Would extract from wrong location

**Current Workaround:**
Manually edit `claude_desktop_config.json` to change `SPRINT_ROOT` when switching repositories. This is:
- ❌ Error-prone
- ❌ Requires Claude Desktop restart
- ❌ Doesn't support multiple repositories simultaneously
- ❌ Breaks multi-repo workflows

### Solution: Respect SPRINT_ROOT Environment Variable

**Design:**
1. Create `getProjectRoot()` utility that checks `SPRINT_ROOT` env var
2. Fallback to `process.cwd()` if `SPRINT_ROOT` not set (backward compatible)
3. Use `getProjectRoot()` in all tools instead of `process.cwd()`

**Implementation:**

```typescript
// src/common/path-utils.ts (NEW FILE)

/**
 * Get the project root directory
 *
 * Checks SPRINT_ROOT environment variable first, falling back to process.cwd().
 * This allows the MCP server to operate on different repositories.
 *
 * @returns Absolute path to the project root
 */
export function getProjectRoot(): string {
  const sprintRoot = process.env.SPRINT_ROOT;

  if (sprintRoot) {
    logger.debug(`Using SPRINT_ROOT: ${sprintRoot}`);
    return sprintRoot;
  }

  const cwd = process.cwd();
  logger.debug(`SPRINT_ROOT not set, using cwd: ${cwd}`);
  return cwd;
}

/**
 * Get the planning directory path
 */
export function getPlanningDir(): string {
  return join(getProjectRoot(), 'planning');
}

/**
 * Get the worktree directory path for a sprint
 */
export function getWorktreeDir(sprintId: string): string {
  return join(getProjectRoot(), '.worktrees', sprintId);
}
```

**Refactor Locations:**

```typescript
// Before (BROKEN):
const planningDir = join(process.cwd(), 'planning');

// After (FIXED):
import { getPlanningDir } from './path-utils.js';
const planningDir = getPlanningDir();
```

**Files to Update:**
- ✅ `src/common/path-utils.ts` (NEW) - Central path resolution
- ✅ `src/common/git-utils.ts` - Use `getProjectRoot()` instead of `process.cwd()`
- ✅ `src/common/sprint-index-manager.ts` - Use `getPlanningDir()`
- ✅ `src/tools/start-sprint.ts` - Use `getPlanningDir()`, `getWorktreeDir()`
- ✅ `src/tools/check-sprint-status.ts` - Use `getPlanningDir()`
- ✅ `src/tools/regenerate-sprint-index.ts` - Use `getPlanningDir()`
- ✅ `src/tools/complete-sprint.ts` - Use `getProjectRoot()`
- ✅ `src/tools/cleanup-sprint.ts` - Use `getProjectRoot()`

**Multi-Repository Configuration:**

After fix, users can configure multiple MCP servers for different repos:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "sprint-mcp-local": {
      "command": "node",
      "args": ["/path/to/sprint-mcp/dist/index.js"],
      "env": {
        "SPRINT_ROOT": "/path/to/sprint-mcp"
      }
    },
    "sprint-mcp": {
      "command": "node",
      "args": ["/path/to/sprint-mcp/dist/index.js"],
      "env": {
        "SPRINT_ROOT": "/path/to/BitBratPlatform"  // ⬅ Different repo!
      }
    }
  }
}
```

**Usage:**
- Call `mcp__sprint-mcp-local__*` tools for sprint-mcp repository
- Call `mcp__sprint-mcp__*` tools for BitBratPlatform repository
- No config changes needed when switching repos

### Testing Strategy

**Unit Tests:**
```typescript
// path-utils.test.ts
describe('getProjectRoot', () => {
  it('should use SPRINT_ROOT when set', () => {
    process.env.SPRINT_ROOT = '/custom/path';
    expect(getProjectRoot()).toBe('/custom/path');
  });

  it('should fallback to process.cwd() when SPRINT_ROOT not set', () => {
    delete process.env.SPRINT_ROOT;
    expect(getProjectRoot()).toBe(process.cwd());
  });
});
```

**Integration Tests:**
```typescript
// multi-repo.test.ts
it('should create sprint in correct repository', async () => {
  process.env.SPRINT_ROOT = tempRepoA;
  await startSprintTool({ title: 'Test', goal: 'Test', owner: 'Test' });

  // Verify sprint created in tempRepoA, not sprint-mcp
  const sprintDir = join(tempRepoA, 'planning', 'sprint-1-*');
  expect(await fileExists(sprintDir)).toBe(true);
});
```

### Deliverables for Sprint 13

**Phase 0: Critical Defect Fix (Must Complete First)**
- [ ] Create `src/common/path-utils.ts`
- [ ] Update 8 files to use new path utilities
- [ ] Add unit tests for path resolution
- [ ] Add integration test for multi-repo scenario
- [ ] Update documentation (CLAUDE.md, README.md)
- [ ] Verify fix works in BitBratPlatform

**Impact on Archive System:**
- Archive system depends on correct path resolution
- `archive-sprint` tool will use `getPlanningDir()` from day one
- Multi-repo support enables archiving sprints in multiple projects

### Success Criteria

- [ ] Can start sprint in BitBratPlatform without changing config
- [ ] Can switch between sprint-mcp and BitBratPlatform using different MCP tool prefixes
- [ ] All existing tests pass
- [ ] New path-utils tests achieve 100% coverage
- [ ] Documentation updated with multi-repo setup guide

---

## 10. Future Enhancements (Out of Scope)

### 9.1 Compression (Phase 2)

When `archive/` exceeds 50 sprints:
```bash
# Compress old sprints to reduce file count
tar -czf archive/2026-sprints.tar.gz archive/2026/sprint-*
rm -rf archive/2026/sprint-*
```

**Trade-off:** Reduces file count but requires extraction for access

### 9.2 External Storage (Phase 3)

For 200+ sprints:
- Move `archive/` to S3/external storage
- Keep manifests in repo, full artifacts external
- Reference via URLs in manifest

### 9.3 Advanced Knowledge Features

- **Semantic Search:** Vector embeddings for lesson similarity
- **Trend Analysis:** ML-based pattern detection
- **Recommendation Engine:** "Sprints similar to current one had these issues..."
- **Knowledge Graph:** Visualize relationships between lessons, patterns, sprints

---

## 10. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Migration data loss | Critical | Low | Full backup, atomic operations, validation checks |
| Path breaking changes | High | Medium | Dual-mode support during transition, extensive testing |
| Knowledge extraction errors | Medium | Medium | Graceful degradation, manual review option |
| Performance degradation | Low | Low | Benchmarking, optimization if needed |
| Adoption resistance | Medium | Low | Clear benefits, easy rollback, documentation |

---

## 11. Success Criteria

**Must Have (MVP):**
- [ ] `active/` and `archive/{year}/` directory structure
- [ ] Migration script successfully moves all 13 sprints
- [ ] All existing tools work with new structure
- [ ] `archive-sprint` tool functional
- [ ] Sprint index regeneration includes both active + archive
- [ ] Knowledge extraction for lessons learned
- [ ] Zero data loss during migration
- [ ] Full test coverage (unit + integration)

**Nice to Have (v1.1):**
- [ ] `auto-archive-sprints` tool
- [ ] Pattern and anti-pattern extraction
- [ ] Metrics aggregation
- [ ] LLM integration with knowledge base
- [ ] Knowledge base README and documentation

**Future (v2.0):**
- [ ] Compression support
- [ ] Advanced knowledge features (search, recommendations)
- [ ] External storage integration

---

## 12. Implementation Roadmap

### Sprint 13 Deliverables

**Phase 0: Critical Defect Fix (Day 1) 🔥 MUST COMPLETE FIRST**
- [ ] Create `src/common/path-utils.ts` with `getProjectRoot()`, `getPlanningDir()`, `getWorktreeDir()`
- [ ] Refactor `src/common/git-utils.ts` to use `getProjectRoot()`
- [ ] Refactor `src/common/sprint-index-manager.ts` to use `getPlanningDir()`
- [ ] Refactor `src/tools/start-sprint.ts` to use path utilities
- [ ] Refactor `src/tools/check-sprint-status.ts` to use path utilities
- [ ] Refactor `src/tools/regenerate-sprint-index.ts` to use path utilities
- [ ] Refactor `src/tools/complete-sprint.ts` to use path utilities
- [ ] Refactor `src/tools/cleanup-sprint.ts` to use path utilities
- [ ] Add unit tests for path-utils.ts (100% coverage)
- [ ] Add integration test for multi-repository scenario
- [ ] Update documentation with multi-repo setup guide
- [ ] Build and verify fix in BitBratPlatform
- [ ] **Blocker:** Archive system cannot proceed until this is fixed

**Phase 1: Foundation (Days 1-2)**
- [x] Technical Architecture document (this document)
- [ ] Implementation plan with task breakdown
- [ ] Configuration schema design
- [ ] Type definitions for new tools

**Phase 2: Migration (Days 2-3)**
- [ ] Migration script implementation
- [ ] Migration tests
- [ ] Backup and rollback procedures
- [ ] Execute migration on current 13 sprints

**Phase 3: Archive Tool (Days 3-4)**
- [ ] `archive-sprint` tool implementation
- [ ] `archive-sprint` tests
- [ ] Tool modifications (start, check-status, regenerate)
- [ ] Integration tests for full lifecycle

**Phase 4: Knowledge Extraction (Days 4-5)**
- [ ] Knowledge schema finalization
- [ ] `extract-knowledge` tool implementation
- [ ] **Flexible artifact discovery** - Pattern-based search for learnings/retro/summary files
- [ ] **Multi-format parsing** - Handle key-learnings.md, retro.md, SPRINT_COMPLETE.md, *-summary.md
- [ ] **Section extraction** - Parse markdown headers to find learnings/retro content
- [ ] Markdown parsing logic with category detection
- [ ] Aggregation and deduplication (fuzzy matching)
- [ ] Knowledge base initialization
- [ ] **Verify extraction from BitBratPlatform** - Test on 262 real sprints

**Phase 5: Validation (Day 5)**
- [ ] Manual testing checklist
- [ ] Documentation updates
- [ ] Validation script
- [ ] Sprint completion

---

## 13. Open Questions

1. **Knowledge Extraction Timing:**
   - Should extraction be synchronous (blocking) or async (background)?
   - **Recommendation:** Async with option to wait (default: fire-and-forget)

2. **Archival Trigger:**
   - Manual only, or auto-archive on every sprint completion?
   - **Recommendation:** Manual for now, auto-archive in v1.1

3. **Knowledge Base Format:**
   - YAML vs JSON vs SQLite?
   - **Recommendation:** YAML (human-readable, git-friendly, LLM-friendly)

4. **Migration Strategy:**
   - Big bang or gradual?
   - **Recommendation:** Big bang with rollback plan (all 13 sprints at once)

5. **Archive Directory Permissions:**
   - Should archive be read-only?
   - **Recommendation:** No (allows manual corrections if needed)

---

## 14. Appendices

### A. File Tree (Post-Implementation)

```
planning/
├── sprint-index.yaml
├── sprint-index.yaml.backup
├── sprint-index-pre-migration.yaml.backup
├── archive-config.yaml
│
├── active/
│   ├── sprint-12-sdwpw0/
│   │   ├── sprint-manifest.yaml
│   │   └── request-log.md
│   └── sprint-13-eaydun/
│       ├── sprint-manifest.yaml
│       ├── request-log.md
│       └── technical-architecture.md (this file)
│
├── archive/
│   └── 2026/
│       ├── sprint-1-a9f3c2/
│       │   ├── sprint-manifest.yaml
│       │   ├── implementation-plan.md
│       │   ├── key-learnings.md
│       │   ├── retro.md
│       │   ├── verification-report.md
│       │   └── ... (other artifacts)
│       ├── sprint-2-b7e4d1/
│       ├── ...
│       └── sprint-11-giiaka/
│
└── knowledge/
    ├── README.md
    ├── lessons-learned.yaml
    ├── patterns.yaml
    ├── anti-patterns.yaml
    └── metrics.yaml
```

### B. Real-World Validation: BitBratPlatform Analysis

**Date:** 2026-08-02
**Source:** /Users/christophernavta/IdeaProjects/BitBratPlatform/planning/

To validate the proposed architecture against real-world usage at scale, we analyzed the BitBratPlatform repository, which has **262 completed sprints** (vs our 13).

#### Scale Metrics

| Metric | BitBratPlatform | sprint-mcp (Current) | Ratio |
|--------|----------------|---------------------|-------|
| **Total Sprints** | 262 | 13 | 20x |
| **Sprint Index Size** | 1,973 lines | 133 lines | 15x |
| **Planning Directory Entries** | 267 directories | 17 directories | 16x |
| **Sprints with key-learnings** | 164 (~63%) | 11 (~85%) | - |
| **Sprints with retro** | 199 (~76%) | 11 (~85%) | - |
| **Sprint ID Range** | sprint-120 to sprint-379 | sprint-1 to sprint-13 | - |

#### Artifact Format Evolution

BitBratPlatform shows **two distinct artifact formats**, indicating evolution over time:

**Classic Format (sprints 120-~370):**
```
sprint-XXX-YYY/
  ├── implementation-plan.md
  ├── key-learnings.md            # 164 instances
  ├── retro.md                    # 199 instances
  ├── verification-report.md
  ├── request-log.md
  ├── publication.yaml
  ├── sprint-manifest.yaml
  └── validate_deliverable.sh     # Optional
```

**New Format (recent sprints ~375+):**
```
sprint-XXX-YYY/
  ├── execution-plan.md           # Renamed from implementation-plan
  ├── backlog.yaml                # Structured task tracking
  ├── SPRINT_COMPLETE.md          # Comprehensive completion report
  ├── README.md                   # Sprint overview
  └── sprint-manifest.yaml
```

**Observation:** Format evolution suggests continuous process improvement, validating the need for flexible tooling.

#### Knowledge Artifact Content Analysis

**Sample key-learnings.md Patterns:**
- **Format:** Mostly bulleted lists, some with categories (Technical, Process, Next time)
- **Length:** 3-15 bullets per sprint
- **Content Types:**
  - Technical gotchas (e.g., "OpenAI SDK AbortSignal goes in options, not body")
  - Process improvements (e.g., "validate_deliverable.sh early enables TDD")
  - Framework learnings (e.g., "LangGraph Annotation.Root simplifies typing")
  - Infrastructure tips (e.g., "Cloud Build uses `$$VAR` to avoid substitution")

**Sample retro.md Patterns:**
- **Format:** Structured sections (What worked, What didn't, Changes made, Deferred)
- **Length:** 5-20 items across sections
- **Content Types:**
  - Successes and wins
  - Issues encountered
  - Resolution strategies
  - Deferred work with justification
  - Action items for future sprints

**Example key-learnings.md (sprint-123):**
```markdown
# Key Learnings – sprint-123-a2f701b

## Technical
- LangGraph state + reducer pattern is a clean fit for short-term memory
- Instance-scoped memory (TTL/LRU) provides strong UX without external deps
- Cloud Build substitution expands ${VAR}; use $$VAR for runtime
- OpenAI AbortSignal via client options, not request body

## Process
- validate_deliverable.sh scoped mode helps focused sprints
- Keeping planning artifacts updated simplified closure

## Next time
- Consider shared cache only if cross-instance continuity needed
- Add metrics for instance memory (key count, char budget)
```

**Example retro.md (sprint-200):**
```markdown
# Retro – sprint-200-f3e5d1

## What Worked
- Explicit emulator config in firebase.json fixed pubsub startup
- Tougher healthchecks ensure DB actually ready
- NATS driver fix resolved duplicate message bug

## What Didn't Work
- Firebase CLI defaults failed; needed explicit 0.0.0.0 binding

## Future Pick-ups
- Monitor startup times; 30-retry limit may need adjustment
```

#### Current Pain Points at Scale

**1. Directory Clutter**
- **262 sprint directories** in flat `planning/` structure
- Hard to visually scan or navigate
- Slow directory listings (ls -la takes ~200ms vs <10ms for 13 sprints)

**2. Knowledge Fragmentation**
- **364+ knowledge files** (164 key-learnings + 199 retros) scattered across sprints
- No way to query "all learnings about testing" without manual grep
- Recurring patterns not identified (e.g., "Cloud Build variable escaping" appears in 5+ sprints)
- No frequency tracking (which lessons appear most often?)

**3. Sprint Index Growth**
- **1,973 lines** (vs 133 for 13 sprints)
- Still performant (loads in <50ms) but growing linearly
- Manageable now, but at 500+ sprints could become unwieldy

**4. No Consolidated Knowledge Base**
- Each sprint's learnings are isolated
- No cross-sprint pattern detection
- No anti-pattern catalog
- No trend analysis (sprint velocity, success rates, common blockers)

#### Validation of Proposed Architecture

The BitBratPlatform analysis **strongly validates** our proposed Option 1 architecture:

**✅ Confirms Need for Archive Directory:**
- 262 sprints in one directory is cluttered
- `active/` vs `archive/{year}/` would improve navigation
- Keeping last 10-20 in `active/` makes sense

**✅ Confirms Need for Knowledge Extraction:**
- 364+ knowledge files are goldmine but inaccessible
- Recurring patterns exist but not captured (e.g., Cloud Build gotchas, testing best practices)
- Deduplication would reduce noise (same lesson in 5+ sprints)
- Frequency tracking would surface most valuable lessons

**✅ Confirms Knowledge Schema Design:**
- Existing key-learnings often have categories (Technical, Process, Next time)
- Retros have structured sections (What worked, What didn't, Deferred)
- Our YAML schema aligns well with existing patterns

**✅ Confirms Scale Considerations:**
- At 262 sprints, flat structure is manageable but not ideal
- Our architecture scales to 500+ sprints easily
- Compression (Phase 2) would be needed around 300+ sprints

#### Additional Insights for Implementation

**1. Support Multiple Artifact Formats**

BitBratPlatform analysis reveals **significant artifact naming variation** across 262 sprints:

**Knowledge Artifacts (by frequency):**
- `retro.md` (199 instances - 76%)
- `key-learnings.md` (164 instances - 63%)
- `SPRINT_COMPLETE.md` (3 instances - recent format)
- `completion-summary.md` (7 instances)
- `sprint-summary.md` (6 instances)
- `testing-summary.md` (1 instance)
- `sprint-359-lessons-learned.md` (1 instance) - Custom naming!
- Various other `*-summary.md` files

**Implementation Plan Artifacts:**
- `implementation-plan.md` (209 instances)
- `execution-plan.md` (59 instances)
- `EXECUTION_PLAN.md` (4 instances)
- `IMPLEMENTATION_PLAN.md` (3 instances)
- `sprint-execution-plan.md` (3 instances)

**Technical Architecture Artifacts:**
- `technical-architecture.md` (56 instances)
- `TechnicalArchitecture.md` (2 instances)
- `technical-architecture-*.md` (variations)

**Verification Artifacts:**
- `verification-report.md` (210 instances)
- `VERIFICATION_REPORT.md` (4 instances)

**Key Insight:** ~37% of sprints (97 out of 262) have NO `key-learnings.md` file, and ~24% (63 out of 262) have NO `retro.md` file. Knowledge may be embedded in other artifacts.

**Flexible Discovery Strategy:**

```typescript
// Pattern-based artifact discovery
async function findKnowledgeArtifacts(sprintDir: string): Promise<KnowledgeArtifacts> {
  const artifacts: KnowledgeArtifacts = {
    learnings: [],
    retrospective: [],
    summary: []
  };

  // Strategy 1: Try explicit knowledge files (exact match)
  const learningFiles = [
    'key-learnings.md',
    'lessons-learned.md',
  ];

  const retroFiles = [
    'retro.md',
    'retrospective.md',
  ];

  // Strategy 2: Try completion/summary files
  const summaryFiles = [
    'SPRINT_COMPLETE.md',
    'completion-summary.md',
    'sprint-summary.md',
    'sprint-completion.md',
  ];

  // Strategy 3: Pattern-based glob search (fallback)
  const files = await fs.readdir(sprintDir);

  for (const file of files) {
    const lower = file.toLowerCase();

    // Find learning-related files
    if (lower.includes('learn') && lower.endsWith('.md')) {
      artifacts.learnings.push(join(sprintDir, file));
    }

    // Find retro-related files
    if ((lower.includes('retro') || lower.includes('retrospective')) && lower.endsWith('.md')) {
      artifacts.retrospective.push(join(sprintDir, file));
    }

    // Find summary/completion files (may contain embedded knowledge)
    if ((lower.includes('summary') || lower.includes('complete')) && lower.endsWith('.md')) {
      artifacts.summary.push(join(sprintDir, file));
    }
  }

  return artifacts;
}
```

**Extraction Priority:**
1. **Primary:** `key-learnings.md` or `lessons-learned.md` (explicit knowledge)
2. **Secondary:** `retro.md` or `retrospective.md` (explicit retrospective)
3. **Tertiary:** `*-summary.md`, `SPRINT_COMPLETE.md` (embedded knowledge)
4. **Fallback:** Pattern-match any file with `learn`, `retro`, `summary`, `complete` in name

**Content Extraction Heuristics:**

```typescript
// Extract from SPRINT_COMPLETE.md or completion-summary.md
async function extractFromSummary(file: string): Promise<Knowledge> {
  const content = await readFile(file);

  // Look for common section headers
  const sections = parseMarkdownSections(content);

  // Extract learnings from various section names
  const learningsSections = [
    'Key Learnings',
    'Lessons Learned',
    'What We Learned',
    'Takeaways',
    'Insights',
  ];

  const retroSections = [
    'What Worked',
    'What Didn\'t Work',
    'Challenges',
    'Successes',
    'Issues',
    'Retrospective',
  ];

  // Parse sections and extract structured data
  return {
    lessons: extractLessonsFromSections(sections, learningsSections),
    retrospective: extractRetroFromSections(sections, retroSections),
  };
}
```

**Handling Missing Artifacts:**
- Gracefully skip sprints with no knowledge artifacts (don't fail extraction)
- Log warning: "Sprint X has no knowledge artifacts"
- Extract from verification-report.md if it contains learnings/challenges
- Consider technical-architecture.md for architectural insights

**2. Category Extraction Heuristics**
- key-learnings.md often has markdown headers (## Technical, ## Process)
- Retros have consistent sections (## What Worked, ## What Didn't Work)
- Use markdown parsing to extract structured categories

**3. Deduplication Strategy**
- Exact match: "OpenAI AbortSignal goes in options, not body" appears verbatim
- Fuzzy match: "Cloud Build uses `$$VAR`" vs "Cloud Build substitution needs $$VAR"
- Use title + description similarity (Levenshtein distance or embeddings)
- Increment frequency counter on match

**4. Knowledge Base Seeding**
- Can seed from BitBratPlatform's 364 knowledge files
- Extract patterns across both repos
- Identify universal lessons vs repo-specific

**5. Migration Consideration**
- BitBratPlatform has NO archival yet (all 262 in planning/)
- Our architecture can be applied to BitBratPlatform later
- Test migration on sprint-mcp first (13 sprints), then scale to BitBratPlatform (262 sprints)

#### Recommended Adjustments

Based on BitBratPlatform analysis, we recommend these adjustments to the architecture:

**1. Flexible Artifact Parsing**
```typescript
async function extractLessons(sprintDir: string): Promise<Lesson[]> {
  // Find all potential knowledge artifacts
  const artifacts = await findKnowledgeArtifacts(sprintDir);

  const lessons: Lesson[] = [];

  // Priority 1: Explicit learning files
  if (artifacts.learnings.length > 0) {
    for (const file of artifacts.learnings) {
      const parsed = await parseKeyLearningsMarkdown(file);
      lessons.push(...parsed);
    }
  }

  // Priority 2: Extract from summary/completion files if no explicit learnings
  if (lessons.length === 0 && artifacts.summary.length > 0) {
    for (const file of artifacts.summary) {
      const extracted = await extractLessonsFromSummary(file);
      lessons.push(...extracted);
    }
  }

  // Priority 3: Extract from verification report as last resort
  if (lessons.length === 0) {
    const verificationFile = join(sprintDir, 'verification-report.md');
    if (await fileExists(verificationFile)) {
      const extracted = await extractLessonsFromVerification(verificationFile);
      lessons.push(...extracted);
    }
  }

  // Log extraction stats
  if (lessons.length > 0) {
    logger.info(`Extracted ${lessons.length} lessons from ${artifacts.learnings[0] || artifacts.summary[0] || 'verification-report.md'}`);
  } else {
    logger.warn(`No lessons found in ${sprintDir}`);
  }

  return lessons;
}

// Helper: Find knowledge artifacts using pattern matching
async function findKnowledgeArtifacts(sprintDir: string): Promise<KnowledgeArtifacts> {
  const files = await fs.readdir(sprintDir);
  const artifacts: KnowledgeArtifacts = {
    learnings: [],
    retrospective: [],
    summary: []
  };

  for (const file of files) {
    const lower = file.toLowerCase();
    const fullPath = join(sprintDir, file);

    // Explicit learning files
    if ((lower.includes('learn') || lower.includes('lesson')) && lower.endsWith('.md')) {
      artifacts.learnings.push(fullPath);
    }

    // Retrospective files
    if (lower.includes('retro') && lower.endsWith('.md')) {
      artifacts.retrospective.push(fullPath);
    }

    // Summary/completion files (may contain embedded knowledge)
    if ((lower.includes('summary') || lower.includes('complete')) && lower.endsWith('.md')) {
      artifacts.summary.push(fullPath);
    }
  }

  return artifacts;
}
```

**2. Category-Aware Parsing**
```typescript
interface LessonWithCategory {
  category: string;  // Technical, Process, Next time, etc.
  title: string;
  description: string;
}

// Parse markdown structure:
// ## Technical
// - Lesson 1
// - Lesson 2
// ## Process
// - Lesson 3
```

**3. Fuzzy Deduplication**
```typescript
function findSimilarLesson(newLesson: Lesson, existing: Lesson[]): Lesson | null {
  for (const lesson of existing) {
    const titleSimilarity = levenshtein(newLesson.title, lesson.title);
    const descSimilarity = levenshtein(newLesson.description, lesson.description);

    if (titleSimilarity > 0.8 || descSimilarity > 0.7) {
      return lesson;  // Found duplicate
    }
  }
  return null;
}
```

**4. Archive Criteria Refinement**
- **BitBratPlatform scale:** Keep last 20 sprints in `active/` (vs our initial 10)
- **Age threshold:** 60 days (vs 30) to avoid churning recent sprints
- **Hybrid criteria:** (age > 60 days) AND (not in last 20 sprints)

#### Projected Impact at BitBratPlatform Scale

If we applied this architecture to BitBratPlatform:

**Before (Current):**
```
planning/
  sprint-120-xxx/   (262 directories in one folder)
  sprint-121-xxx/
  ...
  sprint-379-xxx/
  sprint-index.yaml (1973 lines)
```

**After (Archived):**
```
planning/
  active/           (20 recent sprints)
  archive/
    2025/           (60 sprints)
    2026/           (182 sprints)
  knowledge/
    lessons-learned.yaml  (~400 unique lessons, deduplicated from 820)
    patterns.yaml         (~80 patterns)
    anti-patterns.yaml    (~50 anti-patterns)
    metrics.yaml          (262 sprints analyzed)
  sprint-index.yaml (1973 lines - unchanged, still authoritative)
```

**Benefits:**
- **Navigation:** 20 dirs in `active/` vs 262 in flat structure (13x reduction)
- **Knowledge Access:** Query 400 lessons by category/tag vs grepping 164 files
- **Pattern Discovery:** 80 identified patterns vs scattered across 364 files
- **Trend Analysis:** Aggregate metrics vs manual sprint-by-sprint review

---

### C. References

- Sprint Protocol: `AGENTS.md` §2.0-2.9
- Current Implementation: `src/tools/*.ts`, `src/common/sprint-index-manager.ts`
- Type Definitions: `src/types/sprint.ts`, `src/types/sprint-index.ts`
- Original Architecture Discussion: (this conversation, 2026-08-02)
- **Real-World Validation:** BitBratPlatform planning directory analysis (262 sprints)

---

**End of Technical Architecture Document**

**Next Step:** Create detailed implementation plan for user approval before proceeding with implementation.
