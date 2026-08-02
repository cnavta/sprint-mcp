# NPM Distribution Guide

**Last Updated**: 2026-08-01
**Status**: Architecture Documentation
**Prepared By**: Lead Architect

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Distribution Strategy](#distribution-strategy)
4. [Package Configuration](#package-configuration)
5. [Build Process](#build-process)
6. [Pre-Publish Checklist](#pre-publish-checklist)
7. [Publishing Process](#publishing-process)
8. [Post-Publish Verification](#post-publish-verification)
9. [Installation Methods](#installation-methods)
10. [Architectural Decisions](#architectural-decisions)

---

## Overview

This guide documents how to prepare and publish sprint-mcp as an npm package. Since this is an MCP (Model Context Protocol) server rather than a traditional library, the distribution strategy differs from typical npm packages.

**Key Characteristics**:
- MCP server consumed by Claude Desktop, not imported as a library
- TypeScript source compiled to JavaScript
- Distributed as executable binary via npm
- Version synchronized with `architecture.yaml`

---

## Current State Analysis

### ✅ Ready
- TypeScript source in `src/`
- Build configuration (`tsconfig.json`)
- `package.json` with basic metadata
- MCP server entry point (`src/index.ts`)
- Version management (`architecture.yaml` as SSOT)
- Build scripts (`npm run build`)

### ⚠️ Needs Configuration
- Package.json missing distribution fields
- No `.npmignore` or `files` whitelist
- No npm binary configuration
- No installation documentation
- No pre-publish automation

### ❌ Missing
- License file
- Comprehensive README for npm users
- npm namespace decision (@org/sprint-mcp vs sprint-mcp)
- CI/CD publishing automation

---

## Distribution Strategy

### Recommended Approach: Dual Installation Support

**Primary: Global Installation**
```bash
npm install -g sprint-mcp
```

**Secondary: npx (No Installation)**
```bash
npx -y sprint-mcp
```

**Rationale**:
- Global installation provides simpler Claude Desktop configuration
- npx supports one-off usage and always-latest behavior
- Both methods work seamlessly with MCP protocol

---

## Package Configuration

### Required package.json Updates

**File**: `package.json`

```json
{
  "name": "sprint-mcp",
  "version": "0.1.0",
  "description": "MCP server providing Sprint Protocol tooling for LLM-driven development workflows",
  "keywords": [
    "mcp",
    "model-context-protocol",
    "sprint",
    "workflow",
    "llm",
    "claude",
    "development",
    "testing",
    "git-worktree"
  ],
  "author": "Your Name <email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/cnavta/sprint-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/cnavta/sprint-mcp/issues"
  },
  "homepage": "https://github.com/cnavta/sprint-mcp#readme",

  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "sprint-mcp": "dist/index.js"
  },

  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "AGENTS.md"
  ],

  "engines": {
    "node": ">=18.0.0"
  },

  "publishConfig": {
    "access": "public"
  },

  "scripts": {
    "prepublishOnly": "npm run build && npm test",
    "prepack": "npm run build"
  }
}
```

### File Inclusion Strategy

**Option A: `files` Field (Recommended)**

Explicitly whitelist what gets published:

```json
{
  "files": [
    "dist/",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "AGENTS.md"
  ]
}
```

**Pros**:
- Explicit control over published files
- Safer (opt-in vs opt-out)
- Clear what users receive

**Option B: `.npmignore`**

See [npmignore-template.md](./npmignore-template.md) for complete example.

**Pros**:
- More flexible exclusion patterns
- Familiar to .gitignore users

**Recommendation**: Use `files` field for safety and clarity.

---

## Build Process

### TypeScript Configuration

Ensure `tsconfig.json` generates proper distribution files:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "planning",
    ".worktrees",
    "deprecated",
    "preview"
  ]
}
```

### Build Verification

```bash
# Clean build
rm -rf dist/
npm run build

# Verify output structure
ls -la dist/
# Expected:
# dist/
#   ├── index.js
#   ├── index.d.ts
#   ├── common/
#   ├── tools/
#   └── compression/
```

### Executable Entry Point

**Ensure `src/index.ts` has shebang for binary execution**:

```typescript
#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// ... rest of code
```

**After build, verify `dist/index.js` has shebang**:
```bash
head -n 1 dist/index.js
# Should output: #!/usr/bin/env node
```

---

## Pre-Publish Checklist

### 1. Version Management

```bash
# Update version using integrated release tool
# This updates architecture.yaml AND package.json
brat release <patch|minor|major>

# Verify sync
grep version architecture.yaml
grep version package.json
```

### 2. Build Verification

```bash
# Clean build
npm run build

# Verify no TypeScript errors
npx tsc --noEmit

# Check dist/ contents
tree dist/  # or ls -R dist/
```

### 3. Test Verification

```bash
# Run full test suite
npm test

# Run with coverage
npm run test:coverage

# Ensure all tests passing
# Current: 224 passing, 0 failing
```

### 4. Package Testing with `npm pack`

```bash
# Create tarball without publishing
npm pack

# This creates: sprint-mcp-0.1.0.tgz

# Inspect contents
tar -tzf sprint-mcp-0.1.0.tgz

# Verify includes:
# ✅ package/dist/
# ✅ package/README.md
# ✅ package/LICENSE
# ✅ package/AGENTS.md

# Verify excludes:
# ❌ package/src/
# ❌ package/planning/
# ❌ package/.worktrees/
# ❌ package/__tests__/
# ❌ package/node_modules/
```

### 5. Installation Testing

```bash
# Test in isolated environment
mkdir /tmp/test-sprint-mcp
cd /tmp/test-sprint-mcp

# Test global installation from tarball
npm install -g /path/to/sprint-mcp-0.1.0.tgz

# Verify binary works
which sprint-mcp
# Should output: /usr/local/bin/sprint-mcp (or similar)

# Test execution (requires MCP environment)
sprint-mcp
# Should start MCP server on stdio

# Clean up
npm uninstall -g sprint-mcp
```

### 6. Documentation Review

- [ ] README.md includes installation instructions
- [ ] README.md includes Claude Desktop configuration
- [ ] CHANGELOG.md updated with version changes
- [ ] AGENTS.md included (protocol reference)
- [ ] LICENSE file present

### 7. Dependency Audit

```bash
# Check for vulnerabilities
npm audit

# Check for outdated dependencies
npm outdated

# Update if needed (test thoroughly after)
npm update
```

---

## Publishing Process

### Dry Run (Recommended First Time)

```bash
# Simulate publish without actually publishing
npm publish --dry-run

# Review output carefully
# Verify file list
# Check package size
```

### Actual Publish

```bash
# Authenticate with npm (first time only)
npm login

# Publish to npm registry
npm publish

# For scoped packages (@org/sprint-mcp):
npm publish --access public
```

### Tag Git Release

```bash
# Tag the release
git tag v0.1.0

# Push tag to remote
git push origin v0.1.0

# Create GitHub release (optional)
gh release create v0.1.0 --generate-notes
```

---

## Post-Publish Verification

### 1. Verify on npmjs.com

- Visit https://www.npmjs.com/package/sprint-mcp
- Check package page renders correctly
- Verify README displays properly
- Check "Files" tab for included files
- Verify version number
- Check download statistics (after 24 hours)

### 2. Test Fresh Installation

```bash
# Test global installation
npm install -g sprint-mcp@0.1.0

# Verify installation
which sprint-mcp
sprint-mcp --help  # If help flag implemented

# Test with Claude Desktop
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "sprint-mcp"
    }
  }
}

# Restart Claude Desktop
# Verify MCP tools appear
```

### 3. Test npx Usage

```bash
# Test npx (no installation)
npx -y sprint-mcp@0.1.0

# Should download and execute
```

### 4. Update Documentation

- [ ] Update project README with npm install instructions
- [ ] Update CHANGELOG.md with release notes
- [ ] Create GitHub release with notes
- [ ] Announce in relevant channels (if applicable)

---

## Installation Methods

### Method 1: Global Installation (Recommended)

**Install**:
```bash
npm install -g sprint-mcp
```

**Claude Desktop Configuration**:
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

**Pros**:
- Simple configuration
- Faster startup (already installed)
- Version control (manual updates)

**Cons**:
- Requires manual updates (`npm update -g sprint-mcp`)
- May have version conflicts across projects

### Method 2: npx (No Installation)

**Claude Desktop Configuration**:
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

**Pros**:
- No installation required
- Always uses latest version (with `-y`)
- No global package pollution

**Cons**:
- Slower first startup (downloads package)
- Requires internet connection
- Less version control

### Method 3: Project-Local Installation

**Install**:
```bash
cd your-project
npm install --save-dev sprint-mcp
```

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "sprint-mcp": {
      "command": "node",
      "args": ["./node_modules/sprint-mcp/dist/index.js"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

**Pros**:
- Project-specific version
- Lockfile control (package-lock.json)
- Works offline

**Cons**:
- More complex configuration
- Must install per-project

---

## Architectural Decisions

### Decision 1: Package Name

**Options**:
- `sprint-mcp` (root namespace)
- `@org/sprint-mcp` (scoped)

**Recommendation**: Start with `sprint-mcp` (root namespace)

**Rationale**:
- Simpler for users to install and remember
- No organization required
- Can migrate to scoped later if needed
- Check availability: `npm view sprint-mcp` (404 = available)

**Future**: If namespace conflicts arise, migrate to `@sprint-protocol/mcp` or similar.

### Decision 2: Include Protocol Documentation

**Question**: Include AGENTS.md in npm package?

**Recommendation**: Yes, include AGENTS.md (compressed version)

**Rationale**:
- Users need protocol reference
- AGENTS.md is already optimized for LLM consumption (~50% smaller than uncompressed)
- Adds ~50KB to package (negligible)

**Exclude**:
- AGENTS-uncompressed.md (verbose, development artifact)
- CLAUDE.md (repo-specific, not relevant to npm users)

### Decision 3: Include Examples

**Question**: Include `examples/` directory in npm package?

**Recommendation**: No, exclude from npm, link to GitHub

**Rationale**:
- Examples evolve faster than releases
- Keeps package size small
- Users can view latest examples on GitHub
- Include link in README: "See examples: https://github.com/..."

### Decision 4: Include Sprint Artifacts

**Question**: Include `planning/` sprint artifacts in npm package?

**Recommendation**: No, exclude completely

**Rationale**:
- Sprint artifacts are development history, not user-facing
- Adds significant size (~100s of KB)
- Not relevant to npm users
- Available on GitHub for those interested

### Decision 5: Source Maps

**Question**: Include source maps in npm package?

**Recommendation**: Yes, include source maps

**Rationale**:
- Helps debugging for users
- Modern bundlers handle source maps well
- TypeScript declaration maps aid IDE support
- Small size increase (~10-20%)

**Configuration**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "declarationMap": true
  }
}
```

### Decision 6: Version Management

**Question**: How to manage version updates?

**Recommendation**: Use existing `brat release` tool (already syncs architecture.yaml ↔ package.json)

**Workflow**:
```bash
# Update version (syncs both files)
brat release <patch|minor|major>

# Commit version bump
git add architecture.yaml package.json package-lock.json
git commit -m "chore: bump version to 0.2.0"

# Tag release
git tag v0.2.0
git push --tags

# Publish to npm
npm publish
```

**Rationale**:
- architecture.yaml already defined as version SSOT
- `brat release` already keeps files in sync
- Consistent with project conventions

---

## License Considerations

**Current State**: No LICENSE file

**Action Required**: Add license before npm publish

**Options**:

1. **MIT License** (Recommended for open source)
   - Most permissive
   - Widely used in npm ecosystem
   - Good for community adoption

2. **Apache 2.0**
   - Includes patent grant
   - More corporate-friendly
   - Slightly more restrictive

3. **ISC**
   - Similar to MIT, simpler language
   - Used by npm itself

**Next Steps**:
1. Choose license (recommend MIT for maximum adoption)
2. Create LICENSE file in project root
3. Update package.json `license` field
4. Add license header to source files (optional)

---

## CI/CD Automation (Future Enhancement)

### GitHub Actions Workflow

**File**: `.github/workflows/publish.yml`

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Setup**:
1. Generate npm token: https://www.npmjs.com/settings/[username]/tokens
2. Add as GitHub secret: Settings → Secrets → NPM_TOKEN
3. Create GitHub release → triggers workflow → auto-publishes to npm

---

## Troubleshooting

### Issue: npm pack includes unwanted files

**Solution**: Use `files` field in package.json (whitelist approach)

```json
{
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ]
}
```

### Issue: Binary not executable after npm install

**Solution**: Ensure shebang in entry point and proper permissions

```typescript
// src/index.ts (first line)
#!/usr/bin/env node
```

```bash
# After build, verify
head -n 1 dist/index.js

# Fix permissions if needed
chmod +x dist/index.js
```

### Issue: TypeScript types not working in published package

**Solution**: Ensure declaration files generated and referenced

```json
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true
  }
}

// package.json
{
  "types": "dist/index.d.ts"
}
```

### Issue: Version mismatch between architecture.yaml and package.json

**Solution**: Always use `brat release` to update versions

```bash
# Don't manually edit version
# Use release tool:
brat release patch
```

---

## Next Steps

### Immediate (Before First Publish)

1. **Add LICENSE file** (choose MIT, Apache 2.0, or ISC)
2. **Update package.json** with distribution fields
3. **Create comprehensive README.md** with installation instructions
4. **Test `npm pack`** and verify contents
5. **Choose namespace** (sprint-mcp vs @org/sprint-mcp)

### Short Term (Sprint 12 Candidate)

6. **Create .npmignore** or finalize `files` field
7. **Document installation methods** in README
8. **Test global and npx installation** locally
9. **Run npm publish --dry-run**
10. **Perform first publish** to npm registry

### Medium Term

11. **Set up CI/CD** with GitHub Actions
12. **Create automated release process**
13. **Monitor download statistics**
14. **Gather user feedback** on installation experience

---

## References

- [npm Documentation - package.json](https://docs.npmjs.com/cli/v9/configuring-npm/package-json)
- [npm Documentation - Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [MCP Specification](https://modelcontextprotocol.io/)
- [TypeScript Handbook - Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

**Document Version**: 1.0
**Last Reviewed**: 2026-08-01
**Next Review**: Before first npm publish
