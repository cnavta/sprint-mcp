# Developer Quickstart

**Goal**: Get from zero to your first sprint in 5 minutes.

**Audience**: Developers comfortable with CLI, git, and npm.

---

## Prerequisites

You need:
- **Node.js** v18+ (`node --version`)
- **npm** v8+ (`npm --version`)
- **Claude Desktop** (latest version)
- **Git** repository (existing or new)

Got 'em? Let's go! 🚀

---

## Step 1: Install sprint-mcp (30 seconds)

### Option A: Global Install (Recommended)
```bash
npm install -g sprint-mcp
```

✅ **Verify**: `which sprint-mcp` should show installation path

### Option B: Try with npx (No Install)
```bash
# No install needed - npx runs it on demand
# Configure Claude Desktop to use: npx -y sprint-mcp
```

**For now, continue with Option A (global)**. Option B works the same way.

---

## Step 2: Configure Claude Desktop (2 minutes)

### macOS
1. Open Claude Desktop
2. Go to **Claude** → **Settings** → **Developer** (Cmd+,)
3. Click **Edit Config**
4. Add sprint-mcp to `mcpServers`:

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}
```

5. **Save** and **Restart Claude Desktop**

### Windows/Linux
Same steps, find config at:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

✅ **Verify**: Restart Claude Desktop. Type "Start sprint" in a new chat. Claude should recognize the command.

**Troubleshooting**: If Claude doesn't recognize commands, check:
- Config file syntax (valid JSON)
- `sprint-mcp` command works in terminal
- Claude Desktop fully restarted

---

## Step 3: Choose Your Sprint Mode (30 seconds)

sprint-mcp supports two modes:

### 🎯 Planned Sprint
**When**: You know what you're building
**Example**: "Add OAuth2 authentication to user dashboard"
**Outcome**: Clear deliverables, professional workflow

### 🎨 Structure the Vibe
**When**: You're exploring, experimenting, prototyping
**Example**: "Explore WebGL particle systems and see what's cool"
**Outcome**: Organized experimentation, nothing lost

**Not sure?** Start with Vibe Mode—less pressure, more fun!

---

## Step 4: Start Your First Sprint (2 minutes)

### In Claude Desktop:

**For Planned Sprint**:
```
Start sprint

Title: Add user authentication
Goal: Implement basic username/password auth with session management
```

**For Vibe Sprint**:
```
Start sprint

Title: Exploring WebGL shaders
Goal: Try different particle effects and see what looks cool
```

Claude will:
1. Create a git worktree (isolated workspace)
2. Create a feature branch
3. Set up sprint planning directory
4. Generate a sprint manifest

✅ **Verify**: Check `.worktrees/sprint-1-*/` directory exists

---

## Step 5: Work in Your Sprint (Variable)

### Planned Sprint Workflow:
1. **Plan**: Claude creates `implementation-plan.md`
2. **Approve**: Review and approve the plan
3. **Implement**: Claude writes code, you review
4. **Validate**: Run `validate_deliverable.sh`
5. **Complete**: Say "Sprint complete" when done

### Vibe Sprint Workflow:
1. **Explore**: Try things, break things, experiment
2. **Capture**: sprint-mcp tracks everything automatically
3. **Refine**: When you find something good, polish it
4. **Complete**: Say "Sprint complete" whenever you're ready

**Key insight**: Everything happens in the isolated worktree. Your main branch stays clean!

---

## Step 6: Complete Your Sprint (30 seconds)

When you're done (or want to pause):

```
Sprint complete
```

Claude will:
1. Run validation (if applicable)
2. Create verification report
3. **Attempt to create a Pull Request** (requires GitHub CLI)
4. Archive sprint artifacts

✅ **Verify**: Check GitHub for your PR, or find it in git with `git log`

---

## What You Just Did

In 5 minutes, you:
- ✅ Installed sprint-mcp
- ✅ Configured Claude Desktop
- ✅ Started your first sprint
- ✅ Understood planned vs vibe modes
- ✅ Completed a full sprint cycle

**Your work is**:
- Organized in git worktree
- Fully traceable (every change logged)
- Reversible (isolated branch)
- Shareable (PR ready)

---

## Next Steps

### Learn More
- **[Sprint Protocol Primer](./05-understanding-protocol.md)** - Understand how sprints work (5 min read)
- **[Project Setup Guide](./02-project-setup.md)** *(Coming Soon)* - Add sprint-mcp to existing projects
- **[First Sprint Tutorial (Planned)](./03-first-sprint-planned.md)** *(Coming Soon)* - Complete walkthrough
- **[First Sprint Tutorial (Vibe)](./04-first-sprint-vibe.md)** *(Coming Soon)* - Exploratory workflow

### Deep Dives
- **[Claude Desktop Installation Guide](../../claude-desktop-installation-guide.md)** - Full installation details
- **[Sprint Protocol (AGENTS.md)](../../../AGENTS.md)** - Complete protocol specification
- **[Architecture](../../../architecture.yaml)** - System design

### Need Help?
- **[FAQ for Developers](../../FAQ-DEVELOPERS.md)** *(Coming Soon)*
- **[Troubleshooting](../../guides/troubleshooting/developers.md)** *(Coming Soon)*
- **[GitHub Issues](https://github.com/cnavta/sprint-mcp/issues)** - Report bugs or request features

---

## Common Questions

**Q: Can I have multiple sprints active?**
A: Yes! Each sprint runs in its own isolated git worktree, so you can work on multiple features in parallel without conflicts. Great for multi-agent workflows or exploring different approaches simultaneously.

**Q: What if I want to abandon a sprint?**
A: Say "Force complete sprint" - Claude will document what was done and close it.

**Q: Do I need to create PRs manually?**
A: No! Claude attempts to create PRs automatically using GitHub CLI. If it fails, it logs the error.

**Q: Can I use this with other LLMs?**
A: sprint-mcp is an MCP server, so any MCP-compatible LLM can use it. But it's optimized for Claude.

**Q: Is this only for software?**
A: No! While this quickstart focuses on developers, sprint-mcp works for ANY structured work. See [Choose Your Path](../use-cases/choosing-your-path.md) for non-coding use cases.

---

## Pro Tips

### Vibe Mode Power Users
- Start sprints with vague goals: "Experiment with X"
- Let goals evolve as you discover cool things
- When something clicks, formalize it in the plan
- Complete when you're satisfied (no pressure for "done")

### Planned Sprint Power Users
- Be specific in your initial goal
- Review the implementation plan carefully
- Ask Claude to adjust the plan before approving
- Use `validate_deliverable.sh` frequently during work

### Workflow Optimization
- Keep sprints small (1-14 hours)
- One feature/experiment per sprint
- Don't mix exploration and production in same sprint
- Use git worktrees to your advantage (experiment fearlessly!)

---

**Ready to sprint? Say "Start sprint" in Claude Desktop!** 🚀

---

**Version**: 1.0
**Last Updated**: 2026-08-13
**Part of**: Sprint 23 - Tri-Audience NUX Implementation
