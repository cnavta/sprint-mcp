# Execution Plan – sprint-1-a9f3c2

## Objective

Revise `AGENTS.md` so the Sprint Protocol is explicitly a Human-LLM partnership with clear decision rights, intentional Git practices, human-owned releases, and retrospective artifacts designed for future semantic compaction and extraction.

## Scope

### In scope

- Reframe the protocol's purpose, lifecycle, rules, and roles around collaboration between a human and an LLM.
- Define the human as the authority for approvals, exceptions, sprint completion, and releases.
- Define the LLM as responsible for traceable planning, implementation, validation, verification, Git hygiene, and recommendations.
- Require creation of a dedicated feature branch during sprint initialization.
- Require regular commits at coherent checkpoints, with messages that communicate intent and include sprint/request traceability.
- Define pushing as the final LLM publication step after validation and verification, before PR creation and the human's official sprint-completion decision.
- Make real releases exclusively human-executed; document `brat release <bump-or-version>` as an aid the LLM may recommend and dry-run, but never execute as a mutating release action.
- Give `retro.md` and `key-learnings.md` stable, extraction-friendly structures using discrete evidence, outcomes, reusable lessons, applicability, confidence, and tags.
- Add a compact follow-up loop for human-requested tasks after an LLM delivery turn: stop, clarify, append to the backlog by default, then continue in backlog order.
- Resolve internal terminology and artifact-name inconsistencies encountered in the edited sections.

### Out of scope

- Implementing semantic compaction, embeddings, indexing, or extraction tooling.
- Changing runtime code, MCP tool behavior, or `architecture.yaml`.
- Performing a real release or changing the project version.
- Redesigning unrelated code-style and platform-architecture rules.

## Deliverables

- Revised `AGENTS.md`.
- Sprint planning and traceability artifacts under `planning/sprint-1-a9f3c2/`.
- Documentation-oriented validation script.
- Verification, publication, retrospective, and learning artifacts produced in later phases.

## Acceptance Criteria

- The document consistently describes the process as a Human-LLM partnership rather than an LLM-led process.
- Human and LLM responsibilities and decision rights are explicit and non-overlapping where authority matters.
- Sprint initialization requires a new feature branch before implementation.
- The protocol requires commits after coherent work units and provides an intent-focused, machine-readable commit convention tied to sprint and request IDs.
- The LLM pushes the completed branch only after validation and verification; the PR is then created before the human declares the sprint complete.
- No instruction authorizes an LLM to execute a mutating release command, create a release tag, or publish a release.
- `brat release <patch|minor|major|x.y.z>` is presented as a human aid, while non-mutating dry-run validation remains permitted.
- `retro.md` and `key-learnings.md` have stable headings and atomic records suitable for future semantic extraction without requiring an extraction implementation now.
- When the human adds follow-up work after an LLM delivery turn, the LLM stops progression, asks only necessary questions, adds the task at the end of `backlog.yaml` unless another position is specified, applies any required approval gate, and resumes with the next ready backlog item.
- The revision does not conflict with `architecture.yaml`.

## Testing Strategy

- Review the final diff for contradictory lifecycle, Git, release, and ownership language.
- Search for legacy language that describes releases as an LLM responsibility or calls the process solely LLM-led.
- Verify all referenced sprint artifacts use consistent filenames.
- Assert that the compact follow-up loop and default append-order rule are present.
- Run the repository's existing test and build commands to detect unintended regressions.
- Provide an executable documentation-oriented `validate_deliverable.sh` that performs the applicable checks.

## Deployment Approach

This is a governance-document revision. No deployment is planned. Publication consists of pushing the sprint branch and opening a pull request once validation and verification succeed.

## Dependencies

- Human approval of this execution plan and backlog.
- A valid Git working tree at `/Users/christophernavta/IdeaProjects/sprint-mcp` before implementation begins, so the required sprint branch can be created.
- Working GitHub credentials at publication time.

## Definition of Done

The project-wide Definition of Done in `AGENTS.md` applies. For this documentation-focused sprint, completion additionally requires the acceptance criteria above, a logically passable documentation validation script, a verification report, publication evidence or an explicitly accepted publication exception, and the human's explicit `Sprint complete` or `Force complete sprint` instruction.
