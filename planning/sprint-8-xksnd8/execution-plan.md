# Sprint 8 Execution Plan: Sprint Cleanup Tool

**Sprint ID**: sprint-8-xksnd8
**Goal**: Implement sprint cleanup as both an npm script (for humans) and an MCP tool (for agents) that safely removes git worktrees, optionally archives sprint artifacts, and updates sprint metadata with clear warnings and human confirmation

---

## 1. Executive Summary

This sprint will implement a `sprint cleanup` feature that helps manage completed sprint artifacts by cleaning up git worktrees and optionally archiving sprint planning directories. The feature will be accessible both as an npm script (for humans) and as an MCP tool (for agents).

### Design Principles

1. **Safety first**: Clear warnings about what will be deleted with mandatory human confirmation
2. **Dual interface**: npm script for humans + MCP tool for agents
3. **Informative**: Show disk space to be freed, list files to be deleted
4. **Flexible**: Options to archive before delete, force delete, cleanup specific sprints or all completed
5. **Composable**: Leverage existing git-utils functions (removeWorktree, listWorktrees)

---

## 2. Current State Analysis

### Git Worktree Management

**Existing infrastructure** (src/common/git-utils.ts):
- ✅ `removeWorktree(path, force)` - Remove a worktree with optional force flag
- ✅ `listWorktrees()` - List all worktrees with path, branch, commit info
- ✅ `getWorktreePath(sprintId)` - Get absolute path for sprint worktree
- ✅ `worktreeExists(path)` - Check if worktree exists

**Current problem**:
- Sprint 6 and 7 are complete but worktrees remain (consuming ~100MB disk space)
- No automated cleanup after sprint completion
- Manual cleanup requires git worktree remove commands
- No warning about what will be deleted

### Sprint Artifacts

**What's in each worktree** (based on analysis):
- Full git checkout of entire repository
- All source code, tests, configuration
- All planning directories for all sprints
- node_modules, dist, coverage (if built)
- Approximately 50MB per worktree

**What remains after cleanup**:
- Sprint planning artifacts in `planning/sprint-X-XXXXXX/` (preserved)
- Sprint manifest and all completion documents
- Sprint index entry (preserved)

---

## 3. Tool Design

### Dual Interface

#### npm Script (Human-Friendly)

```bash
npm run sprint:cleanup [-- --sprint=<id>] [-- --archive] [-- --force] [-- --yes]
```

**Behavior**:
- Interactive by default (asks for confirmation)
- Pretty-printed output with colors/formatting
- Shows disk space to be freed
- Lists worktrees to be removed
- Confirms before deletion
- `--yes` flag skips confirmation (for automation)

**Example output**:
```
🧹 Sprint Cleanup

Found 2 completed sprints with worktrees:
  1. sprint-6-24txmg
     - Path: .worktrees/sprint-6-24txmg
     - Branch: feature/sprint-6-24txmg-llm-powered-agents-md-compress
     - Size: ~50MB
     - Status: complete

  2. sprint-7-f7cz9y
     - Path: .worktrees/sprint-7-f7cz9y
     - Branch: feature/sprint-7-f7cz9y-sprint-completion-mcp-tool
     - Size: ~50MB
     - Status: complete

Total disk space to be freed: ~100MB

⚠️  WARNING: This will permanently remove the worktrees listed above.
Sprint planning artifacts in planning/sprint-X/ will be preserved.

Continue? (y/N):
```

#### MCP Tool (Agent-Friendly)

```typescript
mcp__sprint-mcp__cleanup-sprint
  sprintId?: string  // Optional: cleanup specific sprint, or all if omitted
  archive?: boolean  // Optional: archive sprint artifacts before cleanup
  force?: boolean    // Optional: force removal even if uncommitted changes
```

**Behavior**:
- Returns structured data with what will be cleaned up
- Requires explicit confirmation via separate parameter
- Returns warnings and errors clearly
- Respects Sprint Protocol safety requirements

---

## 4. Implementation Strategy

### Phase 1: Core Cleanup Logic

1. **Create cleanup utility** (src/common/sprint-cleanup-utils.ts)
   - `getCleanupCandidates(sprintId?)` - Find sprints to clean up
   - `calculateDiskUsage(path)` - Estimate disk space to free
   - `cleanupSprint(sprintId, force)` - Remove worktree and update metadata
   - `archiveSprint(sprintId, archivePath)` - Archive planning directory

2. **Validation logic**
   - Only cleanup completed sprints (status: complete)
   - Check worktree exists before attempting removal
   - Detect uncommitted changes in worktree (warn if exists)
   - Verify sprint planning directory is preserved

### Phase 2: npm Script Implementation

1. **Create CLI script** (scripts/sprint-cleanup.js)
   - Parse command-line arguments (sprint, archive, force, yes)
   - Interactive confirmation prompt
   - Pretty-printed output with colors
   - Progress indicators during cleanup
   - Summary of what was cleaned up

2. **Add to package.json**
   ```json
   "scripts": {
     "sprint:cleanup": "node scripts/sprint-cleanup.js"
   }
   ```

### Phase 3: MCP Tool Implementation

1. **Create MCP tool** (src/tools/cleanup-sprint.ts)
   - Tool signature with optional parameters
   - Validation: only cleanup complete sprints
   - Warning messages about what will be deleted
   - Structured response with cleanup summary

2. **Register in MCP server** (src/index.ts)
   - Add to tool list
   - Add to call handler

### Phase 4: Testing

1. **Unit tests** (src/common/__tests__/sprint-cleanup-utils.test.ts)
   - Test cleanup candidate detection
   - Test disk usage calculation
   - Test validation logic

2. **Integration tests**
   - Test npm script with --yes flag
   - Test MCP tool on real completed sprints
   - Verify sprint planning artifacts preserved

3. **Manual testing**
   - Cleanup Sprint 6 and 7 worktrees
   - Verify planning directories intact
   - Verify sprint index not corrupted

### Phase 5: Documentation

1. **Update README.md** with sprint cleanup instructions
2. **Add JSDoc to all exported functions**
3. **Document npm script options**

---

## 5. Acceptance Criteria

### Functional Requirements

- ✅ npm script lists completed sprints with worktrees
- ✅ npm script shows disk space to be freed
- ✅ npm script prompts for confirmation before deletion
- ✅ npm script supports --yes flag to skip confirmation
- ✅ npm script supports --sprint flag to cleanup specific sprint
- ✅ MCP tool validates sprint is complete before cleanup
- ✅ MCP tool returns clear warnings about what will be deleted
- ✅ MCP tool preserves sprint planning artifacts
- ✅ Both interfaces use same cleanup logic (DRY)

### Quality Requirements

- ✅ Unit tests for cleanup utility functions
- ✅ Integration tests verify end-to-end workflow
- ✅ TypeScript compilation with no errors
- ✅ JSDoc comments on all exported functions
- ✅ Clear error messages when cleanup fails

### Safety Requirements

- ✅ Never delete sprint planning artifacts (planning/sprint-X/)
- ✅ Never delete active sprint worktrees (status != complete)
- ✅ Warn if worktree has uncommitted changes
- ✅ Require explicit confirmation before deletion
- ✅ Rollback if cleanup fails midway (or document partial state)

---

## 6. Implementation Details

### File Structure

```
src/
├── common/
│   ├── sprint-cleanup-utils.ts       # New: Core cleanup logic
│   └── __tests__/
│       └── sprint-cleanup-utils.test.ts  # New: Unit tests
├── tools/
│   └── cleanup-sprint.ts             # New: MCP tool
└── index.ts                           # Updated: Register new tool

scripts/
└── sprint-cleanup.js                  # New: npm script CLI

package.json                           # Updated: Add npm script
```

### Key Functions

```typescript
// src/common/sprint-cleanup-utils.ts

export interface CleanupCandidate {
  sprintId: string;
  status: SprintStatus;
  worktreePath: string;
  worktreeExists: boolean;
  diskUsage: number; // in bytes
  hasUncommittedChanges: boolean;
}

export async function getCleanupCandidates(
  sprintId?: string
): Promise<CleanupCandidate[]>

export async function calculateDiskUsage(
  path: string
): Promise<number>

export async function cleanupSprint(
  sprintId: string,
  options: { force?: boolean }
): Promise<CleanupResult>

export async function archiveSprint(
  sprintId: string,
  archivePath: string
): Promise<void>
```

### Cleanup Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Identify Cleanup Candidates                  │
│    - Load sprint index                           │
│    - Filter completed sprints                    │
│    - Check worktree exists                       │
│    - Calculate disk usage                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Present Information to User                   │
│    - List sprints to be cleaned up               │
│    - Show disk space to be freed                 │
│    - Warn about worktrees with uncommitted changes│
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Request Confirmation                          │
│    - npm script: Interactive prompt              │
│    - MCP tool: Require explicit parameter        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. Perform Cleanup                               │
│    - Remove git worktree (git worktree remove)   │
│    - Optionally archive planning directory       │
│    - Verify sprint planning artifacts preserved  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 5. Report Results                                │
│    - List cleaned sprints                        │
│    - Show disk space freed                       │
│    - Report any errors                           │
└─────────────────────────────────────────────────┘
```

---

## 7. Open Questions and Decisions

### Q1: Should cleanup also delete the sprint planning directory?

**Options**:
- A: Yes, delete everything (worktree + planning directory)
- B: No, preserve planning directory (worktree only)
- C: Make it optional via --archive flag

**Recommendation**: **B** - Preserve planning directory by default

**Rationale**:
- Sprint artifacts are valuable documentation (retro, key-learnings)
- Disk space savings from planning directory minimal (~1MB vs ~50MB for worktree)
- Can add --purge flag in future if needed to delete everything
- Aligns with protocol emphasis on traceability

---

### Q2: Should cleanup update sprint manifest with cleanup metadata?

**Options**:
- A: Yes, add cleanedUpAt timestamp to manifest
- B: No, don't modify manifest
- C: Add cleanup metadata to sprint index only

**Recommendation**: **C** - Add to sprint index only

**Rationale**:
- Manifest is authoritative and shouldn't change after completion
- Sprint index already has derived metadata
- Can add cleanedUpAt field to index entry without breaking protocol

---

### Q3: What should cleanup do if worktree has uncommitted changes?

**Options**:
- A: Block cleanup, require manual intervention
- B: Warn but allow with --force flag
- C: Automatically stash changes before cleanup

**Recommendation**: **B** - Warn but allow with --force

**Rationale**:
- Sprint is complete, changes in worktree likely experimental
- Matches git worktree remove --force behavior
- User explicitly opts into destructive operation with --force

---

### Q4: Should cleanup be part of complete-sprint tool or separate?

**Options**:
- A: Integrate into complete-sprint tool (automatic cleanup after completion)
- B: Keep separate (manual cleanup when user wants)
- C: Make it optional parameter on complete-sprint

**Recommendation**: **B** - Keep separate

**Rationale**:
- Separation of concerns: completion vs cleanup are different operations
- User may want to keep worktree around for a while after completion
- Cleanup can be run in batch for multiple sprints
- Keeps complete-sprint focused and simple

**Implementation**: Add note in complete-sprint output suggesting cleanup

---

### Q5: Should archive feature compress planning directory to .tar.gz?

**Options**:
- A: Yes, create .tar.gz archive
- B: No, just copy directory to archive location
- C: Skip archive feature entirely (YAGNI)

**Recommendation**: **C** - Skip archive feature for initial implementation

**Rationale**:
- Planning directories are already in git (permanent record)
- YAGNI - can add archive later if needed
- Simplifies implementation (less to test)
- Reduces scope for Sprint 8

**Future work**: If archiving proves useful, add in future sprint

---

## 8. Success Metrics

### Quantitative

- npm script reduces cleanup time from manual (5 mins per sprint) to automated (<30 seconds)
- Frees up ~50MB per cleaned sprint
- Zero sprint planning artifacts accidentally deleted
- Tool successfully cleans up 2 orphaned worktrees (Sprint 6, 7)

### Qualitative

- Human feedback: "Easy to understand what will be deleted"
- Agent feedback: "Clear warnings and confirmation workflow"
- No confusion about what's preserved vs deleted

---

## 9. Risks and Mitigation

### Risk 1: Accidentally delete important data

**Mitigation**:
- Never delete sprint planning directories
- Require explicit confirmation
- Warn about uncommitted changes
- Test thoroughly before using on real sprints

### Risk 2: Cleanup fails midway (partial state)

**Mitigation**:
- Document when cleanup is partial (worktree removed but error occurred)
- Log all operations
- Make cleanup operations idempotent (safe to retry)

### Risk 3: User confusion about what's being deleted

**Mitigation**:
- Clear, specific warnings listing what will be deleted
- Show disk space to be freed
- Use explicit language ("worktree" not "sprint")

---

## 10. Timeline Estimate

**Total**: 3-4 hours

- Phase 1 (Core Cleanup Logic): 1 hour
- Phase 2 (npm Script): 45 minutes
- Phase 3 (MCP Tool): 45 minutes
- Phase 4 (Testing): 30 minutes
- Phase 5 (Documentation): 30 minutes

---

## 11. Dependencies

### Required

- Existing git-utils.ts functions (removeWorktree, listWorktrees)
- Sprint index for finding completed sprints
- TypeScript build infrastructure
- Jest test infrastructure

### Optional

- None

---

## 12. Future Enhancements (Out of Scope)

1. **Archive to .tar.gz**: Compress planning directory before cleanup
2. **Batch cleanup**: Clean up all completed sprints with one command
3. **Dry-run mode**: Show what would be cleaned without actually doing it
4. **Cleanup scheduling**: Automatic cleanup after N days
5. **Cleanup statistics**: Track total disk space freed over time

---

## 13. Conclusion

Sprint 8 will implement a safe, user-friendly cleanup feature that addresses the current problem of orphaned worktrees consuming disk space. The dual interface (npm script + MCP tool) ensures both humans and agents can easily clean up completed sprints with clear warnings and mandatory confirmation.

**Ready for approval**: ✅

**Next step**: Create `backlog.yaml` with detailed task breakdown.
