# NPM Publishing Checklist

**Purpose**: Step-by-step checklist for publishing sprint-mcp to npm registry
**Last Updated**: 2026-08-01

---

## Pre-Publish Preparation (One-Time Setup)

### 1. npm Account Setup

- [ ] Create npm account at https://www.npmjs.com/signup
- [ ] Verify email address
- [ ] Enable 2FA (Two-Factor Authentication) - **Highly Recommended**
- [ ] Generate access token (if using CI/CD)

**Commands**:
```bash
# Login to npm
npm login

# Verify login
npm whoami
```

### 2. Package Name Availability

- [ ] Check if package name is available

**Commands**:
```bash
# Check if 'sprint-mcp' is available
npm view sprint-mcp

# 404 = available
# Package data = taken (choose different name)
```

### 3. License Selection

- [ ] Choose license (MIT recommended)
- [ ] Create LICENSE file in project root
- [ ] Update package.json `license` field

**MIT License Template**:
```
MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

### 4. Documentation Preparation

- [ ] Create comprehensive README.md with:
  - [ ] Installation instructions
  - [ ] Claude Desktop configuration examples
  - [ ] Available MCP tools list
  - [ ] Usage examples
  - [ ] License information
- [ ] Create/update CHANGELOG.md
- [ ] Verify AGENTS.md is included

---

## Pre-Publish Verification (Every Release)

### 1. Version Management

- [ ] Update version using release tool

```bash
# Use brat release tool (syncs architecture.yaml ↔ package.json)
brat release patch        # 0.1.0 → 0.1.1
brat release minor        # 0.1.0 → 0.2.0
brat release major        # 0.1.0 → 1.0.0

# Or specify exact version
brat release 1.0.0
```

- [ ] Verify version sync

```bash
# Check both files match
grep version architecture.yaml
grep version package.json
# Should show same version number
```

### 2. Code Quality Checks

- [ ] Run linter (if configured)

```bash
# If ESLint configured
npm run lint
```

- [ ] TypeScript compilation check

```bash
# Verify no TypeScript errors
npx tsc --noEmit
```

- [ ] Run full test suite

```bash
# Run all tests
npm test

# Current expected: 224 passing, 0 failing
```

- [ ] Run tests with coverage

```bash
npm run test:coverage

# Current: 71.57% statements
# Ensure coverage hasn't regressed
```

### 3. Build Verification

- [ ] Clean previous build

```bash
rm -rf dist/
```

- [ ] Run build

```bash
npm run build
```

- [ ] Verify build output

```bash
# Check dist/ structure
ls -la dist/

# Expected structure:
# dist/
#   ├── index.js (with shebang)
#   ├── index.d.ts
#   ├── common/
#   ├── tools/
#   └── compression/
```

- [ ] Verify entry point has shebang

```bash
head -n 1 dist/index.js
# Should output: #!/usr/bin/env node
```

### 4. Package Content Verification

- [ ] Create test package

```bash
npm pack
# Creates: sprint-mcp-X.Y.Z.tgz
```

- [ ] Inspect package contents

```bash
tar -tzf sprint-mcp-0.1.0.tgz | head -20

# Or extract and browse
mkdir /tmp/package-inspect
tar -xzf sprint-mcp-0.1.0.tgz -C /tmp/package-inspect
cd /tmp/package-inspect/package
ls -la
```

- [ ] Verify INCLUDES:

```
✅ package/dist/
✅ package/package.json
✅ package/README.md
✅ package/LICENSE
✅ package/CHANGELOG.md
✅ package/AGENTS.md
```

- [ ] Verify EXCLUDES:

```
❌ package/src/
❌ package/planning/
❌ package/.worktrees/
❌ package/__tests__/
❌ package/node_modules/
❌ package/.git/
❌ package/AGENTS-uncompressed.md
❌ package/CLAUDE.md
❌ package/documentation/
```

- [ ] Check package size

```bash
ls -lh sprint-mcp-0.1.0.tgz

# Reasonable size: < 500 KB
# If larger, investigate what's included
```

### 5. Installation Testing (Local)

- [ ] Test global installation from tarball

```bash
# Install globally from local tarball
npm install -g ./sprint-mcp-0.1.0.tgz

# Verify binary installed
which sprint-mcp
# Should output path like: /usr/local/bin/sprint-mcp

# Test execution (basic startup)
sprint-mcp &
sleep 2
pkill -f sprint-mcp

# Clean up
npm uninstall -g sprint-mcp
```

- [ ] Test in fresh directory

```bash
# Create temp test environment
mkdir /tmp/test-sprint-mcp
cd /tmp/test-sprint-mcp
npm init -y

# Install from tarball
npm install /path/to/sprint-mcp-0.1.0.tgz

# Verify installation
ls node_modules/sprint-mcp/

# Test execution
node node_modules/sprint-mcp/dist/index.js &
sleep 2
pkill -f "node.*sprint-mcp"

# Clean up
cd ~
rm -rf /tmp/test-sprint-mcp
```

### 6. Dependency Audit

- [ ] Check for vulnerabilities

```bash
npm audit

# If vulnerabilities found:
npm audit fix         # Auto-fix if safe
# OR
npm audit fix --force # Force update (test thoroughly after)
```

- [ ] Check for outdated dependencies

```bash
npm outdated

# Review and update if needed (test after updates)
```

### 7. Documentation Review

- [ ] README.md complete and accurate
- [ ] CHANGELOG.md updated with new version
- [ ] LICENSE file present
- [ ] package.json metadata complete:
  - [ ] `description`
  - [ ] `keywords`
  - [ ] `author`
  - [ ] `repository`
  - [ ] `bugs`
  - [ ] `homepage`

---

## Publishing Process

### 1. Dry Run (First Time / Major Changes)

- [ ] Perform dry run

```bash
npm publish --dry-run
```

- [ ] Review dry run output:
  - [ ] Verify file list
  - [ ] Check package size
  - [ ] Confirm version number
  - [ ] Review warnings (if any)

### 2. Publish to npm

- [ ] Ensure logged in

```bash
npm whoami
# Should show your npm username
```

- [ ] Publish package

```bash
# For unscoped package (sprint-mcp)
npm publish

# For scoped package (@org/sprint-mcp)
npm publish --access public
```

- [ ] Verify publish success

```
# Should see output like:
+ sprint-mcp@0.1.0
```

### 3. Git Tagging

- [ ] Tag release in git

```bash
# Tag with version
git tag v0.1.0

# Push tag to remote
git push origin v0.1.0

# Or push all tags
git push --tags
```

- [ ] Create GitHub release (optional but recommended)

```bash
# Using gh CLI
gh release create v0.1.0 \
  --title "Release v0.1.0" \
  --notes "Initial release to npm. See CHANGELOG.md for details."

# Or via GitHub web UI:
# https://github.com/cnavta/sprint-mcp/releases/new
```

---

## Post-Publish Verification

### 1. Verify on npmjs.com

- [ ] Visit package page: https://www.npmjs.com/package/sprint-mcp
- [ ] Verify README renders correctly
- [ ] Check version number matches
- [ ] Review "Files" tab for included files
- [ ] Verify package size reasonable
- [ ] Check metadata (keywords, license, etc.)

### 2. Test Fresh Installation

- [ ] Test global installation from npm

```bash
# Install from npm registry
npm install -g sprint-mcp@0.1.0

# Verify installation
which sprint-mcp
sprint-mcp --version  # If version flag implemented

# Test with Claude Desktop (if available)
# Add to claude_desktop_config.json and verify MCP tools appear
```

- [ ] Test npx usage

```bash
# Should download and execute
npx -y sprint-mcp@0.1.0

# Verify it starts up correctly
# (Will need to kill process after startup verification)
```

- [ ] Test in new project

```bash
mkdir /tmp/test-npm-install
cd /tmp/test-npm-install
npm init -y
npm install sprint-mcp@0.1.0

# Verify installation
ls node_modules/sprint-mcp/dist/

# Clean up
cd ~
rm -rf /tmp/test-npm-install
```

### 3. Documentation Updates

- [ ] Update project README if needed
  - [ ] Add npm install badge
  - [ ] Update version references
  - [ ] Add installation instructions

- [ ] Update CHANGELOG.md
  - [ ] Move "Unreleased" to version section
  - [ ] Add publication date

- [ ] Commit documentation updates

```bash
git add README.md CHANGELOG.md
git commit -m "docs: update for v0.1.0 npm release"
git push
```

### 4. Monitor (First 24-48 Hours)

- [ ] Check npm download stats (after 24 hours)
  - https://www.npmjs.com/package/sprint-mcp

- [ ] Monitor for issues
  - GitHub issues
  - npm package page feedback

- [ ] Verify CI/CD (if configured)
  - Check GitHub Actions status
  - Verify automated processes work

---

## Rollback Procedure (If Needed)

### If you need to unpublish within 72 hours:

```bash
# Unpublish specific version
npm unpublish sprint-mcp@0.1.0

# WARNING: Can only unpublish within 72 hours
# After 72 hours, must deprecate instead
```

### To deprecate a version (after 72 hours):

```bash
# Deprecate with message
npm deprecate sprint-mcp@0.1.0 "This version has issues. Please upgrade to 0.1.1"
```

### To publish a patch fix:

```bash
# Fix the issue
# Update version
brat release patch  # 0.1.0 → 0.1.1

# Follow full checklist again
# Publish new version
npm publish
```

---

## Common Issues & Solutions

### Issue: "You do not have permission to publish"

**Solution**:
```bash
# Verify logged in
npm whoami

# If not logged in
npm login

# Verify package name not taken
npm view sprint-mcp
```

### Issue: "Package name too similar to existing package"

**Solution**:
- Choose different name
- Use scoped package: `@yourusername/sprint-mcp`

### Issue: Build files not included in package

**Solution**:
```bash
# Ensure build runs before publish
npm run build

# Verify dist/ in tarball
tar -tzf sprint-mcp-0.1.0.tgz | grep "dist/"

# Check package.json "files" field
# or .npmignore configuration
```

### Issue: Package too large (> 1 MB)

**Solution**:
```bash
# Check what's taking space
tar -tzf sprint-mcp-0.1.0.tgz

# Common culprits:
# - source files (should exclude src/)
# - test files (should exclude __tests__/)
# - node_modules (should never include)
# - planning/ artifacts (should exclude)
```

---

## Quick Reference Commands

```bash
# Version update (syncs architecture.yaml and package.json)
brat release <patch|minor|major>

# Build
npm run build

# Test
npm test

# Create package
npm pack

# Inspect package
tar -tzf sprint-mcp-X.Y.Z.tgz

# Test install
npm install -g ./sprint-mcp-X.Y.Z.tgz

# Publish
npm publish

# Tag git
git tag vX.Y.Z && git push --tags

# Create GitHub release
gh release create vX.Y.Z --generate-notes
```

---

## Checklist Summary

**Pre-Publish (One-Time)**:
- [ ] npm account created and verified
- [ ] Package name available
- [ ] LICENSE file created
- [ ] README.md comprehensive

**Pre-Publish (Every Release)**:
- [ ] Version updated (brat release)
- [ ] Tests passing (npm test)
- [ ] Build successful (npm run build)
- [ ] Package inspected (npm pack + tar -tzf)
- [ ] Local install tested
- [ ] Dependencies audited

**Publishing**:
- [ ] Dry run successful (npm publish --dry-run)
- [ ] Published to npm (npm publish)
- [ ] Git tagged (git tag vX.Y.Z)
- [ ] GitHub release created

**Post-Publish**:
- [ ] Verified on npmjs.com
- [ ] Tested fresh installation
- [ ] Documentation updated
- [ ] Monitoring for issues

---

**Document Version**: 1.0
**Last Updated**: 2026-08-01
**Next Review**: After first publish
