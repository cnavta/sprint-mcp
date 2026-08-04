# Migration Rollback Guide

This document provides step-by-step instructions for rolling back the archive structure migration if needed.

## When to Rollback

Rollback if you encounter:
- Migration errors or failures
- Broken sprint index
- Missing or corrupted sprint directories
- Tool malfunctions after migration
- Need to revert to flat structure temporarily

## Prerequisites

Before rolling back:
1. **Stop all sprint operations** - Do not create, update, or complete sprints during rollback
2. **Locate your backup** - Find the backup file created during migration
3. **Verify git status** - Ensure no uncommitted changes in sprint directories
4. **Document the issue** - Note why you're rolling back for future reference

## Rollback Procedure

### Step 1: Verify Backup Exists

```bash
cd planning/
ls -la sprint-index-pre-migration-*.yaml.backup
```

You should see a backup file like `sprint-index-pre-migration-2026-08-03T00-00-00-000Z.yaml.backup`.

**If backup is missing:**
- Check `planning/` for any `.backup` files
- If no backup found, proceed to Manual Recovery (see below)

### Step 2: Move Sprints Back to Planning Root

```bash
# Navigate to planning directory
cd planning/

# Move all sprints from active/ back to root
if [ -d "active" ]; then
  mv active/sprint-* ./
  echo "✓ Moved sprints from active/"
fi

# Move all sprints from archive/{year}/ back to root
if [ -d "archive" ]; then
  for year_dir in archive/*/; do
    if [ -d "$year_dir" ]; then
      mv ${year_dir}sprint-* ./
      echo "✓ Moved sprints from ${year_dir}"
    fi
  done
fi

echo "✓ All sprints moved back to planning/"
```

### Step 3: Remove Archive Directories

```bash
# Still in planning/ directory

# Remove active/ directory
if [ -d "active" ]; then
  rmdir active/
  echo "✓ Removed active/ directory"
fi

# Remove archive/ directory and subdirectories
if [ -d "archive" ]; then
  rm -rf archive/
  echo "✓ Removed archive/ directory"
fi
```

### Step 4: Restore Sprint Index from Backup

```bash
# Still in planning/ directory

# Find the most recent backup
BACKUP=$(ls -t sprint-index-pre-migration-*.yaml.backup | head -1)

if [ -z "$BACKUP" ]; then
  echo "❌ ERROR: No backup file found"
  exit 1
fi

echo "Restoring from: $BACKUP"

# Backup current index (in case we need to re-migrate)
cp sprint-index.yaml sprint-index-post-migration.yaml.backup

# Restore from pre-migration backup
cp "$BACKUP" sprint-index.yaml

echo "✓ Sprint index restored from backup"
```

### Step 5: Disable Archive System

```bash
# Still in planning/ directory

# Rename or remove archive-config.yaml
if [ -f "archive-config.yaml" ]; then
  mv archive-config.yaml archive-config.yaml.disabled
  echo "✓ Disabled archive-config.yaml"
fi
```

### Step 6: Regenerate Index to Validate

```bash
# Return to project root
cd ..

# Regenerate sprint index from manifests
npm run sprint:index:regenerate
```

**Expected output:**
```
Successfully regenerated index with 13 sprints
```

### Step 7: Verify Rollback Success

```bash
# Check sprint directory structure
ls -la planning/

# Should see:
# - sprint-1-a9f3c2/
# - sprint-2-b7e4d1/
# - ...
# - sprint-13-eaydun/
# - sprint-index.yaml
# - sprint-index-pre-migration-*.yaml.backup (kept for safety)
# - archive-config.yaml.disabled
```

```bash
# Verify sprint index
cat planning/sprint-index.yaml | head -20

# Should see flat manifestPath entries like:
# manifestPath: planning/sprint-1-a9f3c2/sprint-manifest.yaml
```

```bash
# Test sprint status check
npm run dev -- check-sprint-status

# Should work without errors
```

### Step 8: Run Tests

```bash
npm test
```

All 226 tests should pass.

### Step 9: Verify Tools Still Work

Test that all MCP tools still function:

```bash
# Check sprint status (should work)
# Use MCP tool: check-sprint-status

# Try regenerating index again
npm run sprint:index:regenerate

# Verify no errors
```

## Rollback Complete

After successful rollback:
1. ✅ All sprints back in `planning/` root
2. ✅ No `active/` or `archive/` directories
3. ✅ Sprint index restored from backup
4. ✅ Archive system disabled
5. ✅ All tests passing
6. ✅ Tools functioning normally

## Post-Rollback Cleanup (Optional)

After confirming rollback success, you can clean up backup files:

```bash
cd planning/

# Keep the pre-migration backup (in case you want to re-migrate later)
# Remove the post-migration backup (it's from the failed migration)
rm -f sprint-index-post-migration.yaml.backup

# Archive the disabled config (optional)
mkdir -p .archive-migration-artifacts/
mv archive-config.yaml.disabled .archive-migration-artifacts/
mv sprint-index-pre-migration-*.yaml.backup .archive-migration-artifacts/
```

## Manual Recovery (If Backup Missing)

If you don't have a backup, you can manually recover:

### Manual Step 1: Move All Sprints to Planning Root

```bash
cd planning/
find . -type d -name "sprint-*" -exec mv {} ./ \;
rm -rf active/ archive/
```

### Manual Step 2: Regenerate Index from Scratch

```bash
cd ..
npm run sprint:index:regenerate
```

This will scan all `sprint-*/sprint-manifest.yaml` files and rebuild the index.

### Manual Step 3: Verify Manually

Check each sprint directory:

```bash
cd planning/
for dir in sprint-*/; do
  if [ ! -f "${dir}sprint-manifest.yaml" ]; then
    echo "❌ Missing manifest: $dir"
  fi
done
```

## Re-Migration After Rollback

If you want to retry migration after fixing issues:

1. Ensure all issues are resolved
2. Re-run dry-run to preview:
   ```bash
   npm run migrate:archive:dry
   ```
3. If dry-run looks good, execute:
   ```bash
   npm run migrate:archive
   ```

## Troubleshooting

### "Cannot find sprint directory"

**Symptom:** Sprint directory missing after rollback

**Solution:**
1. Check if directory is in `active/` or `archive/*/`
2. Move it manually: `mv planning/active/sprint-X planning/`
3. Regenerate index: `npm run sprint:index:regenerate`

### "Sprint index has wrong paths"

**Symptom:** Index shows `planning/active/` or `planning/archive/` paths after rollback

**Solution:**
1. Verify all sprints are in `planning/` root
2. Delete `sprint-index.yaml`
3. Regenerate from manifests: `npm run sprint:index:regenerate`

### "Tests failing after rollback"

**Symptom:** Tests fail with path errors

**Solution:**
1. Ensure `archive-config.yaml` is removed/disabled
2. Regenerate index
3. Clear jest cache: `npm test -- --clearCache`
4. Re-run tests: `npm test`

### "MCP tools not working"

**Symptom:** `check-sprint-status` or `start-sprint` fail

**Solution:**
1. Rebuild project: `npm run build`
2. Verify archive-config.yaml is disabled
3. Restart MCP server (restart Claude Desktop)
4. Try tools again

## Getting Help

If rollback fails or you need assistance:

1. **Preserve state** - Don't delete files
2. **Document the issue** - Note exact error messages
3. **Check logs** - Review error output from migration/rollback
4. **Open an issue** - Include:
   - Steps taken
   - Error messages
   - Sprint index content
   - Directory structure (`ls -la planning/`)

## Prevention

To avoid needing rollback in the future:

1. **Always run dry-run first**: `npm run migrate:archive:dry`
2. **Review dry-run output** carefully before executing
3. **Back up manually** before migration: `cp planning/sprint-index.yaml planning/sprint-index.manual-backup.yaml`
4. **Test on a copy** of the repository first
5. **Commit before migration** so you can `git reset --hard` if needed
6. **Run tests before and after** migration

## Safety Notes

⚠️ **Important:**
- Rollback does NOT delete sprint data - it only moves directories
- Manifests are preserved during rollback
- Git worktrees are unaffected by rollback
- You can re-migrate after rollback without data loss

✅ **Safe to rollback if:**
- Migration just completed
- No new sprints created since migration
- No sprints modified since migration

⚠️ **Caution when rolling back if:**
- New sprints created in `active/` after migration
- Sprints were archived using `archive-sprint` tool
- Sprint index was manually edited

In these cases, manually verify sprint locations before moving directories.
