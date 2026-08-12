# Sprint MCP Server

A combination agent workflow and MCP server focused around iterative, collaborative development between Humans and Agents.

## Overview

This MCP server implements tools that support the Sprint Protocol defined in `AGENTS.md`. It enables LLM agents (like Claude) to manage structured sprint-based development workflows through the Model Context Protocol.

## Features

- **Sprint Management**: Initialize, track, and complete sprints following the Sprint Protocol
- **Status Checking**: Verify active sprints and enforce single-sprint rule (S3)
- **Manifest Generation**: Automatically create sprint manifests with proper metadata
- **Request Logging**: Track all actions and decisions in request logs
- **Protocol Enforcement**: Validate sprint lifecycle rules and requirements

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage

### Running the Server

The MCP server communicates via stdio:

```bash
npm run dev
```

Or run the built version:

```bash
node dist/index.js
```

### Connecting to Claude Desktop

Add this server to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "node",
      "args": ["/path/to/sprint-mcp/dist/index.js"]
    }
  }
}
```

After restarting Claude Desktop, the sprint tools will be available.

## Available Tools

### `start-sprint`

Initialize a new sprint with manifest and directory structure.

**Parameters**:
- `title` (string, required): Concise sprint title
- `goal` (string, required): Clear sprint objective
- `owner` (string, required): GitHub handle or name of sprint owner

**Example**:
```json
{
  "title": "Implement User Profile Service",
  "goal": "Create microservice for user profile management with REST API",
  "owner": "@johndoe"
}
```

**Behavior**:
- Verifies main branch baseline (must exist with commits)
- Checks for active sprints (rule S3)
- Generates unique sprint ID: `sprint-<number>-<hash>`
- Creates sprint directory in `planning/`
- **Creates isolated git worktree** at `.worktrees/sprint-<id>/`
- Creates feature branch in worktree
- Generates `sprint-manifest.yaml` and `request-log.md`
- Sets status to `planning`

**Git Worktrees**: Each sprint gets its own isolated worktree, allowing parallel development without branch switching. The main worktree stays on the main branch.

### `check-sprint-status`

Verify current sprint state and check for active sprints.

**Parameters**: None

**Returns**:
- List of active sprints with details
- Count of completed sprints
- Warning if multiple active sprints detected (protocol violation)
- Confirmation if ready to start new sprint

### `regenerate-sprint-index`

Rebuild the sprint index from all sprint manifests.

**Parameters**: None

**Returns**:
- Total sprints indexed
- Active and completed sprint counts
- List of all sprints with status
- Validation results (errors and warnings)
- Statistics (counts by status, by completion mode, average duration)

**When to Use**:
- Index file is corrupted or missing
- Index shows test artifacts or incorrect data
- After manually editing sprint manifests
- Index appears out of sync with actual sprints

**Example Output**:
```
✅ Sprint index regenerated successfully!

Summary:
- Total sprints: 5
- Active sprints: 1
- Completed sprints: 4
- Generated at: 2026-07-31T12:00:00Z

Sprints in index:
✓ sprint-1-abc123: First Sprint (complete)
✓ sprint-2-def456: Second Sprint (complete)
→ sprint-3-ghi789: Current Sprint (in-progress)

Validation:
✅ All validation checks passed
```

### `update-sprint-status`

Atomically update sprint status in both manifest and index.

**Parameters**:
- `sprintId` (string, required): Sprint ID to update
- `status` (string, optional): New status value
- `completedAt` (string, optional): Completion timestamp (ISO 8601)
- `completionMode` (string, optional): `normal` or `forced`
- `pr` (string, optional): Pull request URL

**Example**:
```json
{
  "sprintId": "sprint-3-ghi789",
  "status": "complete",
  "completedAt": "2026-07-31T20:00:00Z",
  "completionMode": "normal",
  "pr": "https://github.com/owner/repo/pull/5"
}
```

**Behavior**:
- Updates manifest file (authoritative source)
- Updates index file (derived cache)
- Validates index after update
- Non-fatal if index update fails (can regenerate)

### `complete-sprint`

Complete a sprint by validating artifacts, updating status, and providing completion summary.

**Parameters**:
- `sprintId` (string, required): Sprint ID to complete (e.g., 'sprint-7-f7cz9y')
- `completionMode` (string, required): `normal` or `forced`
- `pr` (string, optional): Pull request URL if already created

**Example** (Normal Mode):
```json
{
  "sprintId": "sprint-7-f7cz9y",
  "completionMode": "normal",
  "pr": "https://github.com/owner/repo/pull/5"
}
```

**Example** (Forced Mode):
```json
{
  "sprintId": "sprint-7-f7cz9y",
  "completionMode": "forced"
}
```

**Behavior**:
- Validates sprint manifest exists
- Checks for required completion artifacts (as of Protocol v2.5):
  - `verification-report.md` (backlog reconciliation)
  - `retro.md` (sprint retrospective)
  - `key-learnings.md` (transferable insights)
- Updates sprint status to 'complete'
- Adds completion timestamp
- Adds PR URL to manifest (if provided)
- Returns completion summary with next steps

**Note**: `publication.yaml` was deprecated in Protocol v2.5. PR URL and publication metadata are now tracked in `sprint-manifest.yaml`.

**Completion Modes**:
- **normal**: Strict mode requiring all 3 completion artifacts. Fails if any are missing.
- **forced**: Permissive mode allowing completion despite missing artifacts. Issues warnings but proceeds.

**When to Use**:
- After completing all sprint deliverables
- After creating PR and pushing changes
- When ready to close sprint and move to next one

**Output Example**:
```
✅ Sprint sprint-7-f7cz9y completed successfully!

**Status Update**:
- Sprint status: complete
- Completion timestamp: 2026-08-01T12:00:00Z
- Completion mode: normal
- PR: https://github.com/owner/repo/pull/5

**Artifact Validation** (Protocol v2.5+):
✓ verification-report.md exists
✓ retro.md exists
✓ key-learnings.md exists

**Next Steps**:
1. Review sprint artifacts
2. Merge PR when approved
3. Cleanup sprint worktree with cleanup-sprint tool
```

### `cleanup-sprint`

Safely remove git worktrees for completed sprints while preserving planning artifacts.

**Dual Interface**: Available as both MCP tool (for agents) and npm script (for humans).

**Parameters** (MCP tool):
- `sprintId` (string, optional): Sprint ID to cleanup. If omitted, shows all candidates.
- `force` (boolean, optional): Force removal even if uncommitted changes exist

**Example** (MCP tool - list all candidates):
```json
{}
```

**Example** (MCP tool - cleanup specific sprint):
```json
{
  "sprintId": "sprint-6-24txmg",
  "force": false
}
```

**Example** (npm script - interactive):
```bash
# List all cleanup candidates (interactive mode)
npm run sprint:cleanup

# Cleanup specific sprint (interactive confirmation)
npm run sprint:cleanup -- --sprint=sprint-6-24txmg

# Auto-confirm for scripts
npm run sprint:cleanup -- --sprint=sprint-6-24txmg --yes

# Force cleanup (ignores uncommitted changes)
npm run sprint:cleanup -- --sprint=sprint-6-24txmg --force --yes

# Show help
npm run sprint:cleanup -- --help
```

**Safety Features**:
- Only cleans up completed sprints (status check)
- Never deletes planning directories
- Warns about uncommitted changes
- Requires explicit confirmation (interactive mode)
- Shows disk space to be freed

**What Gets Deleted**:
- ✗ Worktree directory: `.worktrees/sprint-<id>/`
- ✗ Git working tree state

**What Gets Preserved**:
- ✓ Planning directory: `planning/sprint-<id>/`
- ✓ Sprint manifest, backlog, execution plan
- ✓ Retrospective and key learnings
- ✓ Verification report and publication metadata
- ✓ Sprint index entry

**When to Use**:
- After sprint PR is merged
- When disk space is needed
- When cleaning up orphaned worktrees from completed sprints

**Output Example** (npm script):
```
🧹 Sprint Cleanup Tool

Found 2 cleanup candidate(s):

1. sprint-6-24txmg
   Path: .worktrees/sprint-6-24txmg
   Branch: feature/sprint-6-24txmg-llm-compress
   Size: ~50.0 MB
   Status: complete

2. sprint-7-f7cz9y
   Path: .worktrees/sprint-7-f7cz9y
   Branch: feature/sprint-7-f7cz9y-complete-sprint
   Size: ~48.5 MB
   Status: complete
   ⚠️  Has uncommitted changes

Total disk space to free: ~98.5 MB

⚠️  WARNING: This will permanently delete worktree directories.
✓ Planning directories will be preserved.

Proceed with cleanup? (y/N):
```

## Sprint Index

The sprint index (`planning/sprint-index.yaml`) is a centralized cache of sprint metadata that provides fast access to sprint information without scanning the filesystem.

### How It Works

**Authoritative Source**: Individual sprint manifests in `planning/sprint-*/sprint-manifest.yaml` are the single source of truth.

**Derived Cache**: The index is automatically computed from manifests. Never edit it manually - changes will be overwritten.

**Automatic Updates**: The index updates automatically when you:
- Start a new sprint (`start-sprint` tool)
- Update sprint status (`update-sprint-status` tool)
- Regenerate the index (`regenerate-sprint-index` tool)

### Regenerating the Index

If the index becomes corrupted or out of sync, regenerate it:

**Via MCP Tool** (in Claude):
```
Use the regenerate-sprint-index tool
```

**Via npm Script** (command line):
```bash
npm run sprint:index:regenerate
```

This scans all sprint manifests in `planning/`, rebuilds the index, and validates it. The regeneration is the universal recovery mechanism - use it whenever the index seems wrong.

### What's in the Index?

The index provides:
- **Complete sprint list**: All sprints with status, owner, dates
- **Statistics**: Counts by status, completion mode, average duration
- **Fast lookups**: No filesystem scanning needed
- **Validation**: Built-in consistency checks

### Index Schema

```yaml
version: "1.0"
generatedAt: "2026-07-31T12:00:00Z"
totalSprints: 5
activeSprints: 1
completedSprints: 4

sprints:
  - id: sprint-1-abc123
    title: "Sprint title"
    status: complete
    owner: "Owner name"
    createdAt: "2026-07-30T12:00:00Z"
    completedAt: "2026-07-30T20:00:00Z"
    completionMode: normal
    manifestPath: "planning/sprint-1-abc123/sprint-manifest.yaml"
    branch: "feature/sprint-1-abc123-title"
    pr: "https://github.com/owner/repo/pull/123"

statistics:
  byStatus:
    in-progress: 1
    complete: 4
  byCompletionMode:
    normal: 4
    forced: 0
  averageSprintDuration: "PT6H45M"
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Index out of sync | Run `regenerate-sprint-index` or `npm run sprint:index:regenerate` |
| Index shows test sprints | Regenerate (only indexes valid manifests) |
| Index update failed during sprint creation | Non-fatal - sprint still created. Regenerate to add missing entry |
| Validation errors | Check error codes, fix manifest issues, regenerate |

The index file has a "DO NOT EDIT THIS FILE MANUALLY" header at the top - this is a reminder that the index is computed, not authoritative. Always regenerate rather than editing manually.

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

### Project Structure

```
sprint-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── common/
│   │   ├── logger.ts          # Logging facade
│   │   ├── file-utils.ts      # File system utilities
│   │   └── git-utils.ts       # Git operations (worktrees, baseline)
│   ├── tools/
│   │   ├── start-sprint.ts    # Start sprint tool implementation
│   │   └── check-sprint-status.ts  # Status check tool
│   └── types/
│       └── sprint.ts          # TypeScript type definitions
├── planning/                   # Sprint artifacts directory
├── .worktrees/                 # Sprint worktrees (gitignored)
│   └── sprint-<id>/           # Isolated worktree per sprint
├── architecture.yaml          # Canonical source of truth
├── AGENTS.md                  # Sprint Protocol definition (compressed)
├── AGENTS-uncompressed.md     # Sprint Protocol source (explicit)
├── CLAUDE.md                  # Claude Code guidance
└── package.json
```

## Sprint Protocol

This server implements the Sprint Protocol defined in `AGENTS-uncompressed.md` (source) and `AGENTS.md` (compressed). Key principles:

1. **Precedence**: `architecture.yaml` > `AGENTS-uncompressed.md` > `AGENTS.md` > everything else
2. **Sprint Control**: Only one sprint active at a time (rule S3)
3. **Lifecycle**: Plan → Approve → Implement → Validate → Verify → Publish → Retro → Learn
4. **Traceability**: All actions logged in `request-log.md`
5. **Definition of Done**: Code quality, testing, deployment, documentation, traceability
6. **Git Worktrees**: Each sprint uses an isolated worktree for clean separation

## Git Worktree Workflow

### Why Worktrees?

Git worktrees provide isolated working directories for each sprint:

- **Isolation**: Each sprint has its own directory; no branch context switching needed
- **Parallel Work**: Main worktree stays on `main` branch; sprint work happens in `.worktrees/sprint-<id>/`
- **Clean Separation**: No risk of mixing sprint changes with main branch state
- **Easy Cleanup**: Remove worktree after sprint completion with `git worktree remove`

### Sprint Creation with Worktrees

When you start a sprint:

1. **Main baseline verified**: Ensures `main` branch exists with commits
2. **Worktree created**: `.worktrees/sprint-<id>/` directory created
3. **Feature branch**: Worktree is on new feature branch `feature/sprint-<id>-<description>`
4. **Working directory**: All sprint work happens in the worktree directory

Example:
```bash
# Start sprint (creates worktree automatically)
# Via MCP: use start-sprint tool

# Change to sprint worktree
cd .worktrees/sprint-7-a13b2f/

# Verify you're on the feature branch
git branch --show-current
# Output: feature/sprint-7-a13b2f-user-profile-service

# Do your work here...
npm test
git add .
git commit -m "Implement feature"

# Main worktree is unchanged
cd ../..  # Back to repo root
git branch --show-current
# Output: main
```

### Worktree Cleanup

After sprint completion and PR merge:

```bash
# Return to repository root
cd /path/to/sprint-mcp

# Remove sprint worktree
git worktree remove .worktrees/sprint-<id>

# If worktree has uncommitted changes (with human approval)
git worktree remove .worktrees/sprint-<id> --force
```

**Note**: The `planning/sprint-<id>/` directory remains as the permanent sprint record. Only the `.worktrees/sprint-<id>/` working directory is removed.

### Multiple Sprints

Worktrees allow multiple sprint directories to coexist (though only one sprint should be active per protocol S3):

```bash
ls .worktrees/
# Output:
# sprint-5-abc123/  (completed, can be cleaned up)
# sprint-6-def456/  (active sprint)
```

## Logging

Logs are written to stderr to avoid interfering with MCP stdio protocol.

Set log level via environment variable:

```bash
LOG_LEVEL=debug node dist/index.js
```

Available levels: `debug`, `info`, `warn`, `error`

## License

MIT
