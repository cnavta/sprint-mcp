# Key Learnings – sprint-1-a9f3c2

## Learning Records

### LEARN-001 – Separate completion handoff from release authority

- Statement: Treat branch push and pull-request creation as an LLM completion handoff, while reserving version selection and every mutating release action for a human.
- Kind: collaboration
- Derived from: OBS-001; PART-001; REQ-003
- Applies when: An automated agent can prepare and publish reviewable source changes but release consequences require human judgment.
- Does not apply when: A separate governing policy explicitly delegates deployment automation; version release authority remains human-only under this protocol.
- Recommended action: State publication and release as separate lifecycle stages with different owners.
- Confidence: high
- Tags: [human-authority, release-governance, completion-handoff]
- Supersedes: none

### LEARN-002 – Verify repository foundations at sprint initialization

- Statement: Verify the current branch, baseline commit, working-tree state, and remote configuration before relying on later commit, push, or pull-request steps.
- Kind: tooling
- Derived from: OBS-002; PART-001; FOLLOW-001
- Applies when: A sprint requires Git publication or pull-request review.
- Does not apply when: The deliverable is intentionally outside Git and the governing process does not require publication.
- Recommended action: Add baseline and remote checks beside mandatory feature-branch verification.
- Confidence: high
- Tags: [git, sprint-initialization, publication-readiness]
- Supersedes: none

### LEARN-003 – Use semantic assertions for governance documents

- Statement: Validate governance-document revisions with executable assertions for required concepts, prohibited legacy language, and stable extraction schemas.
- Kind: process
- Derived from: OBS-003; REQ-004; `validate_deliverable.sh`
- Applies when: A documentation change defines operational rules whose presence or absence can be checked mechanically.
- Does not apply when: Correctness depends entirely on subjective prose quality; human review remains necessary in those cases.
- Recommended action: Combine build checks with targeted content assertions and transparent reporting of unavailable tests.
- Confidence: high
- Tags: [documentation-validation, semantic-checks, extraction-readiness]
- Supersedes: none

### LEARN-004 – Separate follow-up capture from reprioritization

- Statement: Append human follow-up tasks to the backlog by default, and change execution order only when the human explicitly supplies a different position, priority, or dependency.
- Kind: collaboration
- Derived from: OBS-004; REQ-011
- Applies when: New tasks arrive during an active delivery sequence and must be preserved without losing the current execution context.
- Does not apply when: The human explicitly identifies the follow-up as an urgent replacement or supplies another ordering rule.
- Recommended action: Use `Stop → Clarify → Append → Continue` and resume at the next ready item in declared order.
- Confidence: high
- Tags: [backlog-order, follow-up-loop, human-authority]
- Supersedes: none

### LEARN-005 – Center traceability on collaboration turns

- Statement: Use sprint-relevant Human–LLM turns as the primary traceability record and retain commands only as evidence for state changes, validation, publication, or material failures.
- Kind: process
- Derived from: OBS-005; REQ-015
- Applies when: A workflow needs auditable decisions and future semantic extraction without retaining a noisy terminal transcript.
- Does not apply when: A regulated or incident-response process explicitly requires complete command auditing.
- Recommended action: Record intent, interpretation, decisions, outcomes, and stable evidence references for each sprint-relevant turn.
- Confidence: high
- Tags: [human-llm-turns, request-log, semantic-traceability]
- Supersedes: none
