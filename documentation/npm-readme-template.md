# sprint-mcp

> MCP server providing Sprint Protocol tooling for LLM-driven development workflows

[![npm version](https://badge.fury.io/js/sprint-mcp.svg)](https://www.npmjs.com/package/sprint-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

**sprint-mcp** is a Model Context Protocol (MCP) server that implements the Sprint Protocol, enabling structured, traceable development workflows for LLM-powered coding assistants like Claude.

### What is Sprint Protocol?

Sprint Protocol is a structured methodology for LLM-driven development that provides:
- **Phased execution** (Plan → Approve → Implement → Validate → Verify → Publish → Retro → Learn)
- **Git worktree isolation** for each sprint
- **Comprehensive artifacts** (implementation plans, verification reports, retrospectives)
- **Full traceability** through request logs
- **Quality gates** ensuring code quality and testing

### What is MCP?

Model Context Protocol enables Claude Desktop to interact with external tools and services. sprint-mcp exposes Sprint Protocol tools as MCP endpoints.

---

## Features

- ✅ **Sprint Lifecycle Management** - Start, update, complete, and track sprints
- ✅ **Git Worktree Integration** - Isolated development environments per sprint
- ✅ **Artifact Generation** - Automated creation of plans, reports, retrospectives
- ✅ **Sprint Index Management** - Track all sprints across your projects
- ✅ **Cleanup Tools** - Remove completed sprint worktrees safely
- ✅ **Validation & Verification** - Quality gates and artifact validation

---

## Installation

### Method 1: Global Installation (Recommended)

```bash
npm install -g sprint-mcp
```

**Pros**: Simple configuration, faster startup, works offline

### Method 2: npx (No Installation)

No installation needed - use directly with npx.

**Pros**: Always latest version, no global packages, easy to try

### Method 3: Project-Local

```bash
npm install --save-dev sprint-mcp
```

**Pros**: Project-specific version, locked in package.json

---

## Configuration

### For Claude Desktop

Add to your Claude Desktop configuration file:

**Config Location**:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

#### Global Installation

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}
```

#### With npx

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "npx",
      "args": ["-y", "sprint-mcp"]
    }
  }
}
```

#### With Environment Variables

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "env": {
        "SPRINT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

**After configuration**:
1. Restart Claude Desktop completely (Cmd+Q / File → Exit)
2. Wait 5-10 seconds for MCP servers to initialize
3. Verify tools appear in Claude

---

## Available Tools

sprint-mcp provides the following MCP tools:

### Sprint Lifecycle

- **`start-sprint`** - Initialize a new sprint with manifest and directory structure
  - Creates sprint directory in `planning/`
  - Sets up git worktree for isolated development
  - Generates sprint manifest with metadata

- **`check-sprint-status`** - Verify current sprint state
  - Returns active sprint information
  - Checks for conflicts (multiple active sprints)
  - Validates sprint index integrity

- **`update-sprint-status`** - Update sprint status and metadata
  - Status transitions: planning → in-progress → validating → verifying → published → complete
  - Updates both manifest and sprint index
  - Atomic operations for consistency

- **`complete-sprint`** - Complete sprint with validation
  - Validates required artifacts (verification-report.md, retro.md, key-learnings.md)
  - Supports normal and forced completion modes
  - Updates status and timestamps

### Sprint Index Management

- **`regenerate-sprint-index`** - Rebuild sprint index from manifests
  - Scans all sprint manifests in `planning/`
  - Rebuilds `planning/sprint-index.yaml`
  - Validates index integrity
  - Recovers from index corruption

### Cleanup

- **`cleanup-sprint`** - Clean up completed sprint worktrees
  - Preview mode: Shows what will be deleted
  - Execution mode: Removes git worktrees
  - Safety checks: Only cleans completed sprints
  - Force option: Override uncommitted changes check

---

## Usage Examples

### Starting a Sprint

In Claude Desktop:
```
Start a new sprint to implement user authentication
```

Claude will use the `start-sprint` tool to:
1. Check no active sprints exist
2. Generate sprint ID (e.g., `sprint-12-abc123`)
3. Create `planning/sprint-12-abc123/` directory
4. Create git worktree in `.worktrees/sprint-12-abc123/`
5. Generate sprint manifest
6. Update sprint index

### Checking Sprint Status

```
Check the current sprint status
```

Returns information about active sprints and index health.

### Completing a Sprint

```
Complete the current sprint
```

Claude validates artifacts and marks sprint as complete.

### Cleaning Up Worktrees

```
Clean up completed sprint worktrees
```

Removes git worktrees for completed sprints, freeing disk space.

---

## Sprint Protocol Overview

sprint-mcp implements the Sprint Protocol defined in `AGENTS.md`. Key concepts:

### Sprint Phases

1. **Plan** - Create implementation plan, get user approval
2. **Implement** - Execute planned work, log all changes
3. **Validate** - Run validation script, verify deliverables
4. **Verify** - Create verification report, document gaps
5. **Publish** - Create GitHub PR, publish deliverables
6. **Retro** - Reflect on what went well / what didn't
7. **Learn** - Extract transferable learnings

### Sprint Artifacts

Every sprint creates:
- `sprint-manifest.yaml` - Sprint metadata and status
- `implementation-plan.md` - Detailed execution plan
- `request-log.md` - All prompts and changes
- `validate_deliverable.sh` - Executable validation script
- `verification-report.md` - Completed/partial/deferred items
- `publication.yaml` - PR URL and branch info
- `retro.md` - What worked, what didn't
- `key-learnings.md` - Lessons for future sprints

### Git Worktrees

Each sprint uses an isolated git worktree:
- Main worktree stays on main branch
- Sprint worktree on feature branch
- Independent working directories
- Separate git operations
- Easy cleanup after completion

---

## Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: v2.20 or higher (for worktree support)
- **Claude Desktop**: Latest version

---

## Troubleshooting

### Tools not appearing in Claude Desktop

1. Verify configuration file exists and is valid JSON
2. Check Claude Desktop logs for errors
3. Ensure sprint-mcp is installed (`which sprint-mcp` or `npx -y sprint-mcp`)
4. Restart Claude Desktop completely

### "command not found: sprint-mcp"

**Global installation**:
```bash
npm install -g sprint-mcp
which sprint-mcp
```

**npx usage**:
```bash
npx -y sprint-mcp  # Test it works
```

### Permission denied errors

Fix npm permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g sprint-mcp
```

### MCP server crashes

Check Node.js version:
```bash
node --version  # Must be v18+
```

Run manually to see errors:
```bash
sprint-mcp
```

---

## Updating

### Global Installation

```bash
npm update -g sprint-mcp
```

### npx

No action needed - npx always uses latest version.

To pin version:
```json
{
  "args": ["-y", "sprint-mcp@0.1.0"]
}
```

### Project-Local

```bash
npm update sprint-mcp
```

---

## Documentation

- **Sprint Protocol**: See `AGENTS.md` in package or [GitHub](https://github.com/cnavta/sprint-mcp/blob/main/AGENTS.md)
- **Installation Guide**: [Full installation guide](https://github.com/cnavta/sprint-mcp/blob/main/documentation/claude-desktop-installation-guide.md)
- **Examples**: [GitHub examples directory](https://github.com/cnavta/sprint-mcp/tree/main/examples)

---

## Development

### Running from Source

```bash
git clone https://github.com/cnavta/sprint-mcp.git
cd sprint-mcp
npm install
npm run build
npm link  # Use locally
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage report
```

Current test coverage: 71.57% statements, 224 tests passing

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Follow Sprint Protocol (see AGENTS.md)
4. Include tests for new functionality
5. Submit pull request

See [CLAUDE.md](https://github.com/cnavta/sprint-mcp/blob/main/CLAUDE.md) for development guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Links

- **npm Package**: https://www.npmjs.com/package/sprint-mcp
- **GitHub Repository**: https://github.com/cnavta/sprint-mcp
- **Issues**: https://github.com/cnavta/sprint-mcp/issues
- **MCP Specification**: https://modelcontextprotocol.io/

---

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Designed for use with [Claude Desktop](https://claude.ai/)
- Inspired by structured development methodologies

---

## Support

- **Documentation**: See [installation guide](https://github.com/cnavta/sprint-mcp/blob/main/documentation/claude-desktop-installation-guide.md)
- **Issues**: [GitHub Issues](https://github.com/cnavta/sprint-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cnavta/sprint-mcp/discussions)

---

**Made with ❤️ for LLM-powered development workflows**
