# Key Learnings - Sprint 15

**Sprint**: sprint-15-dq6cg7
**Title**: Worktree-Aware Tool Remediation
**Date**: 2026-08-07

---

## Executive Summary

Sprint 15 delivered critical learnings about architectural changes, test-driven validation, and user collaboration. The unified worktree model implementation succeeded through:
- User-driven problem reframing (tools → agent guidance)
- Comprehensive test coverage (342/342 passing)
- Grandfathering strategy for backward compatibility
- Proactive verification of deployment workflows
- Complete design for deferred work

---

## Technical Learnings

### 1. Index-Based Path Resolution Enables Model Flexibility

**Learning**: Using an index file (`sprint-index.yaml`) with `manifestPath` as single source of truth enables supporting multiple storage models simultaneously.

**Context**:
- Unified worktree model: `.worktrees/sprint-N/planning/sprint-N/sprint-manifest.yaml`
- Archive model: `planning/archive/2026/sprint-N/sprint-manifest.yaml`
- Flat model: `planning/sprint-N/sprint-manifest.yaml`

**Implementation**:
```typescript
// All tools use index-based resolution:
const index = await loadSprintIndex();
const sprintEntry = index.sprints.find((s) => s.id === sprintId);
const manifestPath = join(getProjectRoot(), sprintEntry.manifestPath);

// Works for ALL storage models transparently
```

**Application**:
- Use index-based resolution for any resource that can be in multiple locations
- Don't hardcode paths - use indirection via index/registry
- Enables migrations without breaking existing code
- Supports gradual rollout of new models

**Transferable**: ✅ Highly transferable
- Any system with resources in multiple locations
- Migration scenarios (old model → new model)
- Multi-tenant systems with different storage strategies

---

### 2. Git Worktrees Provide Complete Working Copy (Tracked Files Only)

**Learning**: Git worktrees contain ALL tracked files but NONE of the gitignored files. This is by design and actually beneficial.

**What's Present** in worktrees:
- ✅ All source code
- ✅ All configuration files (package.json, tsconfig.json, etc.)
- ✅ All IaC and deployment configs
- ✅ All documentation

**What's NOT Present**:
- ❌ node_modules/ (dependencies)
- ❌ dist/ (build artifacts)
- ❌ .env (environment files)

**Why This Is Good**:
- Isolated dependencies (no version conflicts between worktrees)
- Smaller disk footprint (no duplicate node_modules)
- Clean builds per worktree
- Explicit environment configuration per worktree

**Implication**:
- One-time setup needed: `npm ci` in each worktree
- Led to sprint hooks requirement for automation

**Application**:
- Design workflows assuming gitignored files absent
- Document one-time setup requirements
- Consider automation (hooks, scripts) for setup
- Don't try to share node_modules between worktrees

**Transferable**: ✅ Highly transferable
- Any project using git worktrees
- Monorepos with multiple worktrees
- CI/CD systems (always run fresh installs)

---

### 3. Test Infrastructure Must Model Complete Real-World Workflows

**Learning**: Integration tests should simulate the ENTIRE workflow, not just the happy path within isolated context.

**Problem**:
- Initial integration tests created sprints in worktrees
- Tests expected sprints in `planning/active/`
- Tests failed because workflow was incomplete

**Solution**: Added PR merge simulation
```typescript
// Integration test must model complete workflow:
// 1. Create sprint in worktree
const startResult = await startSprintTool({ ... });

// 2. Complete sprint
await completeSprintTool({ sprintId, ... });

// 3. Simulate PR merge (copy artifacts to main repo)
const activeSprintPath = join(testDir, 'planning', 'active', sprintId);
await cp(worktreeSprintPath, activeSprintPath, { recursive: true });

// 4. Remove worktree (post-merge cleanup)
await rm(join(testDir, '.worktrees', sprintId), { recursive: true });

// 5. Update index to reflect new location
await regenerateSprintIndexTool({});

// NOW archive/knowledge tools see sprint in expected location
```

**Application**:
- Integration tests validate end-to-end scenarios
- Include setup AND teardown in tests
- Model state transitions (active → merged → archived)
- Don't assume intermediate state persists

**Transferable**: ✅ Highly transferable
- Any workflow with multiple stages
- Testing CI/CD pipelines
- Database migration testing
- Deployment workflow validation

---

### 4. Grandfathering Strategies Enable Safe Architectural Changes

**Learning**: Supporting old and new models simultaneously during transition eliminates migration risk and breaking changes.

**Context**:
- Sprints 1-15: Split model (code in worktree, planning in main repo)
- Sprint 16+: Unified model (all in worktree)

**Strategy**:
1. Tools support BOTH models via index-based resolution
2. Old sprints never need migration
3. New sprints automatically use new model
4. Clear transition point (Sprint 16)

**Benefits**:
- ✅ Zero breaking changes
- ✅ No risky migrations
- ✅ Gradual rollout
- ✅ Easy rollback (just revert tools)

**Implementation Pattern**:
```typescript
// Index contains manifestPath for each sprint
const manifestPath = sprintEntry.manifestPath;

// Could be:
// - .worktrees/sprint-N/... (unified model)
// - planning/active/sprint-N/... (archive model)
// - planning/sprint-N/... (flat model)

// Tool doesn't care - just uses path from index
```

**Application**:
- Any architectural change affecting storage/structure
- API versioning (support v1 and v2 simultaneously)
- Database schema migrations
- File format changes

**Transferable**: ✅ Highly transferable
- Any system undergoing architectural evolution
- Microservices version migrations
- Data format migrations

---

### 5. Helper Functions Must Stay Synchronized With Storage Changes

**Learning**: When changing where resources are stored, ALL helper functions that enumerate/discover those resources must be updated.

**Problem**:
- Changed primary storage from `planning/` to `.worktrees/`
- Updated main tools (start-sprint, check-sprint-status)
- Forgot to update `getNextSprintNumber()` helper
- Result: Sprint numbering broke (always returned 1)

**Fix**: Updated helper to scan both locations
```typescript
async function getNextSprintNumber(): Promise<number> {
  const sprintNumbers: number[] = [];

  // Scan worktrees (new location)
  const worktreesDir = join(planningDir, '..', '.worktrees');
  // ... extract numbers from worktree sprints ...

  // Scan planning/ (old location, for backward compat)
  const planningDirs = await readdir(planningDir);
  // ... extract numbers from planning sprints ...

  return Math.max(0, ...sprintNumbers) + 1;
}
```

**Prevention Strategy**:
1. Before changing storage location, grep for all functions that enumerate resources
2. Update ALL discovery/enumeration functions
3. Test incrementing/sequencing behavior specifically
4. Consider extracting discovery logic to shared utility

**Application**:
- Resource enumeration functions (getAll*, list*, count*)
- ID/sequence generation functions
- Validation functions that check for duplicates
- Cleanup functions that scan for stale resources

**Transferable**: ✅ Highly transferable
- Any system with resource discovery
- Database migrations (update all queries)
- File system reorganizations
- API endpoint changes

---

### 6. JSDoc Comments Don't Support Wildcards In Paths

**Learning**: TypeScript JSDoc parser interprets `*` as comment block delimiters, not wildcards in paths.

**Problem**:
```typescript
/**
 * Scans directories:
 * 1. .worktrees/sprint-*/planning/sprint-*/  ← ERROR: closes comment
 */
```

**Error**: `Cannot find name 'planning'` (TypeScript thinks comment closed at first `*/`)

**Fix**: Use placeholder notation instead
```typescript
/**
 * Scans directories:
 * 1. .worktrees/sprint-N/planning/sprint-N/  ← Works
 */
```

**Application**:
- Use `-N`, `-X`, `{id}` in JSDoc instead of `*`
- Escape wildcards if necessary: `sprint-\*/`
- Test documentation compilation
- Consider using code blocks instead: `` `sprint-*/` ``

**Transferable**: ✅ Transferable to JSDoc documentation
- TypeScript projects
- JavaScript with JSDoc
- API documentation with path patterns

---

## Process Learnings

### 7. Validate Assumptions Before Implementing Solutions

**Learning**: An incorrect problem diagnosis leads to wrong solutions. Always validate assumptions with stakeholders.

**Context**:
- Initial audit concluded: "Tools are not worktree-aware"
- Proposed solution: Update all MCP tools to use worktree paths
- **User correction**: "The AGENT is not worktree-aware, tools are fine"

**Impact**:
- Would have implemented wrong solution (tool changes)
- Real solution was simpler (update agent guidance)
- Pivot led to better architecture (unified model)

**Better Approach**:
1. Complete analysis
2. **Before implementing**: Present findings to user with questions
3. "Here's what I found. Does this match your understanding?"
4. Wait for validation
5. Then implement

**Application**:
- Requirements analysis (confirm with stakeholders)
- Bug investigation (reproduce and confirm root cause)
- Architecture design (validate assumptions)
- Performance optimization (measure before optimizing)

**Transferable**: ✅ Universal principle
- All software development
- All problem-solving domains
- Any context with stakeholders

---

### 8. User Collaboration During Design Leads to Better Solutions

**Learning**: Involving users/stakeholders during design phase (not just requirements and review) produces simpler, better solutions.

**Sprint 15 Collaboration**:
1. **Initial proposal**: Audit tools, create remediation plan
2. **User insight**: Problem is agent guidance, not tools
3. **User suggestion**: "Could this be simplified by just having the agent always work within the worktree?"
4. **Collaborative refinement**: Unified worktree model design
5. **User approval**: "Approved, start the sprint"

**Outcome**:
- Simpler solution (update guidance vs update tools)
- Better architecture (unified model vs split model)
- User buy-in (involved in design)

**Pattern**:
1. Understand requirements
2. Analyze problem
3. **Involve user in design exploration** ← Key step
4. Propose solutions WITH user feedback
5. Implement approved design

**Application**:
- Architecture design reviews
- API design with consumers
- UI/UX design with users
- Performance optimization with stakeholders

**Transferable**: ✅ Universal principle
- Any project with stakeholders
- Open source (community involvement)
- Enterprise software (customer collaboration)

---

### 9. Deferrals With Complete Designs Maintain Momentum

**Learning**: Deferring work is acceptable IF you have a complete design, effort estimate, and prioritization.

**Context**: Sprint lifecycle hooks requirement
- **Discovered**: During deployment verification
- **Decision**: Defer to Sprint 16 (don't expand Sprint 15 scope)
- **Action**: Created complete design document with:
  - Problem statement
  - Proposed solution
  - Implementation plan
  - Examples for common stacks
  - Effort estimate (8 hours)
  - Priority (P0)

**Benefits**:
- ✅ Sprint 15 stayed focused
- ✅ Sprint 16 can start immediately (no re-analysis needed)
- ✅ User approved deferral (complete design gave confidence)
- ✅ No half-implemented features

**Anti-Pattern** (What NOT to do):
- ❌ "We'll need hooks someday" (vague)
- ❌ "TODO: Implement hooks" (no design)
- ❌ Add to backlog with no details (will be forgotten)

**Pattern** (Proper Deferral):
1. Discover requirement during sprint
2. Assess: Expand scope or defer?
3. If defer: Create complete design document
4. Estimate effort
5. Prioritize (P0, P1, P2)
6. Add to next sprint backlog with design reference
7. Continue current sprint

**Application**:
- Scope creep management
- Technical debt tracking
- Feature discovery during implementation
- Security findings during audit

**Transferable**: ✅ Highly transferable
- Agile sprint management
- Project planning
- Risk management

---

### 10. Proactive Verification Discovers Hidden Requirements

**Learning**: Don't wait for issues to surface in production. Proactively verify all use cases during implementation.

**Context**:
- Implemented unified worktree model
- User raised concern: "We need to be able to deploy to at least local and agent dev envs from within a worktree"
- Proactively investigated BEFORE user reported problems
- Created comprehensive verification document

**Verification Approach**:
1. **List all use cases**:
   - Development workflow (npm run dev)
   - Testing workflow (npm test)
   - Local deployment (npm run local)
   - Dev deployment (npm run deploy:dev)
   - Cloud deployment (gcloud builds submit)

2. **Verify each use case** in worktree context:
   - Does it work? ✅
   - What's required? (npm ci one-time)
   - Are there limitations? (no .env by default)

3. **Document findings**:
   - What works ✅
   - What needs setup ⚠️
   - Recommendations for improvement

4. **Identify follow-on requirements**:
   - Manual setup → Hooks requirement discovered

**Application**:
- Architecture changes (verify all use cases)
- Performance optimizations (verify all workloads)
- Security changes (verify all access patterns)
- API changes (verify all consumers)

**Transferable**: ✅ Highly transferable
- Any architectural change
- Library/framework migrations
- Infrastructure changes
- Breaking change analysis

---

## Agent Collaboration Learnings

### 11. Present Findings With Questions, Not Conclusions

**Learning**: When analyzing complex issues, present findings with clarifying questions rather than definitive conclusions.

**Anti-Pattern** (Sprint 15 Initial Audit):
```
CONCLUSION: No critical issues found. Tools are worktree-aware.
```

**Better Approach**:
```
FINDINGS:
- All MCP tools use SPRINT_ROOT environment variable
- SPRINT_ROOT resolves to correct worktree path
- Tools appear to be worktree-aware based on code analysis

QUESTIONS:
- Are agents actually experiencing worktree-related issues?
- If so, is the problem in tool behavior or agent guidance?
- Should we verify agent behavior in addition to tool code?
```

**Outcome**: User would have clarified problem earlier, preventing wrong direction.

**Pattern**:
1. Analyze thoroughly
2. Document findings (facts)
3. **Present with questions** (not conclusions)
4. Wait for user validation
5. Adjust based on feedback
6. Then propose solution

**Application**:
- Requirements analysis
- Bug investigation
- Code reviews
- Architecture audits

**Transferable**: ✅ Universal principle
- Any analysis task
- Consultant work
- Technical writing
- Troubleshooting

---

### 12. Test Failures Are Valuable Feedback, Not Obstacles

**Learning**: When tests fail after architectural changes, the failures reveal hidden dependencies and improve final solution.

**Context**: 24 tests failed after unified model implementation

**Initial Reaction** (Wrong):
- "Tests are broken, need to fix them quickly"
- View failures as obstacles to completion

**Better Reaction** (Right):
- "Tests reveal what I didn't consider"
- View failures as feedback about the design
- Analyze patterns in failures

**Insights From Failures**:
1. Path expectations hardcoded (revealed in 5 test files)
2. Sprint number increment logic missed (revealed in 1 test)
3. Integration tests missing PR merge simulation (revealed in 3 tests)

**Each failure** → **Improvement in design**:
- Updated path expectations → More robust tests
- Fixed sprint numbering → Better helper function
- Added PR merge simulation → Complete workflow validation

**Pattern**:
1. Make architectural change
2. Run tests
3. **Analyze failure patterns** (don't just fix)
4. What assumptions did failures reveal?
5. Update design based on learnings
6. Fix tests comprehensively

**Application**:
- Refactoring (tests guide safe changes)
- API redesign (breaking test → breaking change)
- Performance optimization (regression tests)
- Security hardening (penetration test failures)

**Transferable**: ✅ Highly transferable
- Test-driven development
- Continuous integration
- Quality assurance

---

## Architecture Learnings

### 13. Mental Model Simplicity Matters More Than Code Simplicity

**Learning**: The unified worktree model is simpler for USERS (agents/humans) even though it requires more TOOL complexity.

**Split Model** (Old):
- **Code**: Simple tool logic (planning always in `planning/`)
- **Mental Model**: Complex (where am I? main or worktree?)
- **Workflow**: Context switching required

**Unified Model** (New):
- **Code**: More complex (tools must handle both locations during transition)
- **Mental Model**: Simple (always work in worktree)
- **Workflow**: Stay in one place

**Tradeoff**: Accept code complexity to gain mental model simplicity

**Why This Matters**:
- Agents make fewer mistakes with simpler mental models
- Humans onboard faster with clear workflows
- Documentation is easier to write and follow
- Debugging is easier (fewer places to look)

**Pattern**: Optimize for USER simplicity, not CODE simplicity
- Even if it means more tool complexity
- Even if it means backward compatibility layers
- Even if it means gradual migrations

**Application**:
- API design (simple for consumers, complex for server)
- CLI tools (simple commands, complex implementation)
- Frameworks (simple for app developers, complex internally)

**Transferable**: ✅ Universal design principle
- User interface design
- API design
- Developer experience (DX)

---

## Summary

### Top 3 Transferable Learnings

1. **Index-Based Path Resolution** → Enables flexible storage models without breaking existing code
2. **Grandfathering Strategies** → Safe architectural changes with zero migration risk
3. **User Collaboration During Design** → Better solutions through stakeholder involvement

### Top 3 Project-Specific Learnings

1. **Git Worktrees Contain All Tracked Files** → One-time setup needed, led to hooks requirement
2. **Integration Tests Must Model Complete Workflow** → Added PR merge simulation
3. **Helper Functions Must Stay Synchronized** → Update all enumeration functions when changing storage

### Top 3 Process Learnings

1. **Validate Assumptions Before Implementing** → Prevented wrong solution
2. **Deferrals With Complete Designs** → Maintain momentum, enable future sprints
3. **Proactive Verification Discovers Requirements** → Found hooks need before production

---

**Documented by**: Lead Implementor
**Date**: 2026-08-07
**Sprint Protocol Version**: 2.4
