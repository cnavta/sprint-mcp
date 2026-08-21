# Project Setup Guide

**Audience**: Developers
**Read time**: ~15 minutes
**Prerequisites**: None (we'll install everything)
**Related**: [Developer Quickstart](QUICKSTART-DEVELOPERS.md) | [First Planned Sprint](03-first-sprint-planned.md) *(Coming Soon)* | [First Vibe Sprint](04-first-sprint-vibe.md) *(Coming Soon)*

---

## Overview

This guide walks you through adding sprint-mcp to an existing project (or starting a new one). By the end, you'll have:

- sprint-mcp MCP server installed and configured
- Claude Desktop connected to your project
- Sprint directory structure set up
- Understanding of worktree model
- Ready to start your first sprint

**Time required**: 15-30 minutes for basic setup

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Repository Setup](#repository-setup)
4. [Architecture Configuration (Optional)](#architecture-configuration-optional)
5. [Planned Mode Setup](#planned-mode-setup)
6. [Vibe Mode Setup](#vibe-mode-setup)
7. [First Sprint Walkthrough](#first-sprint-walkthrough)
8. [Common Issues & Solutions](#common-issues--solutions)
9. [Verification](#verification)

---

## Prerequisites

### Required

**1. Git Repository**

Sprint-mcp requires a Git repository (local or remote):

```bash
# Check if you have a Git repo
git status

# If not, initialize one
git init
git add .
git commit -m "Initial commit"
```

**Why**: Sprint-mcp uses Git worktrees and branches for sprint isolation.

**2. Node.js** (for sprint-mcp itself)

Version: Node.js 18+ recommended

```bash
# Check Node.js version
node --version

# If not installed, download from: https://nodejs.org/
```

**Why**: sprint-mcp is a Node.js-based MCP server.

**3. Claude Desktop**

Download from: https://claude.ai/download

**Why**: Claude Desktop is the MCP client that connects to sprint-mcp.

### Optional (Project-Specific)

**Your project may require**:
- Node.js/npm (if JavaScript/TypeScript project)
- Python/pip (if Python project)
- Other language runtimes
- Database servers
- External services

**Note**: sprint-mcp works with projects in any language. The MCP server itself needs Node.js, but your project can be Python, Rust, Go, etc.

---

## Installation

### Step 1: Install sprint-mcp MCP Server

**Option A: Global Installation** (Recommended)

```bash
npm install -g sprint-mcp
```

**Option B: Local Installation** (Per-project)

```bash
# From your project root
npm install --save-dev sprint-mcp
```

**Verify installation**:

```bash
# Global
sprint-mcp --version

# Local
npx sprint-mcp --version
```

---

### Step 2: Configure Claude Desktop

Claude Desktop needs to know about the sprint-mcp MCP server.

**Locate Claude Desktop config**:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Edit the config** (create if doesn't exist):

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "args": [],
      "env": {
        "SPRINT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

**Replace** `/absolute/path/to/your/project` with your project's absolute path:

```bash
# Get absolute path (run from project root)
pwd
# Copy the output and paste into SPRINT_ROOT
```

**Example** (macOS):

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "args": [],
      "env": {
        "SPRINT_ROOT": "/Users/jane/projects/my-saas-app"
      }
    }
  }
}
```

**If you used local installation**, modify `command`:

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "npx",
      "args": ["sprint-mcp"],
      "env": {
        "SPRINT_ROOT": "/absolute/path/to/your/project"
      }
    }
  }
}
```

---

### Step 3: Restart Claude Desktop

**Close and reopen Claude Desktop** for the configuration to take effect.

---

### Step 4: Verify MCP Connection

Open Claude Desktop and start a new conversation:

```
Check sprint status
```

**Expected response**:

```
✅ No active sprints. Ready to start a new sprint.
```

If you see this, sprint-mcp is connected! 🎉

**If you see an error**, jump to [Common Issues](#common-issues--solutions).

---

## Repository Setup

### Step 1: Create Planning Directory

Sprint-mcp stores all sprint artifacts in `planning/`:

```bash
# From your project root
mkdir -p planning
```

**What goes in `planning/`**:

```
planning/
  active/                    # Active/recent sprints (after migration)
    sprint-1-abc123/        # Sprint directory
      sprint-manifest.yaml  # Sprint metadata
      implementation-plan.md
      request-log.md
      validate_deliverable.sh
      verification-report.md
      retro.md
      key-learnings.md
  archive/                   # Archived sprints (optional)
    2026/
      sprint-12-xyz789/
  knowledge/                 # Aggregated learnings (optional)
    knowledge-base.yaml
  archive-config.yaml        # Archive configuration (optional)
  sprint-index.yaml          # Sprint registry (auto-generated)
```

**Note**: `planning/` directory is created in your main repo. During sprints, it's also present in worktrees.

---

### Step 2: Understand the Worktree Model

**What are Git worktrees?**

Git worktrees let you have multiple working directories from the same repository:

```
your-project/                # Main worktree (main branch)
  src/
  planning/
  README.md

your-project/.worktrees/     # Sprint worktrees
  sprint-1-abc123/           # Isolated workspace for sprint 1
    src/                     # Same code, different branch
    planning/
      sprint-1-abc123/       # Sprint artifacts
```

**Benefits**:
- ✅ Isolated workspace per sprint (no branch switching disruption)
- ✅ Safe experimentation (changes in worktree, not main)
- ✅ Multiple sprints can coexist (advanced)
- ✅ Clean separation between main work and sprint work

**How sprint-mcp uses worktrees**:

1. **Sprint start**: Creates `.worktrees/sprint-X-hash/` and feature branch
2. **During sprint**: All work happens in the worktree
3. **Sprint complete**: PR merges code + planning artifacts to main
4. **Cleanup**: Worktree can be removed (code is in main via PR)

**You don't manage worktrees manually**—sprint-mcp handles it.

---

### Step 3: Configure .gitignore

Add sprint-related patterns to `.gitignore`:

```bash
# .gitignore

# Node modules (if using Node.js)
node_modules/

# sprint-mcp worktrees (optional - some prefer to gitignore, others don't)
.worktrees/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
```

**Note on `.worktrees/`**:
- **Option A** (recommended): Gitignore `.worktrees/` - keeps repo clean, PRs contain the actual work
- **Option B**: Don't gitignore - allows sharing worktrees (advanced use case)

Most users choose Option A.

---

### Step 4: Commit Initial Setup

```bash
git add planning/ .gitignore
git commit -m "Add sprint-mcp planning directory and gitignore"
git push  # If using remote repo
```

**Basic setup complete!** You can now start sprints.

---

## Architecture Configuration (Optional)

**Skip this section if**:
- You just want to try sprint-mcp (use defaults)
- You're starting with vibe mode (minimal config)

**Read this section if**:
- You want custom project metadata
- You need sprint hooks (automation)
- You want custom validation rules

---

### What is architecture.yaml?

`architecture.yaml` is an **optional** configuration file at your project root:

```yaml
# architecture.yaml (example)

project:
  name: my-saas-app
  version: 1.2.3
  description: SaaS application for team collaboration

sprint:
  hooks:
    post-worktree-create: "npm ci && npm run build"
    pre-commit: "npm run lint"

  validation:
    required_files:
      - README.md
      - package.json

    custom_checks:
      - name: "No console.logs in production"
        command: "! grep -r 'console.log' src/ --include='*.ts'"
```

**Benefits**:
- Centralized project metadata
- Automated setup via hooks
- Custom validation rules
- LLM hints for code generation

---

### Creating architecture.yaml

**Minimal example**:

```yaml
# architecture.yaml
project:
  name: my-project
  version: 0.1.0
```

**With sprint hooks**:

```yaml
# architecture.yaml
project:
  name: my-project
  version: 0.1.0

sprint:
  hooks:
    # Run after worktree is created
    post-worktree-create: "npm ci && npm run build"

    # Run before each commit (optional)
    pre-commit: "npm run lint"
```

**With validation rules**:

```yaml
# architecture.yaml
project:
  name: my-project
  version: 0.1.0

sprint:
  validation:
    required_files:
      - README.md
      - package.json
      - tsconfig.json

    test_command: "npm test"
    build_command: "npm run build"
```

**Commit it**:

```bash
git add architecture.yaml
git commit -m "Add sprint-mcp architecture configuration"
```

---

## Planned Mode Setup

**Planned mode** is for when you know what you're building and have clear goals.

### What You Need for Planned Mode

**1. Validation Script Template**

Each planned sprint needs a `validate_deliverable.sh` script. Create a template:

```bash
# templates/validate_deliverable.sh

#!/bin/bash

set -e  # Exit on any error

echo "=== Sprint Deliverable Validation ==="

# 1. Install dependencies
echo "1. Installing dependencies..."
npm ci

# 2. Build project
echo "2. Building project..."
npm run build

# 3. Run tests
echo "3. Running tests..."
npm test

# 4. Lint code (optional)
echo "4. Linting code..."
npm run lint || true

# 5. Type check (if TypeScript)
echo "5. Type checking..."
npx tsc --noEmit || true

echo "=== Validation Complete ==="
```

**Customize for your stack**:
- **Python**: `pip install -r requirements.txt && pytest`
- **Rust**: `cargo build && cargo test`
- **Go**: `go build ./... && go test ./...`

**During each sprint**, you'll customize this template for specific deliverables.

---

### 2. CI/CD Integration (Optional)

**If you have CI/CD**, you can integrate sprint validation:

**GitHub Actions example**:

```yaml
# .github/workflows/sprint-validation.yml

name: Sprint Validation

on:
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Find and run validation script
        run: |
          # Find the validation script in PR
          VALIDATION_SCRIPT=$(find planning -name "validate_deliverable.sh" | head -1)

          if [ -f "$VALIDATION_SCRIPT" ]; then
            chmod +x "$VALIDATION_SCRIPT"
            "$VALIDATION_SCRIPT"
          else
            echo "No validation script found (OK for vibe sprints)"
          fi
```

**Benefits**:
- Automated validation on PR creation
- Ensures deliverables meet quality standards
- Works with planned sprints (vibe sprints can skip)

---

## Vibe Mode Setup

**Vibe mode** is for exploration, learning, and prototyping.

### What You Need for Vibe Mode

**Almost nothing!** That's the point of vibe mode.

**Minimal setup**:
1. ✅ Git repository (already have it)
2. ✅ sprint-mcp installed (already done)
3. ✅ `planning/` directory (already created)

**No need for**:
- ❌ Validation scripts (optional in vibe)
- ❌ Acceptance criteria (discover as you go)
- ❌ Upfront planning (direction emerges)

---

### Vibe Mode Configuration

**Optional `.viberc` file** (advanced):

```yaml
# .viberc (optional - for vibe mode defaults)

vibe:
  default_goal_prefix: "Explore"
  auto_create_examples_dir: true
  request_log_template: "verbose"  # or "minimal"
```

**Most users don't need this**—vibe mode works great with zero config.

---

## First Sprint Walkthrough

**Let's walk through starting a simple sprint to verify everything works.**

---

### Option 1: Quick Test Sprint (Vibe)

**Goal**: Verify sprint-mcp works

**In Claude Desktop**:

```
Start sprint: Test sprint-mcp setup
```

**Expected response**:

```
✅ Sprint sprint-1-abc123 initialized successfully!

Sprint Details:
- ID: sprint-1-abc123
- Title: Test sprint-mcp setup
- Worktree: .worktrees/sprint-1-abc123/
- Branch: feature/sprint-1-abc123-test-sprint-mcp-setup

Next Steps:
1. Change to sprint worktree: cd .worktrees/sprint-1-abc123/
2. Create implementation-plan.md (or just start exploring for vibe)
3. Work on your sprint
4. Complete sprint when ready
```

**Now test**:

```
Complete sprint
```

**Expected**:

```
✅ Sprint sprint-1-abc123 completed successfully!
- PR created: https://github.com/your-repo/pull/1
- Status updated to 'complete'
```

**Cleanup test sprint** (optional):

```
Cleanup sprint worktree for sprint-1-abc123
```

**If this worked**, sprint-mcp is fully operational! 🎉

---

### Option 2: Real First Sprint (Planned)

**Goal**: Plan and execute a real sprint

**In Claude Desktop**:

```
Start sprint: Add user authentication with email/password
```

Sprint-mcp creates the sprint. **Then**:

```
Create an implementation plan for adding email/password authentication
with bcrypt for hashing, JWT for sessions, and Postgres for storage.
Include a validation script.
```

Claude will create `implementation-plan.md` and `validate_deliverable.sh`.

**Review the plan**, then:

```
Approved. Proceed with implementation.
```

Claude will implement according to the plan, creating code, tests, and docs.

**When done**:

```
Complete sprint
```

PR is created automatically!

---

### Option 3: Real First Sprint (Vibe)

**Goal**: Explore and learn

**In Claude Desktop**:

```
Start sprint: Explore Redis caching strategies for our API
```

Sprint starts. **Then just explore**:

```
Let's try a simple in-memory cache first, then benchmark Redis
vs in-memory vs database-backed caching. Document performance
of each approach.
```

Claude will experiment, document findings in request log, and create prototypes.

**When you've learned enough**:

```
Complete sprint
```

Request log and learnings are captured!

---

## Common Issues & Solutions

### Issue 1: MCP Server Not Found

**Symptom**: Claude Desktop can't find sprint-mcp

```
Error: MCP server 'sprint-mcp' not found
```

**Solutions**:

**A) Check installation**:

```bash
# Global
which sprint-mcp

# If not found, reinstall
npm install -g sprint-mcp
```

**B) Check Claude Desktop config path**:

```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Verify "command": "sprint-mcp" is correct
```

**C) Use absolute path** (if global install not in PATH):

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "/usr/local/bin/sprint-mcp",  // Absolute path
      "args": [],
      "env": {
        "SPRINT_ROOT": "/absolute/path/to/project"
      }
    }
  }
}
```

**D) Restart Claude Desktop** after config changes.

---

### Issue 2: Git Worktree Errors

**Symptom**: Error creating worktree

```
fatal: 'sprint-1-abc123' is already checked out at '.worktrees/sprint-1-abc123'
```

**Solution**: Remove orphaned worktree

```bash
# List worktrees
git worktree list

# Remove the orphaned one
git worktree remove .worktrees/sprint-1-abc123

# Or force remove if needed
git worktree remove --force .worktrees/sprint-1-abc123
```

**Prevention**: Always use `Complete sprint` to properly finish sprints.

---

### Issue 3: SPRINT_ROOT Not Set or Incorrect

**Symptom**: sprint-mcp can't find project

```
Error: SPRINT_ROOT environment variable not set
```

**Solution**: Fix Claude Desktop config

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "args": [],
      "env": {
        "SPRINT_ROOT": "/Users/yourname/projects/your-project"  // Fix this
      }
    }
  }
}
```

**Get correct path**:

```bash
cd /path/to/your/project
pwd  # Copy this output
```

**Restart Claude Desktop** after fixing.

---

### Issue 4: Permission Denied

**Symptom**: Can't execute validation script

```
Permission denied: ./validate_deliverable.sh
```

**Solution**: Make script executable

```bash
chmod +x planning/sprint-X-hash/validate_deliverable.sh
```

**Prevention**: Scripts should be created with execute permissions, but Git might not preserve them.

---

### Issue 5: Node.js Version Too Old

**Symptom**: sprint-mcp won't run

```
Error: sprint-mcp requires Node.js 18 or higher
```

**Solution**: Update Node.js

```bash
# Check version
node --version

# If <18, update via:
# - https://nodejs.org/ (download installer)
# - nvm: nvm install 18 && nvm use 18
```

---

### Issue 6: Planning Directory Not Found

**Symptom**: sprint-mcp can't find `planning/`

```
Error: Planning directory not found
```

**Solution**: Create it

```bash
mkdir -p planning
git add planning/.gitkeep  # Ensure Git tracks it
git commit -m "Add planning directory"
```

---

## Verification

**Checklist to verify correct setup**:

### Core Setup

- [ ] Git repository initialized
- [ ] Node.js 18+ installed
- [ ] sprint-mcp installed (`sprint-mcp --version` works)
- [ ] Claude Desktop installed and running
- [ ] `claude_desktop_config.json` configured with sprint-mcp
- [ ] `SPRINT_ROOT` environment variable points to project root
- [ ] Claude Desktop restarted after config changes

### Repository Setup

- [ ] `planning/` directory exists
- [ ] `.gitignore` configured (optional but recommended)
- [ ] Initial commit created

### Connection Test

- [ ] `Check sprint status` in Claude Desktop returns valid response
- [ ] No MCP server errors in Claude Desktop

### Sprint Test

- [ ] Can start test sprint: `Start sprint: Test setup`
- [ ] Sprint worktree created at `.worktrees/sprint-X-hash/`
- [ ] Can complete test sprint: `Complete sprint`
- [ ] Can cleanup test sprint: `Cleanup sprint worktree for sprint-X-hash`

**If all checkboxes pass**, you're ready to use sprint-mcp! 🚀

---

### Test Sprint Creation & Cleanup

**Verify full workflow**:

```bash
# In Claude Desktop

# 1. Start test sprint
Start sprint: Verify sprint-mcp setup is working

# 2. Check worktree created
```

Then verify on command line:

```bash
ls .worktrees/  # Should show sprint-X-hash directory
git worktree list  # Should show the worktree
git branch  # Should show feature/sprint-X-hash-... branch
```

**Back in Claude Desktop**:

```
# 3. Complete sprint (creates PR)
Complete sprint

# 4. Cleanup worktree (removes local workspace, keeps PR)
Cleanup sprint worktree for sprint-X-hash
```

**Verify cleanup**:

```bash
ls .worktrees/  # Sprint directory should be gone
git worktree list  # Worktree should be removed
git branch  # Feature branch still exists (merged via PR)
```

**If all steps work**, setup is perfect!

---

## Next Steps

**You're ready to start using sprint-mcp!**

### Learn Sprint Modes

- **Planned mode**: [First Planned Sprint Tutorial](03-first-sprint-planned.md) *(Coming Soon)*
- **Vibe mode**: [First Vibe Sprint Tutorial](04-first-sprint-vibe.md) *(Coming Soon)*
- **Choosing**: [Choosing Your Path](../use-cases/choosing-your-path.md)

### Understand the Protocol

- [Sprint Protocol Overview](../shared/sprint-protocol-overview.md)
- [Understanding the Sprint Protocol](05-understanding-protocol.md)

### Explore Vibe Mode

- [Vibe Mode Philosophy](../shared/vibe-mode-philosophy.md)
- [What is Vibe Mode?](../../guides/vibe-mode/what-is-vibe-mode.md)
- [Vibe Mode Examples](../../guides/vibe-mode/vibe-examples.md)

### Advanced Topics

- **Archive system**: Auto-archive completed sprints
- **Knowledge base**: Extract learnings across sprints
- **Custom validation**: Add project-specific quality gates
- **Sprint hooks**: Automate setup and teardown
- **Multi-repo setup**: Use one sprint-mcp server for multiple projects

---

## Troubleshooting Help

**If you're still stuck after trying solutions above**:

1. **Check sprint-mcp logs**:
   - Claude Desktop → Settings → Developer → View Logs
   - Look for sprint-mcp MCP server errors

2. **Verify environment**:
   ```bash
   # Check all prerequisites
   git --version
   node --version
   sprint-mcp --version
   pwd  # Should be your project root
   echo $SPRINT_ROOT  # Should match pwd (macOS/Linux)
   ```

3. **Minimal test**:
   ```bash
   # Start sprint-mcp manually to see errors
   SPRINT_ROOT=$(pwd) sprint-mcp
   ```

4. **Report issue**:
   - GitHub: https://github.com/cnavta/sprint-mcp/issues
   - Include: OS, Node.js version, error message, steps to reproduce

---

## Summary

**Setup checklist**:

1. ✅ Prerequisites installed (Git, Node.js, Claude Desktop)
2. ✅ sprint-mcp installed and configured in Claude Desktop
3. ✅ `planning/` directory created
4. ✅ Worktree model understood (sprints are isolated)
5. ✅ Connection verified (`Check sprint status` works)
6. ✅ Test sprint created and cleaned up successfully

**You're ready to**:
- Start planned sprints with clear goals
- Start vibe sprints for exploration
- Let sprint-mcp manage worktrees, branches, and sprint artifacts
- Capture all your work in structured request logs

**Next**: Start your first real sprint! 🚀

---

**Document Version**: 1.0
**Last Updated**: 2026-08-13
**Part of**: Sprint 24 (P1-T05) - Project Setup Documentation
**Addresses**: Sprint 21 critical gap - comprehensive onboarding for new users
