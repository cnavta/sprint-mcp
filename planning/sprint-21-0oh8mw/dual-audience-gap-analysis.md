# Dual-Audience Gap Analysis
**Sprint**: sprint-21-0oh8mw
**Date**: 2026-08-11
**Author**: Claude (Lead Technical Writer)
**Status**: Critical Addition to NUX Analysis

---

## Executive Summary

The original New User Experience Analysis focused exclusively on **human users** adopting sprint-mcp. However, sprint-mcp operates as an MCP server with a **dual-audience architecture**:

1. **Human users** who install, configure, and direct sprint operations
2. **LLM agents** who invoke MCP tools and execute Sprint Protocol

**Critical Finding**: The analysis and execution plan address human onboarding comprehensively but do **not evaluate or improve the LLM agent experience**. This is a significant gap, as LLM agents are the primary interface to sprint-mcp functionality.

---

## System Architecture Reality

### Actual User Flow

```
HUMAN USER
  ↓ "Start a sprint to add user authentication"
  │
CLAUDE DESKTOP (LLM Agent)
  ↓ Interprets request
  ↓ Determines appropriate MCP tool
  ↓ Invokes: start-sprint(title, goal, owner)
  │
sprint-mcp MCP SERVER
  ↓ Executes sprint creation
  ↓ Creates worktree, manifest, planning artifacts
  ↓ Returns result
  │
CLAUDE DESKTOP
  ↓ Interprets MCP tool response
  ↓ Presents to human
  │
HUMAN USER
  ← "Sprint sprint-22-abc123 created successfully..."
```

### Two Distinct "New Users"

| Audience | New User Question | Documentation Need |
|----------|------------------|-------------------|
| **Human** | "How do I install and use sprint-mcp?" | Installation guides, tutorials, getting started |
| **LLM Agent** | "What can I do with these MCP tools?" | Tool descriptions, usage patterns, protocol rules |

---

## What Currently Exists

### For Human Users (Partially Addressed)

**Existing**:
- README.md (overview, installation)
- documentation/claude-desktop-installation-guide.md (installation)
- CHANGELOG.md (version history)

**Missing** (identified in NUX analysis):
- QUICKSTART.md
- Project setup guide
- First sprint tutorial
- Sprint Protocol primer
- Troubleshooting guides

### For LLM Agents (Not Analyzed)

**Existing**:
1. **CLAUDE.md** - Guidance for Claude Code when working in sprint-mcp projects
   - Sprint Protocol overview
   - Sprint control rules (S1-S14)
   - Development commands
   - Definition of done
   - **Purpose**: Guides LLMs operating within a project using sprint-mcp
   - **Scope**: Project-level behavior, not MCP tool usage

2. **AGENTS.md / AGENTS-uncompressed.md** - Sprint Protocol specification
   - Complete protocol definition
   - All phases documented
   - Rules and requirements
   - **Purpose**: Reference for understanding Sprint Protocol
   - **Scope**: Protocol specification, not tool-specific guidance

3. **MCP Tool Descriptions** (in src/index.ts)
   - Tool name and description
   - Input schema (parameters)
   - **Purpose**: Tells LLM what each tool does
   - **Scope**: Basic tool interface

4. **MCP Tool Responses** (from tool implementations)
   - Success/failure messages
   - Next steps guidance
   - **Purpose**: Feedback after tool invocation
   - **Scope**: Post-execution guidance

**What's Missing for LLM Agents**:
- How to choose between tools
- When to invoke which tools
- Common usage patterns
- Tool invocation examples
- Error handling guidance
- Tool interaction patterns (sequencing)
- Protocol-to-tool mapping

---

## Gap Analysis: LLM Agent Experience

### Gap 1: Tool Selection Guidance ❌

**Problem**: LLM receives multiple tools but limited guidance on when to use each.

**Current State**:
- `start-sprint`: "Initialize a new sprint with manifest and directory structure"
- `check-sprint-status`: "Verify current sprint state and check for active sprints"
- `update-sprint-status`: "Atomically update sprint status in both manifest and index"
- `complete-sprint`: "Complete a sprint by validating artifacts"
- etc.

**What's Missing**:
- When to check status before starting
- How to choose between `update-sprint-status` and `complete-sprint`
- What to do if user says "start sprint" but one is already active
- Decision trees for tool selection

**Impact**: LLM may invoke wrong tools or miss necessary tools

### Gap 2: Usage Pattern Examples ❌

**Problem**: No examples of tool invocation sequences

**What's Missing**:
- Example: Complete sprint workflow
  ```
  1. check-sprint-status (verify none active)
  2. start-sprint (initialize)
  3. [user does work]
  4. complete-sprint (with validation)
  ```
- Example: Troubleshooting workflow
  ```
  1. check-sprint-status (identify issue)
  2. regenerate-sprint-index (if corrupted)
  3. verify resolution
  ```

**Impact**: LLM may use tools in isolation rather than effective sequences

### Gap 3: Parameter Guidance ❌

**Problem**: Tool schemas define what parameters exist, but not how to populate them well

**Current State**:
```typescript
{
  title: { type: 'string', description: 'Concise sprint title' }
  goal: { type: 'string', description: 'Clear sprint objective' }
  owner: { type: 'string', description: 'GitHub handle or name' }
}
```

**What's Missing**:
- Examples of good vs. bad titles
  - Good: "User Authentication System"
  - Bad: "Add stuff"
- Goal formatting guidance
  - Should be specific and measurable
  - Include success criteria
- Owner format examples
  - "@username" or "Full Name"

**Impact**: LLM may generate poor-quality sprint metadata

### Gap 4: Error Interpretation ❌

**Problem**: Tool errors exist but LLM may not know how to handle them

**What's Missing**:
- Common errors and their meanings
- Recovery procedures
- When to ask user vs. retry vs. use different tool
- Error severity (critical vs. warning)

**Impact**: LLM may fail to recover from errors gracefully

### Gap 5: Sprint Protocol Integration ❌

**Problem**: LLM has separate Protocol docs and Tool docs, unclear how they connect

**Current Disconnect**:
- AGENTS.md: "§2.4 Sprint Planning Phase - Create implementation plan"
- MCP Tools: Multiple tools exist but no clear protocol phase mapping

**What's Missing**:
- Tool-to-protocol-phase mapping
  - "During Planning (§2.4), use these tools: ..."
  - "During Validation (§2.7), use these tools: ..."
- Protocol requirements for each tool
  - "Before invoking start-sprint, verify S3 (only one active sprint)"
- Phase transition guidance
  - "After Planning phase approved, update status to 'in-progress'"

**Impact**: LLM may not follow Sprint Protocol correctly when using tools

### Gap 6: Contextual Help in Responses ❌

**Problem**: Tool responses are informational but don't guide next actions

**Current State**:
```
✅ Sprint sprint-22-abc123 initialized successfully!
[Technical details about what was created]
```

**What's Missing**:
```
✅ Sprint sprint-22-abc123 initialized successfully!
[Technical details]

Next steps:
1. Create implementation-plan.md in planning/sprint-22-abc123/
2. Get user approval for the plan
3. Update status to 'in-progress' when approved
4. Begin implementation work

Need help? See documentation/guides/sprint-workflow.md
```

**Impact**: LLM doesn't know what to do after successful tool invocation

---

## Current vs. Ideal LLM Experience

### Current LLM Agent Experience

**Scenario**: User says "Start a new sprint"

```
LLM Thought Process:
1. I have a tool called "start-sprint"
2. It needs title, goal, owner
3. Let me invoke it with parameters from user's request
4. [Tool succeeds]
5. Tell user it worked
```

**Problems**:
- Didn't check if sprint already active (violates S3)
- May have used poor sprint title/goal
- Doesn't know what to do next
- Doesn't guide user on next steps

### Ideal LLM Agent Experience

**Scenario**: User says "Start a new sprint"

```
LLM Thought Process:
1. Sprint Protocol Rule S3: Only one active sprint at a time
2. First, invoke check-sprint-status to verify
3. [Status check: no active sprints ✓]
4. Now safe to invoke start-sprint
5. Need good parameters:
   - Title: From user request, keep concise
   - Goal: Should be specific, include success criteria
   - Owner: User's name/handle
6. [Tool succeeds]
7. Tool response says "Next: Create implementation plan"
8. Guide user: "Sprint created! Next, I'll create an implementation plan..."
```

**Improvements**:
- Follows protocol rules (S3)
- Checks prerequisites
- Generates quality metadata
- Knows next steps
- Guides user proactively

---

## Existing Assets (Partially Address This)

### CLAUDE.md Provides:

✅ Sprint Protocol overview
✅ Sprint control rules (S1-S14)
✅ Sprint phase structure
✅ Definition of done
✅ Git and publication rules

**But**: Focused on LLMs working IN projects, not on how to USE MCP tools

### architecture.yaml Provides:

✅ `mcp_tools` section with protocol phase mapping
✅ Tool-to-protocol phase references (§2.4, §2.7, etc.)
✅ Lifecycle hooks

**But**: This is system architecture, not usage guidance

### MCP SDK Provides:

✅ Tool descriptions
✅ Parameter schemas
✅ Type safety

**But**: Generic interface, not sprint-specific guidance

---

## Recommendations: Bridging the LLM Gap

### Critical: LLM Usage Guide

**Problem**: No documentation specifically for how LLMs should use MCP tools

**Solution**: Create `LLM-USAGE-GUIDE.md`

**Contents**:
1. **Tool Overview**
   - What each tool does
   - When to use each tool
   - Required vs. optional tools

2. **Usage Patterns**
   - Complete sprint lifecycle (tool sequence)
   - Troubleshooting workflows
   - Error recovery patterns

3. **Tool Selection Decision Trees**
   - User says "start sprint" → [decision tree]
   - User says "complete sprint" → [decision tree]
   - Error encountered → [decision tree]

4. **Parameter Best Practices**
   - How to generate good sprint titles
   - How to write clear goals
   - How to format owners

5. **Protocol Integration**
   - Tool-to-phase mapping
   - Protocol rules to check before each tool
   - Phase transition procedures

6. **Error Handling**
   - Common errors and meanings
   - Recovery procedures
   - When to ask user for help

7. **Response Interpretation**
   - What to do with tool outputs
   - How to present results to users
   - Next-step guidance

**Deliverable**: `LLM-USAGE-GUIDE.md` (or integrate into CLAUDE.md)
**Effort**: Medium (6-8 hours)
**Priority**: P1 - Critical for LLM effectiveness

### High: Enhanced MCP Tool Descriptions

**Problem**: Tool descriptions are minimal

**Solution**: Expand MCP tool descriptions

**Example Enhancement**:

**Current**:
```typescript
{
  name: 'start-sprint',
  description: 'Initialize a new sprint with manifest and directory structure'
}
```

**Enhanced**:
```typescript
{
  name: 'start-sprint',
  description: `Initialize a new sprint with manifest and directory structure.

PREREQUISITES:
- Verify no active sprint exists (use check-sprint-status first)
- User has explicitly requested sprint start (Protocol Rule S1)

PROTOCOL PHASE: §2.4 Sprint Initiation

CREATES:
- Git worktree at .worktrees/sprint-{id}/
- Sprint manifest
- Feature branch
- Planning directory

NEXT STEPS: After success, guide user to create implementation-plan.md

See: LLM-USAGE-GUIDE.md for complete workflow`
}
```

**Effort**: Medium (4-6 hours across all tools)
**Priority**: P2 - Improves but not critical

### High: Tool Response Templates with Guidance

**Problem**: Tool responses don't guide next actions

**Solution**: Enhance tool responses with contextual next steps

**Implementation**: Add to response-composer or tool implementations

**Effort**: Medium (addressed partially in Phase 2 of execution plan: P2-T14, P2-T15)
**Priority**: P2 - Already in backlog

### Medium: Protocol-to-Tool Quick Reference

**Problem**: Hard to know which tools support which protocol phases

**Solution**: Create quick reference table

**Example**:
```markdown
| Protocol Phase | Primary Tools | Optional Tools |
|---------------|---------------|----------------|
| §2.4 Initiation | start-sprint | check-sprint-status |
| §2.5 Planning | (user work) | - |
| §2.6 Execution | update-sprint-status | - |
| §2.7 Validation | (validation script) | - |
| §2.8 Verification | (user work) | - |
| §2.9 Publication | complete-sprint | cleanup-sprint |
| §2.10 Retrospective | (user work) | - |
```

**Location**: LLM-USAGE-GUIDE.md or CLAUDE.md
**Effort**: Small (2 hours)
**Priority**: P2 - Nice to have

---

## Integration with Existing Execution Plan

### How This Affects Phase 1 (Critical Foundations)

**Additional Task Needed**:
- **P1-T17**: Create LLM Usage Guide
  - Effort: M (6-8 hours)
  - Priority: P1-critical
  - Deliverable: `LLM-USAGE-GUIDE.md` or enhanced `CLAUDE.md`
  - Acceptance Criteria:
    - Tool selection guidance clear
    - Usage patterns documented
    - Protocol integration explained
    - Error handling covered
    - Reviewed by LLM agent testing

### How This Affects Phase 2 (Enhanced Onboarding)

**Existing Tasks Already Address**:
- ✅ P2-T14: Enhanced tool responses design (partial solution)
- ✅ P2-T15: Enhanced tool responses implementation (partial solution)

**Additional Enhancements**:
- Expand P2-T14 to include LLM next-step guidance
- Add LLM testing to P2-T15 acceptance criteria

### Testing Methodology

**LLM Agent Testing** (not in original plan):
1. Test with fresh Claude instance (no project knowledge)
2. Give various user prompts
3. Observe which tools LLM invokes
4. Check if LLM follows Protocol correctly
5. Verify LLM recovers from errors
6. Measure quality of LLM-generated sprint metadata

**Success Criteria**:
- LLM follows S1-S14 without human reminders
- LLM invokes correct tools in correct sequence
- LLM generates quality sprint metadata
- LLM guides human through sprint process
- LLM recovers gracefully from errors

---

## Revised User Personas

### Persona 1: Human - Curious Developer
**Profile**: Saw sprint-mcp on npm, wants to try it
**Goal**: Understand what this does and if it's worth their time
**Timeline**: 5-15 minutes
**Needs**: Quick value prop, quickstart, working example
**Current experience**: ❌ Gets lost in technical docs, abandons

### Persona 2: Human - LLM Power User
**Profile**: Uses Claude heavily, wants structure
**Goal**: Adopt Sprint Protocol for current projects
**Timeline**: 1-2 hours
**Needs**: Getting started, project setup, first sprint guide
**Current experience**: ⚠️ Installs but struggles with first sprint

### Persona 3: Human - Team Lead
**Profile**: Evaluating for team adoption
**Goal**: Understand if this fits team workflow
**Timeline**: 30-60 minutes
**Needs**: Value prop, methodology explanation, success stories
**Current experience**: ⚠️ Understands concept but unclear on implementation

### Persona 4: Human - Contributor
**Profile**: Wants to extend or contribute
**Goal**: Understand architecture, add features
**Timeline**: Ongoing
**Needs**: Architecture docs, extension points, contribution guide
**Current experience**: ✅ Current docs adequate

### Persona 5: LLM Agent - Sprint Operator ⭐ NEW
**Profile**: Claude Desktop instance helping user with sprint work
**Goal**: Effectively use sprint-mcp tools to help user execute Sprint Protocol
**Timeline**: Ongoing (entire sprint lifecycle)
**Needs**:
- Tool selection guidance
- Usage patterns and sequences
- Protocol compliance rules
- Error handling procedures
- Next-step guidance
**Current experience**: ⚠️ Has tools but limited usage guidance

---

## Recommendations Summary

### Must Add to Phase 1

| Task | Deliverable | Effort | Priority |
|------|-------------|--------|----------|
| P1-T17: LLM Usage Guide | LLM-USAGE-GUIDE.md | M (6-8h) | P1-Critical |

### Enhance in Phase 2

| Task | Enhancement | Effort | Priority |
|------|-------------|--------|----------|
| P2-T14/T15 | Add LLM next-step guidance | +2h | P2-High |
| P2-T17 | Add LLM agent testing | +2h | P2-High |

### Optional Enhancements

| Enhancement | Deliverable | Effort | Priority |
|-------------|-------------|--------|----------|
| Enhanced tool descriptions | src/index.ts updates | M (4-6h) | P2-High |
| Protocol-to-tool quick ref | Reference table | S (2h) | P2-Medium |

---

## Impact Assessment

### If LLM Gap Not Addressed

**Risks**:
1. LLM agents don't follow Sprint Protocol correctly
2. LLM agents invoke wrong tools or skip necessary tools
3. LLM agents generate poor-quality sprint metadata
4. LLM agents can't recover from errors
5. Human users confused by LLM behavior
6. Sprint Protocol compliance failures

**Example Failure Mode**:
```
User: "Start a sprint"
LLM: [Invokes start-sprint without checking status]
System: Error - sprint-21 already active (violates S3)
LLM: [Doesn't know how to recover]
User: [Confused, frustrated]
```

### If LLM Gap Addressed

**Benefits**:
1. LLM agents reliably follow Sprint Protocol
2. LLM agents use tools in correct sequences
3. LLM agents generate quality sprint metadata
4. LLM agents guide users proactively
5. Better human experience (because LLM is more capable)
6. Higher sprint success rate

**Example Success Mode**:
```
User: "Start a sprint"
LLM: [Checks status first - sprint-21 active]
LLM: "There's already an active sprint (sprint-21). Would you like to:
      1. Complete the current sprint first
      2. Force complete the current sprint
      3. Continue working on sprint-21"
User: "Complete it"
LLM: [Follows complete-sprint workflow correctly]
LLM: "Sprint-21 completed! Ready to start a new sprint."
```

---

## Conclusion

The original NUX Analysis correctly identified that the **human user experience** has critical gaps between installation and productive use. However, it **missed the LLM agent experience entirely**.

**Key Insight**: sprint-mcp is used BY humans THROUGH LLM agents. Both audiences need excellent onboarding:
- **Humans** need to understand WHAT to ask for
- **LLM agents** need to understand HOW to deliver it

**Critical Addition**: Add **P1-T17: Create LLM Usage Guide** to Phase 1 of the execution plan.

**Revised Conclusion**: Sprint-mcp needs **dual-track documentation improvements**:
1. **Human-facing** (original plan): Installation, tutorials, guides
2. **LLM-facing** (this addition): Tool usage patterns, protocol integration, error handling

Without both, the new user experience remains incomplete.

---

**Analysis Version**: 1.0
**Date**: 2026-08-11
**Status**: Critical Addition to NUX Analysis
