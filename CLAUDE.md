# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a sprint-based development repository governed by a strict LLM agent workflow protocol defined in `AGENTS.md`. The repository implements a structured sprint methodology where LLM agents execute development work through defined phases: Plan → Approve → Implement → Validate → Verify → Publish (PR) → Retro → Learn.

## Critical Precedence Rules

**Always consult these sources in order:**
1. `architecture.yaml` — canonical source of truth for system behavior (when it exists)
2. `AGENTS-uncompressed.md` — operational and behavioral rules for agents (SOURCE FILE with explicit intent)
3. `AGENTS.md` — semantically compressed version of AGENTS-uncompressed.md for token efficiency (DO NOT MODIFY)
4. Everything else — examples, legacy docs, and supporting materials

If conflicts occur, `architecture.yaml` wins. Surface the conflict and align to it.

### Protocol File Relationship

- **AGENTS-uncompressed.md**: The SOURCE file for all protocol changes. Higher token count, more explicit intent. **Always modify this file when updating the Sprint Protocol.**
- **AGENTS.md**: A semantically compressed version optimized for token efficiency. This is generated FROM AGENTS-uncompressed.md and should NOT be modified directly. Future sprints may need to recompress this file when AGENTS-uncompressed.md changes significantly.

## Sprint Protocol Overview

### Sprint Control Rules

- **S1**: A sprint begins only when the user explicitly says "Start sprint"
- **S2**: A sprint ends when validation criteria are satisfied OR documented exceptions are explicitly accepted, and the user says "Sprint complete" or "Force complete sprint"
- **S3**: Only one sprint may be active at a time
- **S4**: Prompts related to this repo are included in sprint scope unless specified otherwise
- **S5**: If sprint state is unclear, ask once, then proceed with best judgment, but do not bypass explicit approval gates

### Sprint Start Procedure

When "Start sprint" is issued:
1. Check for active sprints (verify no `sprint-manifest.yaml` in `planning/` has status other than `complete`)
2. Generate sprint ID: `sprint-<number>-<short-hash>`
3. Create sprint directory: `planning/sprint-<id>/`
4. Create feature branch: `git checkout -b feature/<sprint-id>-<short-description>`
5. Create `sprint-manifest.yaml` with required metadata
6. Log action in `request-log.md`

### Sprint Directory Structure

Every sprint creates:
```
planning/
  sprint-<number>-<hash>/
    sprint-manifest.yaml      # Sprint metadata and status
    implementation-plan.md    # Detailed execution plan
    request-log.md            # All prompts, commands, and file changes
    validate_deliverable.sh   # Real, executable validation script
    verification-report.md    # Completed/partial/deferred items
    publication.yaml          # PR URL and branch info
    retro.md                  # What worked, what didn't
    key-learnings.md          # Lessons for future sprints
```

## Development Commands

### Testing (when project code exists)
- Node/TypeScript projects: `npm test` (using Jest)
- Other stacks: Use stack-appropriate frameworks (pytest, go test, etc.)

### Validation Script
Every sprint MUST include an executable `validate_deliverable.sh` that:
1. Installs dependencies
2. Builds the project
3. Runs test suite
4. Starts local runtime (if applicable)
5. Performs health checks
6. Shuts down local runtime
7. Runs dry-run deployment

Example for Node/TypeScript:
```bash
npm ci
npm run build
npm test
npm run local || true
npm run local:down || true
npm run deploy:cloud -- --dry-run || true
```

### Release Management

**Version Single Source of Truth**: `architecture.yaml` `project.version` (when it exists)

Use integrated release tool:
```bash
brat release <patch|minor|major|x.y.z> [--dry-run] [--tag] [--yes]
# or npm aliases:
npm run release -- <bump>
npm run release:dry -- <bump>
```

This keeps `architecture.yaml`, `package.json`, and `package-lock.json` in sync, rolls `CHANGELOG.md` unreleased section, and optionally tags.

## Architecture Principles

### Directory Structure (when fully implemented)
```
deprecated/      # Historical reference only - NEVER use in deliverables
examples/        # Useful templates
planning/        # Sprint artifacts (authoritative)
preview/         # Visionary, non-binding artifacts
infrastructure/  # IaC, Cloud Build, Terraform files
src/
  apps/          # Service entrypoints
  common/        # Shared utilities
  config/        # Configuration
  services/      # Core microservices
  types/         # Shared types
```

### Code Style
- Application/services code: TypeScript by default (unless service specifies otherwise)
- Filenames: kebab-case
- Classes/interfaces: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE

### Logging
- Use logging facade where possible
- `info` for useful information
- `error` for errors
- `debug` for detailed insight
- Log all network + filesystem operations with context

### Error Handling
- Strong try/catch discipline
- Graceful shutdown of services
- Validate environment variables
- Use Pub/Sub for service communication
- Normalize external events to internal schema

## Project-Wide Definition of Done

A deliverable is "Done" only if:

### Code Quality
- Adheres to project and architecture.yaml constraints
- No TODOs or placeholder logic in production paths
- Stubs allowed only in non-production paths or behind feature flags

### Testing
- Tests for all new behavior
- Mocks for external dependencies
- Test suite must pass
- Test deferral requires explicit user approval

### Deployment Artifacts (if applicable)
- Dockerfile
- Cloud Build YAML
- Cloud Run configs
- IaC
- Must integrate with `validate_deliverable.sh`

### Documentation
- Rationale, trade-offs, and notes
- LLM hints (`llm_prompt`) where beneficial

### Traceability
All code changes trace back to:
- A sprint
- A request ID in `request-log.md`

## Git and Publication Rules

- **S11**: New feature branch MUST be created at sprint start and used for all sprint changes
- **S12**: Agent MUST attempt to create GitHub Pull Request at sprint completion and log the result
- **S13**: Sprint cannot close until either (a) PR successfully created with URL in `publication.yaml`, or (b) failed PR attempt logged with error and user explicitly accepts closure

### Creating PRs

Using GitHub CLI:
```bash
gh pr create \
  --title "Sprint <id> Deliverables – <summary>" \
  --body "Generated by LLM agent according to Sprint Protocol v2.4."
```

Using GitHub API (requires token):
```bash
curl -X POST \
  -H "Authorization: Bearer <GITHUB_TOKEN>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<owner>/<repo>/pulls \
  -d '{
    "title": "Sprint <id> Deliverables – <summary>",
    "head": "feature/<sprint-id>-<short-description>",
    "base": "main",
    "body": "Generated by LLM agent according to Sprint Protocol v2.4."
  }'
```

## Key Workflow Gates

1. **Planning Phase**: NO coding until `implementation-plan.md` is explicitly approved by user
2. **Execution Phase**: Log every prompt, command, and file change in `request-log.md`
3. **Validation Phase**: `validate_deliverable.sh` must be logically passable OR failures documented and accepted
4. **Verification Phase**: `verification-report.md` must document completed/partial/deferred items
5. **Publication Phase**: PR must be created and logged
6. **Completion**: User must say "Sprint complete" or "Force complete sprint"

## Force Completion

User can say "Force complete sprint" to close even with:
- Failing validation script
- Incomplete/failing tests
- Failed PR creation

Requirements:
- All failures/gaps documented in `verification-report.md` under Partial or Deferred
- Issues summarized in `retro.md` for future sprints

## Amending Active Sprints

When user provides follow-up tasks during active sprint:
1. Identify scope change
2. Update `implementation-plan.md`
3. Update `sprint-manifest.yaml` if goal evolved significantly
4. Log request in `request-log.md`
5. Request user approval if change is substantial
6. Perform work on existing feature branch

## Collaboration Roles

- **Cloud Architect**: Cloud architecture analysis/design (does not code)
- **Lead Architect**: Platform architecture analysis/design (does not code)
- **Lead Implementor**: Creates plans, executes tasks, codes, remediates issues
- **Quality Lead**: Testing and quality oversight

## Capabilities

Agents ARE allowed to:
- Execute shell commands
- Interact with git (checkout, branch creation, committing, pushing)
- Create and push feature branches
- Create GitHub Pull Requests (via GitHub CLI or API)

Agents MUST:
- Log every meaningful shell and git operation into `request-log.md`
- Operate only within the repository provided
- Halt and request updated credentials if authentication fails
- Report command results transparently

## Immutable Laws

1. Ask for clarification when needed. Proceed when not.
2. Never violate `architecture.yaml`. Suggest changes only with justification.
3. All sprint planning and output artifacts live in `./planning`.
4. Never use or depend on `./deprecated` in deliverables.
5. Artifacts in `./preview` are directional only, not implementation-ready.
6. Everything must be: Traceable, Reproducible, Reversible.
