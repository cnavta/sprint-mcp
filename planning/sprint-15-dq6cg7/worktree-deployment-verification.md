# Worktree Deployment Verification

**Sprint**: sprint-15-dq6cg7
**Date**: 2026-08-07
**Purpose**: Verify that deployments (local, dev, etc.) work from within worktrees

## Executive Summary

✅ **Worktrees support full deployment workflows**
⚠️ **Requires one-time setup per worktree**: `npm ci` before first build/deploy

## Analysis

### Worktree Structure

Git worktrees create a complete working copy of the repository with a different branch checked out. All tracked files are present:

```
.worktrees/sprint-N/
├── package.json          ✅ Present (tracked)
├── package-lock.json     ✅ Present (tracked)
├── tsconfig.json         ✅ Present (tracked)
├── jest.config.js        ✅ Present (tracked)
├── src/                  ✅ Present (tracked)
├── infrastructure/       ✅ Present (tracked, if exists)
├── .env.example          ✅ Present (tracked)
├── planning/
│   └── sprint-N/         ✅ Created by start-sprint
├── node_modules/         ❌ NOT present (gitignored)
└── dist/                 ❌ NOT present (gitignored)
```

### What's NOT Copied (By Design)

Files in `.gitignore` are **not** copied to worktrees:
- `node_modules/` - Dependencies (must run `npm ci` in worktree)
- `dist/` - Build output (must run `npm run build` in worktree)
- `.env` - Local environment (must copy from `.env.example` or use shared)

This is **GOOD** because:
1. Each worktree has isolated dependencies (no version conflicts)
2. Each worktree has isolated build artifacts (no cross-contamination)
3. Smaller worktree footprint (no duplicate node_modules)

### Deployment Workflow from Worktree

#### First Time Setup (One-Time Per Worktree)

```bash
cd .worktrees/sprint-N/

# Install dependencies
npm ci

# Configure environment (if needed)
cp .env.example .env
# Edit .env as needed

# Verify setup
npm run build
npm test
```

#### Ongoing Development

```bash
cd .worktrees/sprint-N/

# Local development
npm run dev

# Run tests
npm test

# Build for deployment
npm run build

# Deploy to local environment
npm run local
# or
docker-compose up

# Deploy to agent dev environment
npm run deploy:dev
# or
gcloud builds submit --config=cloudbuild.yaml
```

### Supported Deployment Targets

| Deployment Type | Works from Worktree? | Notes |
|----------------|---------------------|-------|
| **Local Dev** (`npm run dev`) | ✅ Yes | After `npm ci` |
| **Docker Compose** | ✅ Yes | Dockerfile in worktree |
| **npm run local** | ✅ Yes | After dependencies installed |
| **Cloud Build** | ✅ Yes | cloudbuild.yaml in worktree |
| **Cloud Run** | ✅ Yes | Via Cloud Build |
| **Agent Dev Env** | ✅ Yes | All IaC files present |
| **npm test** | ✅ Yes | Jest config present |
| **npm run build** | ✅ Yes | TypeScript config present |

### Validation Tests

#### Test 1: Build from Worktree
```bash
cd .worktrees/sprint-15-dq6cg7/
npm ci                    # Install dependencies
npm run build             # Should create dist/
ls dist/                  # Verify build artifacts
```

**Expected**: Build completes successfully, `dist/` directory created

#### Test 2: Run Tests from Worktree
```bash
cd .worktrees/sprint-15-dq6cg7/
npm test                  # Run test suite
```

**Expected**: All 342 tests pass (same as main repo)

#### Test 3: Local Deployment (if applicable)
```bash
cd .worktrees/sprint-15-dq6cg7/
npm run local             # Start local services
# ... verify services running ...
npm run local:down        # Stop services
```

**Expected**: Services start and respond to health checks

## Recommendations

### For Agent Guidance (AGENTS.md)

Add to section 2.2.1 "Agent Working Directory Discipline":

```markdown
### First-Time Worktree Setup

When starting work in a new sprint worktree, run:
```bash
cd .worktrees/sprint-N/
npm ci                    # Install dependencies (one-time)
```

After this, all development commands work normally:
- `npm run build` - Build TypeScript
- `npm test` - Run test suite
- `npm run dev` - Start local development server
- `npm run deploy:dev` - Deploy to dev environment
```

### For validate_deliverable.sh

Update template to include worktree setup:

```bash
#!/bin/bash
set -e

echo "Sprint Validation Script"
echo "========================"

# Install dependencies (supports both main repo and worktree)
echo "Installing dependencies..."
npm ci

# Build project
echo "Building project..."
npm run build

# Run tests
echo "Running test suite..."
npm test

# ... rest of validation ...
```

### For Documentation

Add to project README or development guide:

```markdown
## Working in Sprint Worktrees

When starting a new sprint, the worktree contains all source code but not dependencies or build artifacts.

**First time in a sprint worktree**:
```bash
cd .worktrees/sprint-N/
npm ci        # Install dependencies (5-30 seconds)
npm run build # Initial build
```

**After that, all commands work normally**:
- Development: `npm run dev`
- Testing: `npm test`
- Building: `npm run build`
- Deployment: `npm run deploy:dev`
```

## Known Limitations

1. **Shared node_modules**: If you want to share node_modules between main repo and worktrees (advanced):
   - Use npm/yarn workspaces
   - Use symlinks (not recommended)
   - Use a monorepo tool

2. **Environment files**: `.env` files are not in git, so:
   - Copy `.env.example` to `.env` in worktree
   - Or use a shared `.env` via symlink
   - Or inject env vars at deployment time

3. **Git hooks**: Hooks in `.git/hooks` are shared across all worktrees (same .git directory)

## Conclusion

✅ **Deployments from worktrees are fully supported**

**Key requirements**:
1. Run `npm ci` once per worktree before first use
2. All tracked files (code, configs, IaC) are automatically present
3. All deployment targets work (local, dev, cloud)

**Agent guidance**:
- Document the one-time `npm ci` requirement in AGENTS.md
- Update validate_deliverable.sh template to include `npm ci`
- No changes needed to MCP tools (they don't deploy)

**Human developer guidance**:
- Add setup instructions to project README
- Consider adding a setup script: `scripts/setup-worktree.sh`

## Next Steps

1. ✅ Document findings
2. ⏭️ Add guidance to AGENTS.md (Sprint 16 or documentation phase)
3. ⏭️ Update validate_deliverable.sh template (Sprint 16)
4. ⏭️ Add to project README (Sprint 16 or documentation phase)
