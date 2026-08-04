# Key Learnings – Sprint 13

**Sprint ID**: sprint-13-eaydun
**Title**: Sprint Archive System with Knowledge Extraction
**Date**: 2026-08-04

---

## Technical Learnings

### 1. Archive System Design
**Learning**: Year-based hierarchical structure balances organization with performance.

**Context**: Chose `planning/archive/{year}/{sprint-id}/` over flat archive or other schemes.

**Rationale**:
- Year boundaries are natural sprint groupings
- Small enough directories for filesystem performance
- Human-readable and predictable
- Easy to navigate and script against

**Application**: Use year-based hierarchies for time-series data with moderate growth rates.

---

### 2. Local-First Knowledge Extraction
**Learning**: Complex text analysis doesn't always require AI/LLMs. Regex + heuristics work well for structured content.

**Context**: Knowledge extraction uses markdown parsing, keyword matching, and Jaccard similarity instead of AI APIs.

**Benefits**:
- Zero cost, zero latency
- Works offline
- No rate limits or authentication
- Deterministic and testable
- Privacy-preserving (no data leaves the system)

**Tradeoffs**:
- Less sophisticated than LLM analysis
- Requires well-structured input
- Limited semantic understanding

**Application**: For structured, template-based content, local processing is often sufficient and preferable.

---

### 3. Backward Compatibility Through Abstraction
**Learning**: Centralized path utilities enable seamless migration without breaking existing code.

**Context**: All tools use `getPlanningDir()` instead of hardcoded paths. This allowed archive system to work without modifying 8 MCP tools.

**Pattern**:
```typescript
// Bad: Hardcoded paths
const planningDir = join(process.cwd(), 'planning');

// Good: Abstracted paths
const planningDir = getPlanningDir();
```

**Benefit**: Single point of change enables major architectural shifts without widespread refactoring.

**Application**: Abstract filesystem paths, URLs, and other environment-specific values from day one.

---

### 4. Sprint Index as Source of Truth
**Learning**: Maintaining a derived index (cache) of manifest metadata enables fast queries and consistent tool behavior.

**Context**: `planning/sprint-index.yaml` caches manifest data and includes `manifestPath` field that points to current location (active/ or archive/).

**Benefits**:
- Fast queries without scanning filesystem
- Single source of truth for sprint locations
- Tools work transparently with both active and archived sprints

**Tradeoffs**:
- Index can become stale if manifests change directly
- Regeneration tool needed for recovery

**Application**: For frequently-queried, slow-to-compute data, maintain a regenerable cache/index.

---

### 5. Test Real-World Scenarios, Not Just Happy Paths
**Learning**: Testing only clean, well-structured test directories misses real-world edge cases.

**Context**: Legacy sprint bug wasn't caught in tests because test setup created fresh, clean structures. BitBratPlatform (with partially migrated sprints) revealed the issue immediately.

**Lesson**: Include tests that simulate:
- Partial migrations
- Mixed old/new structures
- Unexpected directory layouts
- Real historical data

**Application**: Test against production-like scenarios, not just idealized setups.

---

### 6. Jaccard Similarity for Text Deduplication
**Learning**: Jaccard similarity (intersection/union of word sets) is effective for finding duplicate text at ~0.6 threshold.

**Formula**: `J(A, B) = |A ∩ B| / |A ∪ B|`

**Context**: Used to deduplicate knowledge items like "Always validate input" appearing in multiple sprints.

**Tuning**:
- Threshold 0.6 = good balance
- Lower (0.4) = too many false positives
- Higher (0.8) = misses similar items

**Alternatives Considered**:
- Levenshtein distance (too strict for word order variations)
- Exact match (misses paraphrasing)
- Embeddings/cosine similarity (requires ML models)

**Application**: For duplicate detection in natural language, Jaccard similarity with 0.5-0.7 threshold works well.

---

### 7. Configuration-Driven Behavior
**Learning**: Externalizing behavior to configuration files makes tools flexible without code changes.

**Context**: `archive-config.yaml` controls:
- Archive enablement
- Auto-archive criteria (age/count/hybrid)
- Thresholds (30 days, 10 sprints)
- Knowledge extraction categories

**Benefits**:
- Different repos can have different policies
- Users can tune without code changes
- A/B testing of parameters is easy

**Pattern**:
```typescript
// Load config, fall back to sensible defaults
const config = await loadConfig() || DEFAULT_CONFIG;
const criteria = args.criteria || config.autoArchive.criteria;
```

**Application**: For behavior that may vary by environment/user, use configuration files with good defaults.

---

### 8. Dry-Run Modes for Safe Operations
**Learning**: Destructive operations should always have a dry-run/preview mode.

**Context**: Migration script, auto-archive, and archive-sprint all have dry-run modes that show what would happen without making changes.

**Implementation Pattern**:
```typescript
if (dryRun) {
  return { preview: "Would move X to Y" };
} else {
  // Actual operation
  moveFiles(X, Y);
}
```

**Benefits**:
- Users can verify before committing
- Reduces fear of trying new tools
- Useful for understanding tool behavior

**Application**: All destructive operations should have dry-run modes.

---

## Process Learnings

### 9. Phase-Based Incremental Delivery
**Learning**: Breaking large features into phases with clear deliverables keeps work manageable and reduces risk.

**Context**: Sprint 13 had 4 phases:
1. Archive Foundation (types, basic archival)
2. Knowledge Extraction (parser, extractor, deduplicator)
3. Migration System (flat → archive conversion)
4. Auto-Archive (batch archival automation)

**Benefits**:
- Each phase delivered working functionality
- Could validate and adjust between phases
- Reduced cognitive load
- Clear progress milestones

**Application**: For multi-week features, define 3-5 phases with 1-3 day deliverables each.

---

### 10. Test-Driven Development Catches Issues Early
**Learning**: Writing tests alongside (or before) implementation catches bugs when they're cheap to fix.

**Context**: Test suite grew from 299 → 311 tests. Several bugs caught by tests before manual testing.

**Examples**:
- Empty markdown file handling
- Missing manifest directory handling
- Invalid YAML parsing

**ROI**: 10 minutes writing a test saves 30+ minutes debugging later.

**Application**: For complex logic, write tests first. For simple code, write tests alongside.

---

### 11. Documentation During Development > After
**Learning**: Updating documentation as you code is easier and more accurate than retroactive documentation.

**Context**: Updated README.md and CLAUDE.md during Phase 4, not after sprint completion.

**Benefits**:
- Details are fresh in mind
- Code and docs stay in sync
- Avoids "documentation debt" at end
- User feedback can inform design

**Application**: Reserve 10-15% of implementation time for concurrent documentation.

---

### 12. User Feedback is Invaluable
**Learning**: Real user testing reveals issues that internal testing misses.

**Context**: User's BitBratPlatform testing revealed the legacy sprint scanning bug within minutes.

**Process**:
1. User tried regenerate-sprint-index in BitBratPlatform
2. Reported "only 1 sprint found" instead of 260+
3. Investigation revealed missing legacy sprint scan
4. Fix implemented and tested within 30 minutes

**Application**: Get real-world user testing as early as possible, even for partially complete features.

---

## Architecture Learnings

### 13. MCP Tool Design Principles
**Learning**: MCP tools should be atomic, composable, and idempotent where possible.

**Examples**:
- `archive-sprint` (atomic: archives one sprint)
- `auto-archive-sprints` (composable: calls archive-sprint for each eligible sprint)
- `regenerate-sprint-index` (idempotent: produces same result regardless of how many times run)

**Benefits**:
- Tools can be combined in scripts
- Retrying is safe
- Behavior is predictable

**Application**: Design CLI/API tools to be atomic and composable.

---

### 14. Manifest + Index Architecture Pattern
**Learning**: Combining authoritative manifests with a regenerable index balances consistency with performance.

**Pattern**:
- **Manifests** = source of truth (1 per sprint)
- **Index** = derived cache (1 for all sprints)
- **Regeneration** = recovery mechanism

**Benefits**:
- Fast queries (index)
- Can't corrupt source data (manifest)
- Self-healing (regeneration)

**Tradeoffs**:
- Index can drift if manifests change directly
- Need regeneration tool

**Application**: For distributed source-of-truth data that needs fast aggregate queries.

---

### 15. Multi-Repository Design from Start
**Learning**: Supporting multiple repositories from the beginning avoids painful refactoring later.

**Context**: Using `process.env.SPRINT_ROOT` and `getProjectRoot()` from day one enabled sprint-mcp to work across multiple repos without changes.

**Pattern**:
```typescript
export function getProjectRoot(): string {
  return process.env.SPRINT_ROOT || process.cwd();
}
```

**Cost**: Minimal (just an environment variable check)

**Benefit**: Massive (enables multi-repo use case without refactoring)

**Application**: If there's any chance of multi-environment use, design for it from the start.

---

## Transferable Insights

1. **Local-first works**: Don't reach for AI/external APIs when local processing suffices
2. **Abstract early**: Centralize environment-specific values from day one
3. **Dry-run everything**: Destructive operations need preview modes
4. **Test realistically**: Include messy, real-world scenarios in tests
5. **Document concurrently**: Write docs during implementation, not after
6. **Phase large work**: Break multi-week features into 1-3 day phases
7. **Cache + regenerate**: Derived indexes should be regenerable from source
8. **Config-driven**: Externalize behavior that varies by environment
9. **Atomic tools**: Design tools to be composable building blocks
10. **User test early**: Real users find real issues fast

---

**Key Learnings Captured**: 2026-08-04
**For Future Sprints**: Reference these patterns when designing archive/caching/knowledge systems
