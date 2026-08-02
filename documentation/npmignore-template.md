# .npmignore Template

This file defines what should be **excluded** from the npm package when publishing sprint-mcp.

**Note**: Using the `files` field in package.json is recommended over .npmignore for explicit control. This template is provided as an alternative approach.

---

## Complete .npmignore Template

**File**: `.npmignore` (create in project root)

```bash
# ==============================================================================
# NPM IGNORE - Sprint MCP
# ==============================================================================
# This file defines what gets excluded from npm package distribution
# Alternative: Use "files" field in package.json (recommended)

# ==============================================================================
# Source Files (Do Not Publish)
# ==============================================================================
src/
*.ts
!*.d.ts                    # Include TypeScript declaration files
tsconfig.json
tsconfig.*.json

# ==============================================================================
# Tests (Do Not Publish)
# ==============================================================================
__tests__/
*.test.ts
*.test.js
*.spec.ts
*.spec.js
coverage/
.nyc_output/
jest.config.js
jest.config.ts

# ==============================================================================
# Sprint Artifacts (Do Not Publish)
# ==============================================================================
planning/
.worktrees/
deprecated/
preview/
examples/                  # Link to GitHub instead
AGENTS-uncompressed.md     # Only include compressed AGENTS.md
CLAUDE.md                  # Repo-specific, not for npm users

# ==============================================================================
# Development Files (Do Not Publish)
# ==============================================================================
.vscode/
.claude/
.idea/
*.swp
*.swo
*~
.DS_Store

# Environment
.env
.env.*
!.env.example

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# ==============================================================================
# Git Files (Do Not Publish)
# ==============================================================================
.git/
.gitignore
.gitattributes
.github/                   # CI/CD workflows not needed in package

# ==============================================================================
# Build Artifacts (Temporary)
# ==============================================================================
*.tgz
*.tar.gz

# ==============================================================================
# Documentation (Selective)
# ==============================================================================
docs/                      # Development docs
documentation/             # Architecture docs
!README.md                 # DO include README
!LICENSE                   # DO include LICENSE
!CHANGELOG.md              # DO include CHANGELOG
!AGENTS.md                 # DO include protocol reference

# ==============================================================================
# Dependencies
# ==============================================================================
node_modules/
.pnp
.pnp.js
.yarn/
.npm/

# ==============================================================================
# IDE and Editor Files
# ==============================================================================
.vscode/
.idea/
*.sublime-project
*.sublime-workspace
*.code-workspace

# ==============================================================================
# OS Files
# ==============================================================================
.DS_Store
Thumbs.db
Desktop.ini

# ==============================================================================
# Misc
# ==============================================================================
.eslintcache
.stylelintcache
.cache/
```

---

## Verification

After creating `.npmignore`, verify what gets included:

```bash
# Create package tarball
npm pack

# List contents
tar -tzf sprint-mcp-0.1.0.tgz

# Should include:
# ✅ package/dist/
# ✅ package/package.json
# ✅ package/README.md
# ✅ package/LICENSE
# ✅ package/CHANGELOG.md
# ✅ package/AGENTS.md

# Should NOT include:
# ❌ package/src/
# ❌ package/planning/
# ❌ package/.worktrees/
# ❌ package/__tests__/
# ❌ package/node_modules/
# ❌ package/.git/
# ❌ package/AGENTS-uncompressed.md
# ❌ package/CLAUDE.md
```

---

## Alternative: package.json `files` Field (Recommended)

Instead of `.npmignore`, use explicit whitelist in `package.json`:

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

**Why This is Better**:
- Explicit (opt-in vs opt-out)
- Harder to accidentally include sensitive files
- Clearer intent
- Less maintenance

**When to Use .npmignore**:
- Complex exclusion patterns needed
- Existing .npmignore from template
- Team preference for blacklist approach

---

## Notes

### npm Publish Behavior

1. `.npmignore` takes precedence over `.gitignore` if both exist
2. If no `.npmignore`, npm uses `.gitignore`
3. `files` field in package.json overrides both
4. Some files are always included: `package.json`, `README*`, `LICENSE*`, `CHANGELOG*`
5. Some files are always excluded: `.git/`, `node_modules/`, `.*.swp`

### Best Practice

**Recommended Hierarchy**:
1. Use `files` field in package.json (explicit whitelist)
2. Use `.npmignore` only if blacklist approach needed
3. Don't mix both (confusing, files field wins anyway)

---

**Document Version**: 1.0
**Recommendation**: Use `files` field in package.json instead
**Last Updated**: 2026-08-01
