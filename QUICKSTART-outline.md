# QUICKSTART.md Outline
**Task**: P1-T01
**Effort**: S (2-3 hours)
**Status**: Draft
**Date**: 2026-08-12

---

## Document Purpose

Create an ultra-concise 5-minute quickstart guide that enables a new user to:
1. Install sprint-mcp
2. Configure Claude Desktop
3. Start their first sprint
4. Validate success
5. Know where to go next

**Target**: <200 lines, <5 minutes to execute, no prior Sprint Protocol knowledge required

---

## Proposed Structure

### 1. Header Section
- **Title**: QUICKSTART - Get Started with sprint-mcp in 5 Minutes
- **Value Prop** (1 sentence): What sprint-mcp does
- **Prerequisites** (bulleted list):
  - Node.js 18+ installed
  - Claude Desktop installed
  - Git repository (existing or new project)
  - 5 minutes

---

### 2. Step 1: Install (30 seconds)
**Heading**: "Install sprint-mcp"

**Content**:
- Choose ONE installation method (recommend global for quickstart)
- Single command to copy-paste
- Expected output shown

**Example**:
```bash
npm install -g @anthropic-ai/sprint-mcp
```

**Validation**: How to verify it worked
```bash
sprint-mcp --version
```

---

### 3. Step 2: Configure Claude Desktop (1 minute)
**Heading**: "Configure Claude Desktop"

**Content**:
- Location of config file (OS-specific paths)
- Exact JSON to add (copy-paste ready)
- Where to place it in existing config

**Example**:
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp",
      "args": []
    }
  }
}
```

**Validation**: Restart Claude Desktop, look for sprint-mcp in MCP servers list

---

### 4. Step 3: Start Your First Sprint (2 minutes)
**Heading**: "Start Your First Sprint"

**Content**:
- Open Claude Desktop
- Navigate to your project directory (or create test project)
- Exact prompt to give Claude

**Prompt**:
```
Start a sprint. The goal is to add a simple greeting function that says "Hello, [name]!"
Owner: [your name]
```

**What to Expect**:
- Sprint ID created (e.g., sprint-1-abc123)
- Worktree created
- Manifest and planning artifacts generated
- Claude guides you through implementation

**During Sprint**:
- Claude will ask for implementation details
- Follow Claude's guidance through phases
- Sprint completes when Claude says "Sprint complete"

---

### 5. Step 4: Verify Success (30 seconds)
**Heading**: "Verify Your Sprint"

**Content**:
- Check that sprint directory exists: `ls planning/sprint-*/`
- Check that artifacts were created:
  - `sprint-manifest.yaml`
  - `implementation-plan.md`
  - `request-log.md`
- Check that your code changes were made

**Success Indicators**:
- ✅ Sprint directory exists in `planning/`
- ✅ All required artifacts present
- ✅ Your feature/fix implemented
- ✅ Git branch created (feature/sprint-X-...)

---

### 6. Next Steps (30 seconds)
**Heading**: "What's Next?"

**Content**:
- Link to full Getting Started guide
- Link to Sprint Protocol documentation
- Link to Examples
- Link to Troubleshooting

**Formatted as**:
- **Learn More**: [Getting Started Guide](documentation/getting-started/README.md)
- **Understand the Protocol**: [Sprint Protocol Primer](documentation/guides/sprint-protocol-primer.md)
- **See Examples**: [First Sprint Example](examples/first-sprint/)
- **Need Help?**: [Troubleshooting](documentation/troubleshooting-workflows.md)

---

### 7. Footer Section
**Heading**: "Troubleshooting Quick Tips"

**Content** (very brief):
- Sprint won't start? Check: git repository initialized, Claude Desktop restarted
- Configuration not working? Check: JSON syntax, file location, restart Claude Desktop
- For detailed help: [Full Troubleshooting Guide](link)

---

## Content Guidelines

### Writing Style
- **Ultra-concise**: Every word counts
- **Action-oriented**: Use imperatives (Install, Configure, Start)
- **Copy-paste ready**: All commands and config blocks
- **Visual validation**: Show expected outputs
- **Progressive**: Each step builds on previous

### Formatting
- Use clear section headings
- Use code blocks for all commands and config
- Use checkboxes for validation steps
- Use callout boxes for important notes
- Keep paragraphs to 2-3 sentences max

### What to AVOID
- Long explanations of concepts
- Multiple options (choose ONE best path)
- Advanced topics
- Edge cases (save for full docs)
- Jargon without context

---

## Success Criteria

This outline succeeds if:
- ✅ Complete flow from install to first sprint in <5 minutes
- ✅ No assumptions about Sprint Protocol knowledge
- ✅ Clear success validation at each step
- ✅ Single "happy path" (no decision paralysis)
- ✅ Prominent links to detailed docs
- ✅ Ready to draft from (next task: P1-T02)

---

## Dependencies
- **None** - This is a starting task

## Next Task
- **P1-T02**: Draft QUICKSTART.md based on this outline

---

**Outline Status**: ✅ Complete
**Ready for Review**: Yes
**Ready for Drafting**: Yes
