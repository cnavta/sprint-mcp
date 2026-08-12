# Migration Guide: publication.yaml Deprecation

**Effective Date**: Protocol v2.5 (Sprint 20, 2026-08-11)
**Impact**: Low - Backward compatible change
**Action Required**: None for existing sprints; new sprints automatically adopt new format

---

## What Changed?

As of Sprint Protocol v2.5, `publication.yaml` is **deprecated**. Publication metadata (PR URL, branch push timestamps, publication method) is now tracked directly in `sprint-manifest.yaml`.

### Before (Protocol v2.4 and earlier)

Sprint directories contained a separate `publication.yaml` file:

```
planning/sprint-7-abc123/
  ├── sprint-manifest.yaml
  ├── implementation-plan.md
  ├── verification-report.md
  ├── retro.md
  ├── key-learnings.md
  └── publication.yaml          ← Separate file
```

**publication.yaml** example:
```yaml
pr: https://github.com/owner/repo/pull/123
branch: feature/sprint-7-abc123-description
status: created
createdAt: 2026-08-01T12:00:00Z
```

### After (Protocol v2.5+)

Sprint directories NO LONGER require `publication.yaml`:

```
planning/sprint-20-xyz789/
  ├── sprint-manifest.yaml      ← Now contains ALL sprint metadata
  ├── implementation-plan.md
  ├── verification-report.md
  ├── retro.md
  └── key-learnings.md
```

**sprint-manifest.yaml** now includes publication data:
```yaml
id: sprint-20-xyz789
title: Sprint Title
goal: Sprint goal
owner: christophernavta
status: complete
createdAt: '2026-08-11T12:00:00Z'
completedAt: '2026-08-11T14:00:00Z'

links:
  branch: feature/sprint-20-xyz789-description
  pr: https://github.com/owner/repo/pull/123  # PR URL here

publication:  # Optional: additional publication metadata
  method: github-cli
  prCreatedAt: '2026-08-11T14:00:00Z'
  branchPushedAt: '2026-08-11T13:58:00Z'
  notes: PR created successfully
```

---

## Why This Change?

1. **Redundancy**: 80% of information in `publication.yaml` was duplicated in `sprint-manifest.yaml` and `sprint-index.yaml`
2. **Inconsistency**: No standardized schema led to 4 different formats across sprints
3. **Maintenance Burden**: Required updating 3 files instead of 1
4. **Single Source of Truth**: Violated DRY principle; conflicts possible across files
5. **Process Evolution**: Automated MCP tools now update manifest directly

---

## Impact on Your Sprints

### Existing Sprints (Created Before v2.5)

**✅ No action required!**

- Old sprints with `publication.yaml` files continue to work
- The file is simply ignored during sprint completion
- You can keep the files for historical reference
- Archive system handles old sprints transparently

### New Sprints (Created After v2.5)

**✅ Automatic!**

- `publication.yaml` is no longer created
- `complete-sprint` tool no longer checks for it
- PR URL tracked in `sprint-manifest.yaml` → `links.pr`
- Optional publication metadata in `sprint-manifest.yaml` → `publication`

---

## What You Need to Know

### Sprint Completion

**Old requirement** (v2.4):
```
Required artifacts:
  ✓ verification-report.md
  ✓ retro.md
  ✓ key-learnings.md
  ✓ publication.yaml           ← Required
```

**New requirement** (v2.5):
```
Required artifacts:
  ✓ verification-report.md
  ✓ retro.md
  ✓ key-learnings.md
  ✗ publication.yaml           ← No longer required
```

### Protocol Rules Updated

**Rule S12** (Before):
> "Agent MUST push feature branch and record result unless human accepts exception"

**Rule S12** (After):
> "Agent MUST push feature branch and record result **in sprint-manifest.yaml** unless human accepts exception"

**Rule S13** (Before):
> "Sprint cannot close until branch pushed and recorded in `publication.yaml`, or failure logged and accepted"

**Rule S13** (After):
> "Sprint cannot close until branch pushed and recorded in `sprint-manifest.yaml`, or failure logged and accepted"

---

## Migration Options

### Option 1: Do Nothing (Recommended)

✅ **Best for most users**

- Keep old `publication.yaml` files as-is
- They're harmless and provide historical reference
- No tool changes needed
- No risk of data loss

### Option 2: Manual Consolidation (Optional)

If you want to consolidate old `publication.yaml` data into manifests:

1. Open `publication.yaml` in the sprint directory
2. Copy PR URL to `sprint-manifest.yaml` → `links.pr`
3. Optionally add `publication` section with timestamps/method
4. Save `sprint-manifest.yaml`
5. Keep or delete old `publication.yaml` (your choice)

**Example**:

```bash
# Before (two files)
# publication.yaml
pr: https://github.com/owner/repo/pull/10
prCreatedAt: 2026-08-01T12:00:00Z

# sprint-manifest.yaml
id: sprint-10-abc123
title: My Sprint
links:
  branch: feature/sprint-10-abc123-test
# (no PR URL)

# After (one file)
# sprint-manifest.yaml
id: sprint-10-abc123
title: My Sprint
links:
  branch: feature/sprint-10-abc123-test
  pr: https://github.com/owner/repo/pull/10    # Moved from publication.yaml

publication:  # Optional
  prCreatedAt: '2026-08-01T12:00:00Z'          # From publication.yaml
```

### Option 3: Automated Migration (Not Implemented)

An automated migration script (`scripts/migrate-publication-yaml.ts`) was considered but deferred (see backlog BL-014) because:
- Backward compatibility is already complete
- Old files don't cause problems
- Manual migration is straightforward if desired

If there's demand, this script could be implemented in a future sprint.

---

## Frequently Asked Questions

### Q: Do I need to delete old publication.yaml files?

**A**: No! Old files are harmless and ignored. Keep them for historical reference or delete them - your choice.

### Q: Will old sprints break?

**A**: No. The complete-sprint tool gracefully handles sprints with or without publication.yaml. All 474 tests pass including backward compatibility tests.

### Q: Where is the PR URL stored now?

**A**: In `sprint-manifest.yaml` under the `links.pr` field. Example:

```yaml
links:
  branch: feature/sprint-20-abc-description
  pr: https://github.com/owner/repo/pull/20
```

### Q: Can I still track publication timestamps?

**A**: Yes! Use the optional `publication` section in `sprint-manifest.yaml`:

```yaml
publication:
  method: github-cli
  prCreatedAt: '2026-08-11T14:00:00Z'
  branchPushedAt: '2026-08-11T13:58:00Z'
  notes: Additional notes
```

### Q: What if I have a custom tool that reads publication.yaml?

**A**: You have two options:
1. Update your tool to read from `sprint-manifest.yaml` → `links.pr`
2. Keep creating publication.yaml manually (it won't hurt anything)

### Q: Does the sprint index still track PR URLs?

**A**: Yes! The `sprint-index.yaml` continues to include a denormalized `pr` field for fast lookups. This is populated from `sprint-manifest.yaml` → `links.pr`.

### Q: Can new sprints still create publication.yaml if I want?

**A**: Yes, but it's not recommended. The file will be ignored by sprint-mcp tools. You're better off using the new `publication` section in the manifest.

### Q: Will this affect archived sprints?

**A**: No. The archive system is fully backward compatible. Archived sprints with publication.yaml continue to work normally.

---

## Technical Details

### Schema Changes

**src/types/sprint.ts** - New types:

```typescript
export type PublicationMethod = 'github-cli' | 'github-api' | 'manual';

export interface PublicationMetadata {
  method?: PublicationMethod;
  prCreatedAt?: string;
  branchPushedAt?: string;
  notes?: string;
}

export interface SprintManifest {
  // ... existing fields ...
  links?: {
    pr?: string;          // PR URL (was in publication.yaml)
    branch: string;
  };
  publication?: PublicationMetadata;  // NEW: optional metadata
}
```

### Tool Changes

- **complete-sprint.ts**: Removed `publication.yaml` from required artifacts
- **update-sprint-status.ts**: Can optionally write `publication` metadata to manifest
- **Tests**: Added backward compatibility test for old sprints with publication.yaml

### Documentation Changes

- **AGENTS-uncompressed.md**: Updated rules S12, S13; removed publication.yaml schema section
- **AGENTS.md**: Will be regenerated from uncompressed version
- **CLAUDE.md**: Updated sprint directory structure and rules
- **README.md**: Updated artifact lists
- **README-development.md**: Updated developer documentation

---

## Timeline

| Date | Event |
|------|-------|
| 2026-08-11 | Sprint 20 started - publication.yaml analysis |
| 2026-08-11 | Deprecation implemented (Protocol v2.5) |
| 2026-08-11 | All tests passing (474/474) with backward compatibility |
| Future | Old publication.yaml files remain for historical reference |

---

## Getting Help

If you encounter issues or have questions:

1. Check this migration guide first
2. Review the analysis report: `planning/sprint-20-7zvpqa/publication-yaml-analysis-report.md`
3. Check implementation plan: `planning/sprint-20-7zvpqa/implementation-plan.md`
4. Review backlog: `planning/sprint-20-7zvpqa/backlog.yaml`

---

## Summary

✅ **Old sprints**: Keep working as-is (backward compatible)
✅ **New sprints**: Automatically use new format
✅ **No migration required**: But optional if desired
✅ **Single source of truth**: sprint-manifest.yaml
✅ **Fully tested**: 474/474 tests passing

**Bottom line**: This is a transparent improvement that requires no action from you. Old sprints continue working, new sprints are simpler and more maintainable.
