# Understanding Sprint Protocol (For Developers)

**Reading Time**: 5 minutes
**Audience**: Developers familiar with git, CLI, and development workflows
**See also**: [Sprint Protocol Overview](../shared/sprint-protocol-overview.md) (general audience)

---

## TL;DR

Sprint Protocol = **Structured Git workflow** + **LLM collaboration** + **Complete traceability**

```bash
# Start
"Start sprint: Implement rate limiting middleware"

# Work happens in isolated worktree (.worktrees/sprint-1-abc123/)
# on feature branch (feature/sprint-1-rate-limiting)

# Complete
"Sprint complete"
# → Creates PR, archives artifacts, back to main
```

**Key difference from normal git workflow**: Everything is documented, traceable, and Claude-assisted.

---

## Sprint Protocol vs Traditional Workflows

### Traditional Git Flow
```bash
git checkout -b feature/rate-limiting
# code, commit, code, commit
git push origin feature/rate-limiting
# create PR manually
# context and reasoning lost
```

**Problems**:
- ❌ No documentation of "why"
- ❌ Planning happens elsewhere (Jira, Notion, etc.)
- ❌ Context scattered across tools
- ❌ Hard to onboard collaborators
- ❌ Can't recreate decision-making process

---

### Sprint Protocol Flow
```bash
# Claude handles all git operations
"Start sprint: Implement rate limiting middleware"

# → Creates .worktrees/sprint-1-abc123/
# → Creates feature branch
# → Creates planning/sprint-1-abc123/ with:
#    - implementation-plan.md (what we'll do)
#    - sprint-manifest.yaml (metadata)
#    - request-log.md (every prompt, command, change)

# Work with Claude
"Let's implement Redis-based rate limiting"

# → Claude writes code
# → Commits with detailed messages
# → Logs everything to request-log.md

"Sprint complete"

# → Runs validate_deliverable.sh
# → Creates verification-report.md
# → Attempts to create PR (gh pr create)
# → Archives planning artifacts
```

**Benefits**:
- ✅ Complete context in one place
- ✅ Every decision documented with reasoning
- ✅ Reproducible (can understand and recreate)
- ✅ Shareable (onboarding takes minutes, not days)
- ✅ PR includes all context

---

## Git Worktrees: The Technical Foundation

### Why Worktrees?

**Problem**: Switching branches loses working state, mixes concerns, causes merge conflicts.

**Solution**: Each sprint gets its own working directory.

```bash
# Traditional (one working directory)
git checkout main          # lose work in progress
git checkout feature-1     # can't work on feature-2 simultaneously
git stash                 # temporary, error-prone

# Worktrees (multiple working directories)
.worktrees/sprint-1-abc123/  # feature-1 work
.worktrees/sprint-2-def456/  # feature-2 work
/                            # main branch (always clean)
```

### Technical Details

```bash
# What Claude does when you "Start sprint"
git worktree add .worktrees/sprint-1-abc123 -b feature/sprint-1-rate-limiting

# Working directory structure
project/
├── .git/                    # shared git repo
├── .worktrees/
│   ├── sprint-1-abc123/    # isolated workspace
│   │   ├── src/            # code changes here
│   │   ├── planning/
│   │   │   └── sprint-1-abc123/  # sprint artifacts
│   └── sprint-2-def456/    # different sprint
└── (main branch files)     # untouched

# After PR merge
git worktree remove .worktrees/sprint-1-abc123
# planning/ artifacts move to main repo
```

**Key insight**: Worktrees are just git directories. Nothing magic. But they enable fearless experimentation.

---

## Sprint Phases (Technical View)

```
┌─────────┐
│Planning │ implementation-plan.md created
└────┬────┘ User approves plan
     ↓
┌────────────┐
│In-Progress │ Code, commit, iterate
└─────┬──────┘ User says "Sprint complete"
      ↓
┌───────────┐
│Validating │ validate_deliverable.sh runs
└─────┬─────┘ Tests pass (or failures documented)
      ↓
┌──────────┐
│Verifying │ verification-report.md created
└─────┬────┘ All deliverables checked
      ↓
┌─────────┐
│Published│ PR created (gh pr create)
└─────┬───┘ PR URL logged to manifest
      ↓
┌────────┐
│Complete│ Artifacts archived
└────────┘ Ready for next sprint
```

### Phase Transitions

```yaml
# sprint-manifest.yaml tracks state
status: planning     # → in-progress (on approval)
status: in-progress  # → validating (on "Sprint complete")
status: validating   # → verifying (after validation)
status: verifying    # → published (after verification)
status: published    # → complete (after PR creation)
```

**For developers**: You can transition manually by editing the manifest, but Claude handles it automatically based on protocol rules.

---

## Validation: Real Tests, Real Scripts

### validate_deliverable.sh

Every sprint includes an **executable validation script**:

```bash
#!/usr/bin/env bash
# Example for Node.js project

set -e  # Exit on error

# Install dependencies
npm ci

# Build
npm run build

# Run tests
npm test

# Start local runtime (if applicable)
npm run local:start &
PID=$!
sleep 5

# Health check
curl -f http://localhost:3000/health || exit 1

# Shutdown
kill $PID

# Dry-run deployment
npm run deploy -- --dry-run

echo "✅ All validations passed"
```

**Key points**:
- Real executable script (not documentation)
- Runs full CI pipeline locally
- Must pass before sprint completion (or failures documented)
- Part of sprint artifacts (versioned with code)

**Vibe mode**: Validation can be simpler ("it works on my machine") but script must exist.

---

## Request Log: Complete Audit Trail

Every sprint has `request-log.md` that captures:

```markdown
## Request 1
**Timestamp**: 2026-08-13T12:00:00Z
**Prompt**: "Let's implement rate limiting with Redis"
**Interpretation**: User wants Redis-based rate limiting middleware

**Actions**:
- Created src/middleware/rate-limiter.ts
- Added redis dependency to package.json
- Updated app.ts to use rate limiter

**Code Changes**:
```diff
+ import rateLimit from './middleware/rate-limiter';
+ app.use(rateLimit);
```

**Reasoning**:
Redis chosen for:
- Distributed rate limiting across instances
- Fast in-memory operations
- TTL support for sliding windows
```

**Value**: Six months later, you can understand exactly why decisions were made.

---

## Traceability: Git + Sprint Artifacts

### Git Commits
```bash
git log --oneline feature/sprint-1-rate-limiting

a1b2c3d Add rate limiting middleware with Redis
4e5f6g7 Configure Redis connection with retry logic
8h9i0j1 Add rate limit tests with mock Redis

# Each commit message includes context and sprint reference
```

### Sprint Artifacts Link Back
```markdown
# implementation-plan.md

## Deliverables
- Rate limiting middleware (Redis-based)
  - Commit: a1b2c3d
  - File: src/middleware/rate-limiter.ts
  - Tests: tests/middleware/rate-limiter.test.ts
```

### Complete Traceability
```
Code Change → Git Commit → Request Log → Implementation Plan → Sprint Manifest
     ↓            ↓              ↓                ↓                    ↓
  What        When/Who        Why/How         Goal/Context        Metadata
```

---

## Planned vs Vibe Mode (Developer Examples)

### Planned Sprint: Production Feature
```yaml
Title: Implement OAuth2 authentication
Goal: Add Google/GitHub OAuth with session management

Deliverables:
  - OAuth provider integration
  - User session management
  - Token refresh logic
  - Security audit checklist
  - Integration tests
  - Documentation

Validation:
  - All tests pass
  - Security checklist completed
  - OAuth flow works end-to-end
```

**Workflow**: Detailed planning → Execute plan → Rigorous validation → Production-ready

---

### Vibe Sprint: Exploration
```yaml
Title: Explore WebGL particle systems
Goal: Try different particle effects and see what looks cool

Deliverables: (emerges during sprint)
  - Whatever looks cool
  - Notes on what worked
  - Demo that can be shown

Validation:
  - Demo runs without errors
  - Cool factor > 0
```

**Workflow**: Loose planning → Experiment freely → Document discoveries → Ship if good

---

### Vibe → Production Transition
```yaml
# Sprint starts as vibe
Title: Playing with Three.js shaders
Goal: See if we can make cool generative art

# Hours later...discovers something awesome
# Update plan mid-sprint:
Title: Generative art shader with controllable parameters
Goal: Polish the cool thing we found and make it production-ready

Deliverables:
  - Shader code (already written during exploration)
  - Parameter controls (add now)
  - Tests (add now)
  - Documentation (add now)
```

**Power move**: Capture exploration journey + ship polished result + have full documentation of how you got there.

---

## Advanced: Sprint Hooks

Sprints can trigger custom scripts at key points:

```yaml
# architecture.yaml
sprint:
  hooks:
    on-sprint-start: .sprint/hooks/on-start.sh
    on-sprint-complete: .sprint/hooks/on-complete.sh
    pre-validation: .sprint/hooks/pre-validate.sh
```

**Use cases**:
- Notify team on Slack when sprint starts
- Run custom linters before validation
- Update project management tools automatically
- Trigger deployments on sprint completion

**See**: `AGENTS.md` for full hook specification

---

## Best Practices for Developers

### 1. Keep Sprints Focused
```
✅ Good: "Add password reset flow"
❌ Too big: "Rebuild entire auth system"
❌ Too vague: "Improve the app"
```

**Rule of thumb**: 1-14 hours, one feature/experiment

---

### 2. Write Real Validation Scripts
```bash
# ❌ Bad (documentation only)
echo "Manual testing: check that X works"

# ✅ Good (executable verification)
npm test
curl -f http://localhost:3000/api/reset-password \
  -d '{"email":"test@example.com"}' \
  | jq -e '.success == true'
```

---

### 3. Use Vibe Mode for Exploration
```
✅ "Experiment with different caching strategies"
✅ "Try GraphQL vs REST for this use case"
✅ "Prototype real-time collaborative editing"
```

**Then**: Formalize the winner as a planned sprint with tests

---

### 4. Leverage Complete Traceability
```markdown
# When debugging 6 months later:
git log --grep="rate limit"
# → Find sprint-1-rate-limiting

# Read planning/sprint-1-rate-limiting/request-log.md
# → Understand every decision made
# → See what was tried and discarded
# → Recreate context instantly
```

---

## Integration with Existing Workflows

### CI/CD
```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: ./planning/sprint-*/validate_deliverable.sh
      # Sprint validation becomes your CI script
```

### Code Review
```markdown
# PR Description (auto-generated from sprint)

## Sprint: sprint-1-rate-limiting

## Goal
Implement Redis-based rate limiting middleware

## Implementation Plan
[Link to implementation-plan.md]

## Validation
✅ All tests pass
✅ Manual testing completed
✅ Security checklist reviewed

## Request Log
[Link to request-log.md for full context]
```

**Reviewers get**: Complete context without asking questions

---

## Technical Reference

### Key Files

| File | Purpose | Format |
|------|---------|--------|
| `sprint-manifest.yaml` | Sprint metadata | YAML |
| `implementation-plan.md` | What/why/how | Markdown |
| `request-log.md` | Complete audit trail | Markdown |
| `validate_deliverable.sh` | Automated validation | Bash |
| `verification-report.md` | Completion checklist | Markdown |
| `retro.md` | Lessons learned | Markdown |

### Git Integration

```bash
# Sprint artifacts in worktree during sprint
.worktrees/sprint-1-abc123/planning/sprint-1-abc123/

# After PR merge, artifacts in main repo
planning/active/sprint-1-abc123/

# After archival
planning/archive/2026/sprint-1-abc123/
```

### MCP Tools

```javascript
// Available MCP tools
start-sprint          // Initialize new sprint
update-sprint-status  // Change sprint phase
complete-sprint       // Finalize and create PR
check-sprint-status   // View current sprint
archive-sprint        // Move to archive
cleanup-sprint        // Remove worktree
```

**As a developer**: You can call these directly or let Claude handle them via natural language.

---

## Next Steps

### Start Sprinting
1. **[Quickstart](./QUICKSTART-DEVELOPERS.md)** - Get started in 5 minutes
2. **[First Planned Sprint](./03-first-sprint-planned.md)** *(Coming Soon)* - Complete walkthrough
3. **[First Vibe Sprint](./04-first-sprint-vibe.md)** *(Coming Soon)* - Exploratory workflow

### Deep Dive
- **[Full Protocol Spec (AGENTS.md)](../../../AGENTS.md)** - Complete technical specification
- **[Architecture](../../../architecture.yaml)** - System design decisions
- **[Examples](../../../examples/)** - Real sprint examples

### Contribute
- **[GitHub](https://github.com/cnavta/sprint-mcp)** - Source code and issues
- **[Contributing Guide](../../../CONTRIBUTING.md)** *(Coming Soon)* - How to contribute

---

## Summary for Developers

**Sprint Protocol** = Git worktrees + Structured workflow + LLM collaboration + Complete traceability

**Core technical concepts**:
- Worktrees: Isolated workspaces per sprint
- Manifests: YAML metadata tracking state
- Validation: Real executable scripts
- Request logs: Complete audit trail
- Traceability: Code ↔ commits ↔ logs ↔ plans ↔ manifest

**Developer-specific benefits**:
- Professional workflow + exploratory freedom
- CI/CD integration ready
- Code review context included
- Onboarding new devs takes minutes
- Debug with full historical context

**Start now**: `npm install -g sprint-mcp` → [Quickstart](./QUICKSTART-DEVELOPERS.md)

---

**Version**: 1.0
**Last Updated**: 2026-08-13
**Part of**: Sprint 23 - Tri-Audience NUX Implementation
