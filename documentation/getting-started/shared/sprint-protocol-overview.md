# Sprint Protocol Overview

**Reading Time**: 5 minutes
**Audience**: All users (developers and non-developers)

---

## What is Sprint Protocol?

The **Sprint Protocol** is a structured workflow methodology for organizing work with Claude (or other LLM assistants). Think of it as a framework that turns conversations with Claude into organized, traceable, and completable projects.

Instead of ad-hoc chats where work gets lost or context disappears, Sprint Protocol creates a clear structure: start a sprint, work through phases, complete with documentation, and have a full record of what was done and why. Each sprint is isolated, reversible, and shareable—making it easy to experiment, collaborate, and ship with confidence.

---

## Why Use Sprint Protocol?

### 1. **Nothing Gets Lost**
Every decision, every change, every experiment is captured automatically. You can always answer "why did we do this?" or "what did we try before?" Sprint artifacts create a complete audit trail.

### 2. **Organized Chaos**
Whether you're meticulously planning a production feature or vibing through creative exploration, Sprint Protocol keeps everything organized. Even your "what if I try this?" sessions become documented journeys you can retrace or share.

### 3. **Safe to Experiment**
Work happens in isolated git worktrees on feature branches. Break things, try wild ideas, pivot completely—your main codebase stays pristine. When you're done, merge the good stuff and delete the rest.

---

## Core Concepts

### Sprints

A **sprint** is a self-contained unit of work with:
- **Clear start**: "Start sprint" with a title and goal
- **Isolated workspace**: Git worktree + feature branch
- **Structured phases**: Plan → Implement → Validate → Complete
- **Complete documentation**: Everything tracked, nothing assumed
- **Clean end**: PR created, artifacts archived, ready for next sprint

**Duration**: Typically 1-14 hours. Keep sprints focused on one thing.

**Rule**: Only one sprint can be active at a time (prevents chaos, maintains focus).

---

### Git Worktrees

**Problem**: Switching git branches loses your working state and mixes concerns.

**Solution**: Git worktrees create separate working directories for each sprint. Your main branch stays untouched while you work in `.worktrees/sprint-X/`.

**What this means**:
- Main code always clean and deployable
- No "stash and switch" dance
- Can experiment fearlessly (delete worktree = gone)
- Multiple sprints can exist (only one active) without conflicts

**You don't need to understand git worktrees to use sprint-mcp**—Claude handles it for you. Just know: your sprint work is isolated and safe.

---

### Sprint Manifest

Every sprint has a `sprint-manifest.yaml` file that tracks:
```yaml
id: sprint-23-abc123
title: Add user authentication
goal: Implement username/password auth with sessions
status: in-progress
owner: you
createdAt: 2026-08-13T12:00:00Z
links:
  branch: feature/sprint-23-user-auth
  pr: https://github.com/you/project/pull/23
```

This is the "source of truth" for the sprint. All tools reference it, all humans can read it.

---

### Sprint Phases

Sprints progress through phases:

```
Planning → In-Progress → Validating → Verifying → Complete
   ↓           ↓            ↓             ↓           ↓
 Approve    Execute      Test         Check      Merge
  Plan       Work       Quality      Done?        PR
```

**Key phases**:
- **Planning**: Define what you'll do (`implementation-plan.md`)
- **In-Progress**: Do the work (code, create, experiment)
- **Validating**: Test it works (`validate_deliverable.sh`)
- **Verifying**: Document what's done (`verification-report.md`)
- **Complete**: Merge and archive

**Vibe mode flexibility**: Planning can be loose ("explore WebGL"), validation can be "it works for me", verification can be "here's what I discovered". The structure adapts to your needs.

---

### Planning Artifacts

Every sprint creates a `planning/` directory with:

| File | Purpose |
|------|---------|
| `sprint-manifest.yaml` | Metadata and status |
| `implementation-plan.md` | What you'll do (detailed or vague) |
| `request-log.md` | All prompts, commands, file changes |
| `validate_deliverable.sh` | Test it works (automated or manual) |
| `verification-report.md` | What's done/partial/deferred |
| `retro.md` | What worked, what didn't |
| `key-learnings.md` | Lessons for future sprints |

**Non-coders**: Claude creates these for you automatically.

**Developers**: You can edit these files directly or let Claude manage them.

---

## Use Case Spectrum

Sprint Protocol isn't one-size-fits-all. It adapts to how you work:

### Planned ↔ Exploratory

```
PLANNED SPRINT                        EXPLORATORY ("VIBE MODE")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Clear goal                          ✓ See what happens
✓ Specific deliverables               ✓ Emergent outcomes
✓ Documented plan                     ✓ Document discovery
✓ Success criteria                    ✓ Learning criteria
✓ Professional workflow               ✓ Creative freedom

Example:                              Example:
"Add OAuth2 to dashboard"             "Explore Three.js particle effects"
Deliverables: Login, logout,          Deliverables: Whatever looks cool +
token refresh, tests, docs            notes on what worked
```

**Both are valid!** Choose what fits your project.

---

### Non-Coding ↔ Software

```
NON-CODING PROJECTS                   SOFTWARE PROJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Content creation                    ✓ Application development
✓ Planning & strategy                 ✓ Tool building
✓ Creative work                       ✓ Infrastructure
✓ Event organizing                    ✓ Automation
✓ Client projects                     ✓ APIs, services

Example:                              Example:
"Plan YouTube series"                 "Build contact form"
Deliverables: Episode topics,         Deliverables: Form component,
scripts, thumbnail concepts           validation, email service, tests
```

**Sprint Protocol works for both.** Non-developers often start with non-coding projects to learn the methodology, then apply it to software projects with Claude's help.

---

## When to Use Planned vs Vibe Mode

### Use Planned Sprint When:
- ✅ You know exactly what you're building
- ✅ You need professional workflow (client work, production features)
- ✅ You want clear milestones and accountability
- ✅ You're working with others who need documentation

**Example**: "Implement password reset flow with email verification"

---

### Use Vibe Mode When:
- ✅ You're exploring new technology or ideas
- ✅ The goal will emerge from experimentation
- ✅ You want creative freedom without pressure
- ✅ "I'll know it when I see it" describes your goal

**Example**: "Play around with WebGL shaders and capture what looks cool"

---

### The Magic: Vibe → Production

One powerful pattern:
1. **Start vibe sprint**: "Experiment with X"
2. **Discover something cool**: "Oh this works great!"
3. **Formalize it**: Update plan, add tests, polish
4. **Complete as planned sprint**: Full documentation, ready to merge

**Value**: You get the freedom of exploration with the structure of professional delivery. The sprint captures your entire journey from "what if?" to "ship it!"

---

## Traceability: The Superpower

Every sprint creates complete traceability:

**What you'll have**:
- Every git commit linked to a sprint
- Every file change logged with reasoning
- Every decision documented with context
- Every experiment recorded (even failures)
- Full conversation history in `request-log.md`

**What this enables**:
- **Onboard new collaborators**: Read the sprint, understand everything
- **Debug issues**: "What sprint introduced this?"
- **Learn from history**: "How did we solve X before?"
- **Share your journey**: Turn sprints into blog posts, tutorials, portfolios
- **Recreate magic**: "What did we do to make that work?"

---

## Key Rules to Remember

From the Sprint Protocol specification (AGENTS.md):

1. **S1**: A sprint begins when you say "Start sprint"
2. **S2**: A sprint ends when you say "Sprint complete" (or "Force complete sprint")
3. **S3**: Only one sprint can be active at a time
4. **S6**: All planning artifacts live in `planning/sprint-*/` directory
5. **S11**: Each sprint gets its own git worktree and feature branch
6. **S12**: Claude attempts to create a PR at sprint completion

**You don't need to memorize these**—Claude enforces them automatically. Just know: the protocol keeps things organized and safe.

---

## Next Steps

### For Developers
- **[Developer Quickstart](../developers/QUICKSTART-DEVELOPERS.md)** - Get started in 5 minutes
- **[Understanding Protocol (Developers)](../developers/05-understanding-protocol.md)** - Developer-specific examples
- **[Full Protocol Spec (AGENTS.md)](../../../AGENTS.md)** - Complete technical specification

### For Non-Developers
- **[Choose Your Path](../use-cases/choosing-your-path.md)** - Find your entry point
- **[Concepts Explained](./concepts-explained.md)** *(Coming Soon)* - Plain-language glossary
- **[Non-Coding First Sprint](../creators/non-coding-projects/youtube-series.md)** *(Coming Soon)* - Learn with familiar work

### Learn More
- **[Architecture](../../../architecture.yaml)** - System design and philosophy
- **[Examples](../../../examples/)** - Real sprint examples
- **[FAQ](../../FAQ-DEVELOPERS.md)** *(Coming Soon)* - Common questions

---

## Summary

**Sprint Protocol** = Structured workflow for organized work with Claude

**Core concepts**:
- Sprints: Self-contained units of work
- Worktrees: Isolated workspaces
- Manifests: Source of truth
- Phases: Plan → Execute → Validate → Complete
- Artifacts: Complete documentation

**Flexible spectrum**:
- Planned ↔ Vibe (both valid)
- Non-coding ↔ Software (both supported)

**Superpower**: Complete traceability + safe experimentation

**Get started**: Choose your path and start your first sprint!

---

**Version**: 1.0
**Last Updated**: 2026-08-13
**Part of**: Sprint 23 - Tri-Audience NUX Implementation
