# Claude Desktop Installation Guide

**Purpose**: Installation and configuration guide for sprint-mcp with Claude Desktop
**Last Updated**: 2026-08-01
**Target Audience**: End users installing sprint-mcp

---

## Overview

sprint-mcp is an MCP (Model Context Protocol) server that provides Sprint Protocol tooling for LLM-driven development workflows. This guide covers how to install and configure sprint-mcp for use with Claude Desktop.

---

## Prerequisites

### System Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **Claude Desktop**: Latest version
- **Operating System**: macOS, Linux, or Windows

### Verify Prerequisites

```bash
# Check Node.js version
node --version
# Should output: v18.x.x or higher

# Check npm version
npm --version
# Should output: 8.x.x or higher

# Check Claude Desktop is installed
# macOS: Check Applications folder
# Windows: Check Program Files
# Linux: Check installed applications
```

---

## Installation Methods

Choose one of the following installation methods:

### Method 1: Global Installation (Recommended)

**Best for**: Regular use, faster startup, version control

**Installation**:
```bash
npm install -g sprint-mcp
```

**Verification**:
```bash
# Verify installation
which sprint-mcp
# Should output: /usr/local/bin/sprint-mcp (or similar)

# Test execution (will start MCP server on stdio)
sprint-mcp
# Press Ctrl+C to exit
```

**Pros**:
- ✅ Simple Claude Desktop configuration
- ✅ Faster startup (already installed)
- ✅ Works offline after installation
- ✅ Version control (manual updates)

**Cons**:
- ⚠️ Requires manual updates (`npm update -g sprint-mcp`)
- ⚠️ Single version across all projects

---

### Method 2: npx (No Installation Required)

**Best for**: Trying sprint-mcp, always using latest version

**No installation needed** - npx downloads and runs on demand

**Pros**:
- ✅ No installation required
- ✅ Always uses latest version
- ✅ No global package pollution
- ✅ Easy to try before committing

**Cons**:
- ⚠️ Slower first startup (downloads package)
- ⚠️ Requires internet connection on first use
- ⚠️ Less version control

---

### Method 3: Project-Local Installation

**Best for**: Project-specific version pinning

**Installation**:
```bash
cd /path/to/your/project
npm install --save-dev sprint-mcp
```

**Pros**:
- ✅ Project-specific version (tracked in package.json)
- ✅ Version locked via package-lock.json
- ✅ Works offline after installation
- ✅ Consistent across team members

**Cons**:
- ⚠️ More complex Claude Desktop configuration
- ⚠️ Must install per project
- ⚠️ Takes disk space per project

---

## Claude Desktop Configuration

### Configuration File Location

**macOS**:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux**:
```
~/.config/Claude/claude_desktop_config.json
```

### Configuration for Global Installation

**Open config file**:
```bash
# macOS
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
nano ~/.config/Claude/claude_desktop_config.json

# Windows
notepad %APPDATA%\Claude\claude_desktop_config.json
```

**Add sprint-mcp configuration**:
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}
```

**With environment variables (optional)**:
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

### Configuration for npx

**Add to config file**:
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

**With environment variables**:
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "npx",
      "args": ["-y", "sprint-mcp"],
      "env": {
        "SPRINT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

### Configuration for Project-Local Installation

**Add to config file**:
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

**Example with specific project path**:
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "node",
      "args": ["/Users/username/projects/my-app/node_modules/sprint-mcp/dist/index.js"],
      "cwd": "/Users/username/projects/my-app"
    }
  }
}
```

---

## Verification

### 1. Restart Claude Desktop

After updating `claude_desktop_config.json`:

1. **Quit Claude Desktop completely**
   - macOS: Cmd+Q
   - Windows: File → Exit
   - Linux: Application menu → Quit

2. **Restart Claude Desktop**

3. **Wait 5-10 seconds** for MCP servers to initialize

### 2. Verify MCP Tools Available

Open a conversation in Claude Desktop and type:

```
Show me available MCP tools
```

or

```
What sprint tools are available?
```

**Expected output** (you should see):
- `start-sprint` - Initialize a new sprint
- `check-sprint-status` - Verify sprint state
- `update-sprint-status` - Update sprint status
- `complete-sprint` - Complete sprint with validation
- `cleanup-sprint` - Clean up completed sprint worktrees
- `regenerate-sprint-index` - Rebuild sprint index

### 3. Test a Tool

Try running a simple tool:

```
Check sprint status in my project
```

Claude should invoke the `check-sprint-status` tool.

---

## Troubleshooting

### Issue: MCP tools not appearing in Claude Desktop

**Solution 1: Verify configuration file**
```bash
# macOS - Check config exists and is valid JSON
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
python3 -m json.tool ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Solution 2: Check Claude Desktop logs**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Look for errors related to sprint-mcp
```

**Solution 3: Verify sprint-mcp is installed**
```bash
# For global installation
which sprint-mcp

# For npx
npx -y sprint-mcp --help

# For project-local
ls /path/to/project/node_modules/sprint-mcp/
```

**Solution 4: Restart Claude Desktop**
- Fully quit (not just close window)
- Wait 5 seconds
- Restart

### Issue: "command not found: sprint-mcp"

**For global installation**:
```bash
# Reinstall globally
npm install -g sprint-mcp

# Verify installation
which sprint-mcp
```

**For npx**:
```bash
# Test npx can find it
npx -y sprint-mcp

# Check internet connection (npx needs to download)
```

### Issue: "EACCES: permission denied"

**Solution**:
```bash
# Option 1: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Then reinstall
npm install -g sprint-mcp

# Option 2: Use sudo (not recommended)
sudo npm install -g sprint-mcp
```

### Issue: MCP server crashes on startup

**Check Node.js version**:
```bash
node --version
# Must be v18 or higher

# If too old, update Node.js
# macOS: brew upgrade node
# Linux: Use nvm or package manager
# Windows: Download from nodejs.org
```

**Check for errors**:
```bash
# Run sprint-mcp manually to see errors
sprint-mcp

# Or with npx
npx -y sprint-mcp
```

### Issue: Wrong version installed

**Check current version**:
```bash
# For global installation
npm list -g sprint-mcp

# For project-local
npm list sprint-mcp
```

**Update to latest**:
```bash
# For global installation
npm update -g sprint-mcp

# For npx (automatic - always uses latest)

# For project-local
npm update sprint-mcp
```

**Install specific version**:
```bash
# Global
npm install -g sprint-mcp@0.1.0

# Project-local
npm install --save-dev sprint-mcp@0.1.0
```

---

## Configuration Options

### Environment Variables

sprint-mcp supports the following environment variables:

#### SPRINT_ROOT
**Default**: Current working directory
**Purpose**: Set default project root for sprint operations

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "env": {
        "SPRINT_ROOT": "/Users/username/projects/my-app"
      }
    }
  }
}
```

#### NODE_ENV
**Default**: production
**Purpose**: Set environment mode

```json
{
  "env": {
    "NODE_ENV": "development"
  }
}
```

### Multiple Projects Configuration

**Configure different sprint-mcp instances per project**:

```json
{
  "mcpServers": {
    "sprint-mcp-project-a": {
      "command": "sprint-mcp",
      "env": {
        "SPRINT_ROOT": "/Users/username/projects/project-a"
      }
    },
    "sprint-mcp-project-b": {
      "command": "sprint-mcp",
      "env": {
        "SPRINT_ROOT": "/Users/username/projects/project-b"
      }
    }
  }
}
```

---

## Updating sprint-mcp

### For Global Installation

```bash
# Check current version
npm list -g sprint-mcp

# Update to latest
npm update -g sprint-mcp

# Or install specific version
npm install -g sprint-mcp@0.2.0

# Verify new version
npm list -g sprint-mcp
```

**After updating**:
1. Restart Claude Desktop
2. Verify new version working

### For npx

**No action needed** - npx always uses latest version

To use specific version:
```json
{
  "command": "npx",
  "args": ["-y", "sprint-mcp@0.1.0"]
}
```

### For Project-Local

```bash
cd /path/to/your/project

# Update to latest
npm update sprint-mcp

# Or install specific version
npm install --save-dev sprint-mcp@0.2.0
```

**After updating**:
1. Restart Claude Desktop
2. Verify new version working

---

## Uninstallation

### Remove Global Installation

```bash
# Uninstall globally
npm uninstall -g sprint-mcp

# Verify removed
which sprint-mcp
# Should output: sprint-mcp not found
```

### Remove from Claude Desktop Configuration

1. Open `claude_desktop_config.json`
2. Remove sprint-mcp section:
```json
{
  "mcpServers": {
    // Remove this entire block
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}
```
3. Save file
4. Restart Claude Desktop

### Remove Project-Local Installation

```bash
cd /path/to/your/project
npm uninstall sprint-mcp
```

---

## Getting Help

### Documentation

- **Sprint Protocol**: See AGENTS.md in package
- **GitHub**: https://github.com/cnavta/sprint-mcp
- **npm Package**: https://www.npmjs.com/package/sprint-mcp

### Reporting Issues

1. Check existing issues: https://github.com/cnavta/sprint-mcp/issues
2. Create new issue with:
   - Installation method used
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Error messages (if any)
   - Claude Desktop version

### Debug Mode

Enable verbose logging:

```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "env": {
        "DEBUG": "sprint-mcp:*"
      }
    }
  }
}
```

---

## Quick Reference

### Installation Commands

```bash
# Global (recommended)
npm install -g sprint-mcp

# npx (no install)
# Just configure in Claude Desktop

# Project-local
npm install --save-dev sprint-mcp
```

### Configuration Snippets

```json
// Global installation
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}

// npx (no installation)
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "npx",
      "args": ["-y", "sprint-mcp"]
    }
  }
}
```

### Verification

```bash
# Check installation
which sprint-mcp    # Global
npm list -g sprint-mcp

# Test run
sprint-mcp
# Press Ctrl+C to exit
```

---

**Document Version**: 1.0
**Last Updated**: 2026-08-01
**Applies to**: sprint-mcp v0.1.0+
