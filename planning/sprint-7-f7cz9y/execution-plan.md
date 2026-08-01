# Sprint 7 Execution Plan: Sprint Completion MCP Tool

**Sprint ID**: sprint-7-f7cz9y
**Goal**: Implement a `sprint_complete` MCP tool that automates sprint completion workflow while maintaining protocol compliance and agent flexibility

---

## 1. Executive Summary

This sprint will implement a new MCP tool `sprint_complete` that automates the sprint completion workflow defined in Sprint Protocol §2.9. The tool will handle the mechanical aspects of sprint completion (validation, status updates, index management) while preserving agent autonomy for judgment calls and artifact creation.

### Design Principles

1. **Automate mechanics, preserve judgment**: Tool handles file validation and status updates; agent creates artifacts and decides readiness
2. **Protocol compliance**: Strict adherence to Sprint Protocol §2.9 completion requirements
3. **Flexibility for experimentation**: Support both normal and forced completion modes with clear documentation
4. **Consistency where needed**: Standardize manifest updates, index synchronization, validation checks
5. **Clear error messages**: Guide agents when prerequisites are missing

---

## 2. Current State Analysis

### Existing MCP Tools

The project has 4 existing MCP tools that provide patterns to follow:

1. **start-sprint**: Initializes sprint with manifest, directory structure, worktree, and index entry
2. **check-sprint-status**: Queries sprint index for active/completed sprints
3. **update-sprint-status**: Atomically updates manifest and index for a given sprint
4. **regenerate-sprint-index**: Rebuilds index from manifests when inconsistencies detected

### Sprint Completion in Sprint 6 (Manual Baseline)

Sprint 6 completion involved these manual steps:

1. **Artifact Creation** (agent-driven):
   - `verification-report.md` - Reconciles backlog with deliverables
   - `retro.md` - Retrospective with observations and follow-ups
   - `key-learnings.md` - Durable insights extracted from retro
   - `publication.yaml` - Branch push status and PR metadata

2. **Status Updates** (mechanical):
   - Update `sprint-manifest.yaml` with `status: complete`, `completedAt`, `completionMode`
   - Update sprint index via `update-sprint-status` tool

3. **Git Operations** (agent-driven with human approval):
   - Commit completion artifacts
   - Push branch to remote
   - Optionally create PR (only if human assigns)

### Gap Analysis

**What's missing**: A single tool that validates prerequisites, performs status updates, and presents completion summary to human for final approval.

**What works**: Existing `update-sprint-status` tool handles the atomic update logic correctly.

---

## 3. Tool Design

### Tool Name

`sprint_complete` (or `complete-sprint` for consistency with `start-sprint`)

### Tool Signature

```typescript
interface CompleteSprintArgs {
  sprintId: string;
  completionMode: 'normal' | 'forced';
  pr?: string; // Optional PR URL if created
}
```

### Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Validate Prerequisites                       │
│    - Sprint exists and is in-progress          │
│    - Required artifacts exist (or forced)       │
│    - Git state is clean (or document issues)   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Update Sprint Status                         │
│    - Call update-sprint-status with:            │
│      * status: complete                         │
│      * completedAt: ISO timestamp               │
│      * completionMode: normal|forced            │
│      * pr: URL if provided                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Return Completion Summary                    │
│    - Artifacts validated                        │
│    - Status update result                       │
│    - Next steps (PR, worktree cleanup)          │
└─────────────────────────────────────────────────┘
```

### Validation Checks

#### Normal Completion Mode

- ✅ Sprint exists
- ✅ Sprint status is `in-progress`, `validating`, `verifying`, or `published`
- ✅ `verification-report.md` exists
- ✅ `retro.md` exists
- ✅ `key-learnings.md` exists
- ✅ `publication.yaml` exists
- ⚠️ Git branch matches manifest (warning if mismatch)
- ⚠️ Git state has uncommitted changes (warning only)

#### Forced Completion Mode

- ✅ Sprint exists
- ⚠️ All other checks become warnings (allow completion despite failures)

### Error Handling

**Fail-fast scenarios** (both modes):
- Sprint ID not found
- Sprint already complete

**Warnings** (normal mode) / **Info** (forced mode):
- Missing artifacts
- Git state issues
- Index inconsistencies

---

## 4. Implementation Strategy

### Phase 1: Core Tool Implementation

1. Create `src/tools/complete-sprint.ts` following existing tool patterns
2. Implement validation logic for normal vs forced modes
3. Integrate with existing `update-sprint-status` tool
4. Add comprehensive error messages

### Phase 2: Testing

1. Create unit tests in `src/tools/__tests__/complete-sprint.test.ts`
2. Test normal completion with all artifacts
3. Test forced completion with missing artifacts
4. Test error cases (sprint not found, already complete)
5. Test integration with update-sprint-status

### Phase 3: Integration

1. Update `src/index.ts` to register the new tool
2. Update MCP server tool definitions
3. Test end-to-end with actual sprint completion

### Phase 4: Documentation

1. Add JSDoc comments to all exported functions
2. Create examples in tool description
3. Update README if needed

---

## 5. Acceptance Criteria

### Functional Requirements

- ✅ Tool validates sprint exists and is in appropriate status
- ✅ Normal mode checks all required artifacts exist
- ✅ Forced mode allows completion despite missing artifacts
- ✅ Tool updates sprint-manifest.yaml with completion metadata
- ✅ Tool updates sprint index via update-sprint-status
- ✅ Tool returns clear success/error messages
- ✅ Tool documents next steps (PR creation, worktree cleanup)

### Quality Requirements

- ✅ Unit tests with >80% code coverage
- ✅ Integration tests verify end-to-end workflow
- ✅ TypeScript compilation with no errors
- ✅ JSDoc comments on all exported functions
- ✅ Error messages guide users to corrective actions

### Protocol Compliance

- ✅ Follows Sprint Protocol §2.9 completion requirements
- ✅ Respects completion mode semantics (normal vs forced)
- ✅ Maintains manifest as authoritative source
- ✅ Keeps index synchronized
- ✅ Does not create PR unless explicitly provided

---

## 6. Implementation Details

### File Structure

```
src/tools/
├── complete-sprint.ts          # New tool implementation
└── __tests__/
    └── complete-sprint.test.ts # New test suite
```

### Key Functions

```typescript
// Main tool handler
export async function completeSprintTool(
  args?: Record<string, unknown>
): Promise<CompleteSprintResult>

// Validation helpers
async function validateSprintCompletion(
  sprintId: string,
  completionMode: CompletionMode
): Promise<ValidationResult>

async function checkRequiredArtifacts(
  sprintId: string
): Promise<ArtifactCheck>

// Status update wrapper
async function updateSprintCompletion(
  sprintId: string,
  completionMode: CompletionMode,
  pr?: string
): Promise<void>
```

### Required Artifacts (Normal Mode)

These files must exist in `planning/{sprintId}/`:

1. `verification-report.md` - Reconciles backlog with deliverables
2. `retro.md` - Retrospective observations
3. `key-learnings.md` - Extracted learnings
4. `publication.yaml` - Push status and PR metadata

Optional but recommended:
- `validate_deliverable.sh` - Sprint validation script

### Completion Modes

#### Normal Completion

```typescript
{
  sprintId: "sprint-7-f7cz9y",
  completionMode: "normal"
}
```

Requires all artifacts. Suitable for successful sprint completion.

#### Forced Completion

```typescript
{
  sprintId: "sprint-7-f7cz9y",
  completionMode: "forced",
  pr: "https://github.com/owner/repo/pull/123" // optional
}
```

Allows completion despite missing artifacts or validation failures. Used when:
- Artifacts were created but validation failed
- Sprint needs to close despite incomplete work
- Documented exceptions accepted by human

---

## 7. Testing Strategy

### Unit Tests

```typescript
describe('completeSprintTool', () => {
  describe('validation', () => {
    it('should require sprintId parameter');
    it('should require completionMode parameter');
    it('should validate completionMode is normal or forced');
    it('should fail if sprint does not exist');
    it('should fail if sprint already complete');
  });

  describe('normal completion', () => {
    it('should check all required artifacts exist');
    it('should fail if verification-report.md missing');
    it('should fail if retro.md missing');
    it('should fail if key-learnings.md missing');
    it('should fail if publication.yaml missing');
    it('should update manifest with completion metadata');
    it('should update sprint index');
  });

  describe('forced completion', () => {
    it('should allow completion with missing artifacts');
    it('should include warnings about missing artifacts');
    it('should still update manifest and index');
  });

  describe('error handling', () => {
    it('should handle manifest write failures');
    it('should handle index update failures');
    it('should provide actionable error messages');
  });
});
```

### Integration Tests

1. **Full normal completion**: Create sprint, add artifacts, complete normally
2. **Full forced completion**: Create sprint, skip artifacts, force complete
3. **Error recovery**: Test index regeneration after failed completion

---

## 8. Success Metrics

### Quantitative

- Tool reduces manual completion steps from ~10 to ~1
- Tool catches missing artifacts 100% of the time in normal mode
- Tool completes in <2 seconds for typical sprint

### Qualitative

- Agent feedback: "Simplified completion workflow"
- Error messages clearly guide corrective actions
- Tool behavior predictable and documented

---

## 9. Risks and Mitigation

### Risk 1: Inconsistent state if update-sprint-status fails

**Mitigation**: Use existing atomic update logic from update-sprint-status tool. Document failure recovery in error messages.

### Risk 2: Agents might skip artifact creation assuming tool will catch it

**Mitigation**: Clear error messages that explain what's missing and why it matters. Tool doesn't create artifacts, only validates them.

### Risk 3: Forced mode might be overused

**Mitigation**: Document when forced mode is appropriate. Normal mode is default. Require explicit completionMode parameter.

---

## 10. Timeline Estimate

**Total**: 4-6 hours

- Phase 1 (Core Implementation): 2-3 hours
- Phase 2 (Testing): 1-2 hours
- Phase 3 (Integration): 0.5-1 hour
- Phase 4 (Documentation): 0.5-1 hour

---

## 11. Dependencies

### Required

- Existing `update-sprint-status` tool (already implemented)
- Sprint Protocol §2.9 completion requirements (defined)
- TypeScript build infrastructure (exists)
- Jest test infrastructure (exists)

### Optional

- None

---

## 12. Open Questions

### Q1: Should the tool automatically commit completion artifacts?

**Options**:
- A: Yes, create final commit with completion artifacts
- B: No, leave git operations to agent
- C: Make it optional via parameter

**Recommendation**: **B** - Leave git operations to agent. Tool should validate state, not modify it. Agent has better context for commit messages and timing.

**Reasoning**: Per Sprint Protocol §2.8, completion handoff may involve multiple commits as artifacts are refined. Tool shouldn't assume when final commit should happen.

---

### Q2: Should the tool validate git branch matches manifest?

**Options**:
- A: Yes, fail if mismatch
- B: Yes, warn if mismatch but continue
- C: No, don't check git state

**Recommendation**: **B** - Warn if mismatch but continue. Branch deviations can be documented (as in Sprint 6).

**Reasoning**: Flexibility for future use cases. Some sprints may legitimately work on different branches. Warning provides visibility without blocking.

---

### Q3: Should the tool handle PR creation?

**Options**:
- A: Yes, create PR if pr parameter not provided
- B: Yes, create PR only if explicitly requested via new parameter
- C: No, PR creation stays separate (agent uses gh CLI directly)

**Recommendation**: **C** - No PR creation in this tool. PR already handled by agent with explicit human assignment.

**Reasoning**: Per Sprint Protocol §2.8 (S14), PR requires explicit human assignment. Tool shouldn't infer PR creation. Keep concerns separated.

---

### Q4: Should completion update sprint status to 'complete' or introduce intermediate states?

**Options**:
- A: Direct to 'complete'
- B: Introduce 'completing' status as intermediate
- C: Require manual status progression through 'validating' → 'verifying' → 'published'

**Recommendation**: **A** - Direct to 'complete'. Existing statuses ('validating', 'verifying', 'published') are optional workflow states, not requirements.

**Reasoning**: Simplicity. Tool is called when agent has decided sprint is ready to complete. Intermediate states can still be used before calling the tool if desired.

---

## 13. Future Enhancements (Out of Scope)

1. **Completion checklist validation**: Parse backlog.yaml to ensure all P0 items complete
2. **Automated retro generation**: LLM-assisted retro creation from git log
3. **Worktree cleanup automation**: Remove worktree after completion (risky, keep manual)
4. **Completion templates**: Scaffold completion artifacts with templates
5. **Slack/email notifications**: Notify team when sprint completes

---

## 14. Conclusion

This sprint will implement a focused, high-value tool that automates the mechanical aspects of sprint completion while respecting agent autonomy and protocol requirements. The tool will reduce completion overhead, enforce consistency, and provide clear guidance when prerequisites are missing.

**Ready for approval**: ✅

**Next step**: Create `backlog.yaml` with detailed task breakdown.
