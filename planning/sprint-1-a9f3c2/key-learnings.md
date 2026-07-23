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
