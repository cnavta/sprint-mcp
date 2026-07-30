# Sprint MCP Server

MCP server providing Sprint Protocol tooling for LLM-driven development workflows.

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
- Checks for active sprints (rule S3)
- Generates unique sprint ID: `sprint-<number>-<hash>`
- Creates sprint directory in `planning/`
- Generates `sprint-manifest.yaml` and `request-log.md`
- Suggests feature branch name
- Sets status to `planning`

### `check-sprint-status`

Verify current sprint state and check for active sprints.

**Parameters**: None

**Returns**:
- List of active sprints with details
- Count of completed sprints
- Warning if multiple active sprints detected (protocol violation)
- Confirmation if ready to start new sprint

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
│   │   └── file-utils.ts      # File system utilities
│   ├── tools/
│   │   ├── start-sprint.ts    # Start sprint tool implementation
│   │   └── check-sprint-status.ts  # Status check tool
│   └── types/
│       └── sprint.ts          # TypeScript type definitions
├── planning/                   # Sprint artifacts directory
├── architecture.yaml          # Canonical source of truth
├── AGENTS.md                  # Sprint Protocol definition
├── CLAUDE.md                  # Claude Code guidance
└── package.json
```

## Sprint Protocol

This server implements the Sprint Protocol defined in `AGENTS.md`. Key principles:

1. **Precedence**: `architecture.yaml` > `AGENTS.md` > everything else
2. **Sprint Control**: Only one sprint active at a time (rule S3)
3. **Lifecycle**: Plan → Approve → Implement → Validate → Verify → Publish → Retro → Learn
4. **Traceability**: All actions logged in `request-log.md`
5. **Definition of Done**: Code quality, testing, deployment, documentation, traceability

## Logging

Logs are written to stderr to avoid interfering with MCP stdio protocol.

Set log level via environment variable:

```bash
LOG_LEVEL=debug node dist/index.js
```

Available levels: `debug`, `info`, `warn`, `error`

## License

MIT
