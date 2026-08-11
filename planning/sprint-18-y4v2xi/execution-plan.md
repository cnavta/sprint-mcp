# Execution Plan – sprint-18-y4v2xi

## Objective

Optimize sprint-mcp MCP tool responses to improve LLM agent navigation of the Sprint Protocol by implementing protocol citations, enhanced next-step guidance, and standardized messaging patterns identified in the Technical Architecture analysis.

**Success Criteria**: All 8 MCP tools provide consistent protocol citations, clear next-step guidance, and improved error recovery messaging, enabling agents to autonomously navigate sprint lifecycle phases with minimal ambiguity.

---

## Scope

### In Scope

**Phase 1: Foundation (High-Priority Quick Wins)**
- Add protocol rule/section citations to all 8 tools (S-rules, §-sections)
- Standardize hook failure recovery messaging across all tools with hooks
- Add backlog.yaml reminders to execution-phase tools (update-sprint-status)
- Optimize configuration diagnostics visibility in check-sprint-status

**Phase 2: Enhanced Guidance (High-Priority Medium Effort)**
- Add protocol phase context and next-step guidance to update-sprint-status
- Add archive workflow context to complete-sprint
- Improve validation error remediation guidance in regenerate-sprint-index
- Add actionable cleanup guidance to check-sprint-status (orphaned worktrees)

**Phase 3: Architectural Foundation**
- Create Response Composer utility for standardized response formatting
- Create Protocol Phase mapping data structure
- Create standardized hook failure message templates

**Phase 4: Testing and Validation**
- Create response format validation tests
- Update integration tests for new response formats
- Create response snapshot tests to prevent regression

### Out of Scope

**Deferred to Future Sprints:**
- Full tiered response detail system (minimal/standard/detailed modes) - requires adaptive detection logic
- Knowledge base integration into check-sprint-status and start-sprint - requires knowledge base query system
- Protocol Phase State Machine with automatic gate tracking - requires state management system
- Validation Rule Registry - requires rule engine architecture
- Guidance Level system with user preference detection
- Multi-language/localization support

**Explicitly Excluded:**
- Changes to Sprint Protocol (AGENTS-uncompressed.md) - protocol is stable
- Changes to tool functionality/behavior - only response messages
- Changes to MCP tool interfaces/parameters
- Performance optimizations unrelated to response clarity

---

## Deliverables

### Code Changes

1. **Response Composer Utility** (`src/common/response-composer.ts`)
   - ProtocolCitation interface and formatting
   - NextAction interface and formatting
   - ProtocolPhase interface and formatting
   - Standardized section rendering (title, details, warnings, errors, next actions)

2. **Protocol Phase Mapping** (`src/common/protocol-phase-map.ts`)
   - Phase definitions with sections, gates, and next phases
   - Phase transition validation
   - Next-action generation based on current phase

3. **Hook Failure Templates** (`src/common/hook-message-templates.ts`)
   - Blocking hook failure template (PRE phase)
   - Non-blocking hook failure template (POST phase)
   - Hook debugging guidance template
   - Hook location and examples references

4. **Tool Response Updates** (8 files)
   - `src/tools/check-sprint-status.ts` - Protocol citations, optimized diagnostics, cleanup guidance
   - `src/tools/start-sprint.ts` - Condensed worktree guidance, protocol phase context
   - `src/tools/update-sprint-status.ts` - Protocol phase context, next-step guidance, backlog reminders
   - `src/tools/complete-sprint.ts` - Archive workflow context, learning artifacts purpose
   - `src/tools/cleanup-sprint.ts` - Lifecycle context, hook failure recovery
   - `src/tools/archive-sprint.ts` - Knowledge base purpose, archive strategy guidance
   - `src/tools/auto-archive-sprints.ts` - Criteria clarity, knowledge aggregation summary
   - `src/tools/regenerate-sprint-index.ts` - Recovery scenario guidance, validation remediation

### Tests

1. **Response Format Tests** (`src/tools/__tests__/response-format.test.ts`)
   - Protocol citation presence validation
   - Next-step guidance presence validation
   - Hook failure message format validation
   - Required sections presence validation

2. **Response Snapshot Tests** (`src/tools/__tests__/response-snapshots.test.ts`)
   - Snapshot tests for all 8 tools (success cases)
   - Snapshot tests for error cases
   - Snapshot tests for hook failure cases

3. **Integration Test Updates**
   - Update existing integration tests for new response formats
   - Verify protocol citations in responses
   - Verify next-step guidance in responses

### Documentation

1. **Response Format Guide** (`documentation/response-format-guide.md`)
   - Standard response structure documentation
   - Protocol citation format examples
   - Next-action format examples
   - Hook failure message examples
   - Token efficiency guidelines

2. **Protocol Phase Reference** (`documentation/protocol-phase-reference.md`)
   - Phase mapping documentation
   - Gate definitions
   - Transition rules
   - Agent guidance per phase

3. **Updated CHANGELOG.md**
   - Document response format improvements
   - Note breaking changes (if any)
   - Provide migration guidance for consumers

---

## Acceptance Criteria

### AC-1: Protocol Citations
- ✅ All 8 tools include at least one protocol rule or section reference in responses
- ✅ Protocol citations use standardized format: "**Sprint Protocol Rule S3**: [description]" or "**Protocol §2.9**: [description]"
- ✅ Citations are contextually appropriate (e.g., S3 in check-sprint-status, S2/§2.9 in complete-sprint)
- ✅ Citations explain which rules/gates are satisfied or required

### AC-2: Next-Step Guidance
- ✅ update-sprint-status provides numbered next-step guidance for each status transition
- ✅ check-sprint-status provides actionable cleanup guidance for orphaned worktrees
- ✅ complete-sprint includes archive workflow context
- ✅ regenerate-sprint-index includes recovery scenario guidance
- ✅ All next-step guidance is specific and actionable (not generic)

### AC-3: Hook Failure Recovery
- ✅ All tools with hooks (6 tools) use standardized hook failure messages
- ✅ Blocking hook failures (PRE phase) include clear "Why This Blocked" section
- ✅ Non-blocking hook failures (POST phase) indicate non-blocking status
- ✅ All hook failures include debugging guidance with test commands
- ✅ Hook failures reference hook location (.sprint-hooks/) and protocol section (§2.2.2)

### AC-4: Backlog Integration
- ✅ update-sprint-status includes backlog reminder when transitioning to in-progress
- ✅ start-sprint mentions backlog.yaml as required planning artifact
- ✅ complete-sprint validates backlog reconciliation in verification-report.md

### AC-5: Response Composer
- ✅ Response Composer utility created with TypeScript interfaces
- ✅ At least 3 tools migrated to use Response Composer
- ✅ Response Composer supports protocol citations, next actions, and phase context
- ✅ Token efficiency maintained or improved (no significant increase)

### AC-6: Testing
- ✅ Response format tests created and passing
- ✅ Integration tests updated for new response formats
- ✅ All tests pass: `npm test`
- ✅ Test coverage maintained: >= 80% lines

### AC-7: Documentation
- ✅ Response format guide created
- ✅ Protocol phase reference created
- ✅ CHANGELOG.md updated
- ✅ All documentation uses markdown format with examples

---

## Testing Strategy

### Unit Tests

**Response Composer Tests** (`src/common/__tests__/response-composer.test.ts`)
- Protocol citation formatting
- Next-action formatting (numbered lists, required indicators)
- Phase context formatting
- Section composition (combining multiple sections)

**Protocol Phase Map Tests** (`src/common/__tests__/protocol-phase-map.test.ts`)
- Phase lookup by status
- Gate enumeration per phase
- Phase transition validation
- Next-action generation

**Hook Message Template Tests** (`src/common/__tests__/hook-message-templates.test.ts`)
- Blocking hook failure message format
- Non-blocking hook failure message format
- Debugging guidance completeness

### Integration Tests

**Tool Response Tests** (`src/tools/__tests__/*.test.ts`)
- All existing integration tests updated
- New tests for protocol citations presence
- New tests for next-step guidance presence
- New tests for hook failure message format

**Response Format Validation Tests** (`src/tools/__tests__/response-format.test.ts`)
- Validate all tools return expected sections
- Validate protocol citations are contextually appropriate
- Validate next-step guidance is specific and actionable

**Snapshot Tests** (`src/tools/__tests__/response-snapshots.test.ts`)
- Snapshot success responses for all 8 tools
- Snapshot error responses for all 8 tools
- Snapshot hook failure responses for 6 tools with hooks
- Prevent unintended response format changes

### Manual Testing

**Agent Simulation Testing**
- Run through complete sprint lifecycle with new responses
- Verify agent can parse and act on next-step guidance
- Verify protocol citations aid agent understanding
- Verify hook failure recovery guidance is actionable

**Token Efficiency Testing**
- Measure token count for responses before/after changes
- Target: no more than 10% increase in standard success cases
- Document token savings in optimized diagnostics scenarios

---

## Deployment Approach

This is an npm package (MCP server), not a deployed service. Deployment means publishing to registry.

### Build Validation

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run all tests
npm test

# Run linter
npm run lint

# Dry-run package
npm pack
tar -tzf sprint-mcp-*.tgz  # Verify contents
```

### Local Testing

```bash
# Test with local MCP client
# (Using Claude Code or other MCP client pointed to local build)
npm run build
# Configure MCP client to use local dist/index.js
# Run sprint lifecycle test
```

### Release Process

Per Sprint Protocol, release is human-owned. This sprint will:
- Prepare release evidence
- Create PR with changes
- Document version bump recommendation (likely minor: 0.1.0 → 0.2.0 for response format improvements)
- **NOT** execute actual release (human responsibility)

---

## Completion Handoff and PR Policy

### Branch and Push Behavior

Per §2.8, this sprint will:
- Use feature branch: `feature/sprint-18-y4v2xi-mcp-tool-response-optimization`
- Commit after each coherent work unit (§2.5.1)
- Push branch when validation, verification, and completion artifacts are ready

### Pull Request

**PR Ownership**: LLM (explicitly assigned by user at sprint start)

**PR Creation**: After completion artifacts validated and approved
- Title: "Sprint 18 Deliverables – MCP Tool Response Optimization"
- Body: Summary of changes, testing performed, protocol compliance

**PR Contents**:
- Code changes (Response Composer, Protocol Phase Map, 8 tool updates)
- Test changes (new tests, updated integration tests)
- Documentation changes (response guide, phase reference, changelog)
- Planning artifacts (this execution plan, backlog, verification report, retro, learnings)

### Completion Criteria

Sprint ready for handoff when:
- All acceptance criteria satisfied
- validate_deliverable.sh passes
- verification-report.md reconciles backlog
- retro.md and key-learnings.md created
- User says "Sprint complete"

---

## Release Decision

**Release Timing**: Not part of this sprint

**Release Recommendation**: Minor version bump (0.1.0 → 0.2.0)
- Response format changes are non-breaking (additive)
- Tool interfaces unchanged (MCP tool parameters same)
- Existing consumers will see enhanced responses but no breaking behavior

**Release Evidence Prepared**:
- CHANGELOG.md updated with response format improvements
- Version bumped in package.json and architecture.yaml
- Dry-run deployment tested

**Release Execution**: Human-only per §2.8 and Law #6

---

## Dependencies

### External Dependencies (from architecture.yaml)

Runtime:
- `@modelcontextprotocol/sdk`: ^1.0.0 (no changes required)

Dev:
- `typescript`: ^5.3.0
- `jest`: ^29.7.0
- `ts-jest`: ^29.1.0
- All existing dev dependencies (no new dependencies added)

### Internal Dependencies

- Sprint Protocol (AGENTS-uncompressed.md) - stable, no changes
- architecture.yaml - stable, no changes
- Existing MCP tool implementations - modified for response format only
- Git worktree model - stable, no changes

### External Systems

- None (this is a local npm package)

### Credentials/Secrets

- None required (no external service integration)

---

## Definition of Done

This sprint follows the project-wide Definition of Done from CLAUDE.md:

### ✅ Code Quality
- Adheres to architecture.yaml constraints ✓
- No TODOs or placeholder logic in production paths ✓
- TypeScript types for all interfaces ✓
- kebab-case filenames, PascalCase classes, camelCase functions ✓

### ✅ Testing
- Tests for all new behavior (Response Composer, Protocol Phase Map) ✓
- Mocks for external dependencies (none required) ✓
- `npm test` must pass ✓
- Test coverage >= 80% lines ✓

### ✅ Deployment Artifacts
- N/A (npm package, not deployed service)
- Package builds successfully ✓
- Package contents validated with `npm pack` ✓

### ✅ Documentation
- Response format guide created ✓
- Protocol phase reference created ✓
- CHANGELOG.md updated ✓
- Code comments for complex logic ✓
- LLM hints where beneficial ✓

### ✅ Traceability
- All code changes trace to backlog items ✓
- All backlog items trace to sprint goal ✓
- All commits reference backlog IDs in messages ✓
- request-log.md documents all meaningful actions ✓

### ✅ Sprint Protocol Compliance
- execution-plan.md approved by user ✓
- backlog.yaml maintained throughout sprint ✓
- validate_deliverable.sh real and executable ✓
- verification-report.md reconciles backlog ✓
- retro.md and key-learnings.md created ✓
- Feature branch pushed ✓
- PR created (if approved in plan) ✓

---

## Risk Assessment

### Technical Risks

**Risk**: Response format changes break existing consumers
- **Mitigation**: Changes are additive only, no removal of existing fields
- **Validation**: Snapshot tests ensure existing response structure preserved

**Risk**: Token count significantly increases
- **Mitigation**: Target 10% max increase, optimize diagnostics visibility
- **Validation**: Manual token count comparison before/after

**Risk**: Response Composer introduces new bugs
- **Mitigation**: Gradual migration (3 tools first), comprehensive tests
- **Validation**: All integration tests must pass

### Process Risks

**Risk**: Scope creep into architectural changes (tiered responses, state machine)
- **Mitigation**: Strict adherence to in-scope deliverables, defer others
- **Validation**: Backlog items map to in-scope work only

**Risk**: Testing takes longer than expected
- **Mitigation**: Prioritize critical paths, defer snapshot tests if needed
- **Validation**: Core functionality tests mandatory, snapshots stretch goal

### Dependency Risks

**Risk**: None identified (no external dependencies or services)

---

## Success Metrics

### Quantitative Metrics

1. **Protocol Citation Coverage**: 8/8 tools (100%)
2. **Next-Step Guidance Coverage**: 8/8 tools (100%)
3. **Hook Failure Standardization**: 6/6 tools with hooks (100%)
4. **Test Coverage**: >= 80% lines (maintained or improved)
5. **Token Efficiency**: <= 10% increase in standard success cases

### Qualitative Metrics

1. **Agent Clarity**: Responses clearly indicate protocol phase and next gates
2. **Error Recovery**: Hook failures provide actionable debugging guidance
3. **Consistency**: All tools follow same response structure pattern
4. **Documentation**: Response format guide enables future tool developers

---

## Timeline Estimate

**Total Effort**: 3-4 focused work sessions

- **Phase 1** (Foundation): 1 session - Protocol citations, hook templates, backlog reminders
- **Phase 2** (Enhanced Guidance): 1 session - Next-step guidance, archive context, validation remediation
- **Phase 3** (Architectural): 1 session - Response Composer, Protocol Phase Map
- **Phase 4** (Testing): 1 session - Tests, validation, documentation

**Flexible Ordering**: Phase 3 (architectural) can be done first to establish foundation

---

## Notes

- This sprint focuses on **response message quality**, not tool functionality
- All changes are **backward compatible** (additive response enhancements)
- Response Composer is **foundation for future optimizations** (tiered responses, localization)
- Protocol Phase Map enables **future State Machine implementation**
- **No protocol changes** - AGENTS-uncompressed.md remains stable

---

**Approval Gate**: This execution plan requires explicit user approval before implementation begins (Sprint Protocol §2.4).

After approval, backlog.yaml will be finalized and implementation will commence.
