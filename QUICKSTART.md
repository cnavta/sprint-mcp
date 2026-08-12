# QUICKSTART - Get Started with sprint-mcp in 5 Minutes

**sprint-mcp** brings structured, traceable development workflows to Claude Desktop. Run your first sprint in under 5 minutes.

---

## Prerequisites

- ✅ Node.js 18+ installed (`node --version`)
- ✅ Claude Desktop installed
- ✅ Git repository (existing project or new)
- ⏱️ 5 minutes

---

## Step 1: Install sprint-mcp (30 seconds)

**Install globally** (recommended for quickstart):

```bash
npm install -g sprint-mcp
```

**Verify installation**:

```bash
sprint-mcp --version
```

✅ If you see a version number, installation succeeded!

---

## Step 2: Configure Claude Desktop (1 minute)

**Find your Claude Desktop config file**:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Open the file** (create if it doesn't exist):

```bash
# macOS/Linux
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or use your favorite editor
```

**Add this configuration** (or merge with existing `mcpServers` section):

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}
```

**Save the file** and **restart Claude Desktop** (fully quit, then reopen).

✅ Wait 5-10 seconds for MCP servers to initialize.

---

## Step 3: Start Your First Sprint (2 minutes)

**Open Claude Desktop** and start a conversation.

**Tell Claude about your project directory** (replace with your actual path):

```
I'm working in /Users/yourname/projects/my-app
```

**Start a sprint with this exact prompt** (customize the owner name):

```
Start a sprint.

Goal: Add a simple greeting function that takes a name parameter and returns "Hello, [name]!"

Owner: YourName
```

### What Happens Next

Claude will:
1. ✅ Create a sprint ID (e.g., `sprint-1-abc123`)
2. ✅ Create git worktree at `.worktrees/sprint-1-abc123/`
3. ✅ Generate planning artifacts in `planning/sprint-1-abc123/`
4. ✅ Create feature branch `feature/sprint-1-abc123-greeting-function`
5. ✅ Guide you through implementation

### During the Sprint

- Claude will ask questions about implementation details
- Follow Claude's guidance through each phase
- Claude will create the code for you
- Sprint completes when validation passes

---

## Step 4: Verify Success (30 seconds)

**Check that your sprint worktree exists**:

```bash
# List worktrees
ls .worktrees/

# Check your sprint worktree
ls .worktrees/sprint-1-*/
```

**Check sprint planning artifacts** (inside the worktree):

```bash
# List sprint planning artifacts
ls .worktrees/sprint-1-*/planning/sprint-1-*/
```

**You should see**:
- ✅ `sprint-manifest.yaml` - Sprint metadata and status
- ✅ `implementation-plan.md` - Detailed plan
- ✅ `request-log.md` - Complete request history
- ✅ Additional artifacts (validation script, reports, etc.)

**Check your feature branch**:

```bash
# List branches
git branch | grep sprint-1
```

**Success indicators**:
- ✅ Worktree directory exists in `.worktrees/`
- ✅ Planning artifacts exist in worktree
- ✅ All required artifacts present
- ✅ Your feature/fix implemented
- ✅ Git feature branch created

> **Note**: During the sprint, all work happens in the isolated worktree (`.worktrees/sprint-X-*/`). After the sprint completes and the PR is merged, planning artifacts move to `planning/active/sprint-X-*/` in the main repository.

---

## What's Next?

### Learn More About Sprint Protocol

- **[Getting Started Guide](documentation/getting-started/README.md)** - Complete walkthrough
- **[Sprint Protocol Primer](documentation/guides/sprint-protocol-primer.md)** - Understand the methodology
- **[First Sprint Example](examples/first-sprint/)** - See a complete sprint
- **[Sprint Protocol Reference](AGENTS.md)** - Full specification

### Try More Features

```
Check sprint status
```

```
Complete sprint-1-abc123
```

```
Archive sprint-1-abc123
```

### Explore Documentation

- **Installation Guide**: [documentation/claude-desktop-installation-guide.md](documentation/claude-desktop-installation-guide.md)
- **Troubleshooting**: [documentation/troubleshooting-workflows.md](documentation/troubleshooting-workflows.md)
- **MCP Tools Reference**: [documentation/reference/mcp-tools.md](documentation/reference/mcp-tools.md)

---

## Troubleshooting Quick Tips

### Sprint won't start?

**Check**:
- Git repository initialized: `git status`
- Claude Desktop restarted after config change
- sprint-mcp tools visible in Claude: Ask "What sprint tools are available?"

### Configuration not working?

**Check**:
- JSON syntax valid (no trailing commas, quotes matched)
- Config file location correct for your OS
- Claude Desktop fully restarted (quit and reopen)

### sprint-mcp tools not appearing?

```bash
# Verify installation
which sprint-mcp

# Test manually
sprint-mcp
# Press Ctrl+C to exit

# Check Claude Desktop logs (macOS)
tail -f ~/Library/Logs/Claude/mcp*.log
```

### Need more help?

- **Full Troubleshooting Guide**: [documentation/troubleshooting-workflows.md](documentation/troubleshooting-workflows.md)
- **Installation Issues**: [documentation/claude-desktop-installation-guide.md#troubleshooting](documentation/claude-desktop-installation-guide.md#troubleshooting)
- **GitHub Issues**: [https://github.com/cnavta/sprint-mcp/issues](https://github.com/cnavta/sprint-mcp/issues)

---

## Alternative Installation Methods

### Using npx (No Installation)

**Configure Claude Desktop**:

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

**Pros**: Always latest version, no installation needed
**Cons**: Slower first startup, requires internet

### Project-Local Installation

```bash
cd /path/to/your/project
npm install --save-dev sprint-mcp
```

**Configure Claude Desktop**:

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "node",
      "args": ["/path/to/your/project/node_modules/sprint-mcp/dist/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**Pros**: Project-specific version, locked in package.json
**Cons**: More complex configuration

See [Full Installation Guide](documentation/claude-desktop-installation-guide.md) for details.

---

**Congratulations!** You've completed your first sprint. 🎉

Ready to transform your LLM-driven development workflow? Check out the [Getting Started Guide](documentation/getting-started/README.md) to learn more.

---

**Document Version**: 1.0
**Sprint**: sprint-21-0oh8mw
**Task**: P1-T02
**Status**: Draft
