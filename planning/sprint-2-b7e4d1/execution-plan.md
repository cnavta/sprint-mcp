# Execution Plan – sprint-2-b7e4d1

## Sprint Goal

Establish repository baseline commit, configure Git remote, and enable normal publication workflow for future sprints.

## Context

Sprint 1 (sprint-1-a9f3c2) successfully revised the AGENTS.md protocol but identified three deferred Git-related issues that prevent normal publication workflow:

1. **No baseline commit on main**: The local `main` branch is unborn/has no commits
2. **No Git remote configured**: `git remote -v` returns empty
3. **No push authorization**: External push requires explicit human authorization of a verified remote

These issues prevent:
- Normal feature-branch diff and PR creation
- Push handoff from LLM to human
- Standard sprint publication workflow

## Current State

- We are currently on branch `feature/sprint-1-a9f3c2-human-llm-protocol`
- There are commits on this feature branch but main has never been initialized
- All project files exist but are untracked on the current branch
- No Git remote is configured

## Proposed Solution

### Phase 1: Establish Main Branch Baseline
1. Switch to or create `main` branch
2. Add all existing project files (from sprint-1 work)
3. Create initial baseline commit on main
4. Verify main branch has commit history

### Phase 2: Configure Git Remote
1. **Human action required**: Provide Git remote URL (GitHub, GitLab, etc.)
2. Add remote using `git remote add origin <url>`
3. Verify remote configuration with `git remote -v`
4. **Human action required**: Confirm authorization to push to this remote

### Phase 3: Establish Publication Workflow
1. Push main branch to remote (if authorized)
2. Return to sprint-2 feature branch
3. Verify feature branch can be compared to main
4. Document the established workflow

### Phase 4: Validation
1. Verify `git log` shows commits on main
2. Verify `git remote -v` shows configured remote
3. Verify feature branches can create diffs against main
4. Create `validate_deliverable.sh` that checks Git configuration

## Human Decisions Required

1. **Git remote URL**: What is the remote repository URL?
   - GitHub: `https://github.com/username/sprint-mcp.git` or `git@github.com:username/sprint-mcp.git`
   - GitLab, Bitbucket, or other?

2. **Push authorization**: Should the LLM push to the remote, or handle manually?
   - If manual: LLM will prepare branches but not push
   - If automated: LLM will push when appropriate

3. **Main branch content**: Should the initial commit include all current project files?
   - Recommended: Yes, to establish a clean baseline

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Incorrect remote URL causes auth failures | Human provides and verifies URL before push attempts |
| Force-pushing could overwrite remote history | Never use `--force` without explicit human approval |
| Untracked files might be missed | Use `git status` to verify before committing |
| Baseline commit might not reflect desired state | Human reviews file list before commit |

## Success Criteria

- [ ] Main branch exists with at least one commit
- [ ] Git remote is configured and verified
- [ ] Feature branches can create diffs against main
- [ ] Push workflow is documented and tested (dry-run or actual)
- [ ] `validate_deliverable.sh` passes all checks
- [ ] All three deferred items from sprint-1 are resolved

## Dependencies

- Human must provide Git remote URL
- Human must authorize push operations
- Existing project files must be in acceptable state for baseline commit

## Approval Gate

**Human approval required before proceeding to implementation.**

Please confirm:
1. The Git remote URL you want to use
2. Whether LLM should push or you'll handle manually
3. Any specific files that should be excluded from baseline commit (or use .gitignore as-is)
