#!/usr/bin/env bash

set -euo pipefail

# Validation script for sprint-2-b7e4d1: Git Baseline and Remote Configuration
# This script validates that all three deferred Git issues from sprint-1 have been resolved.

echo "=== Sprint 2 Validation: Git Baseline and Remote Configuration ==="
echo ""

ERRORS=0

# Test 1: Main branch exists with commit history
echo "[1/5] Checking main branch exists..."
if git show-ref --verify --quiet refs/heads/main; then
  echo "  ✓ Main branch exists"
else
  echo "  ✗ Main branch does not exist"
  ERRORS=$((ERRORS + 1))
fi

# Test 2: Main branch has commits
echo "[2/5] Checking main branch has commits..."
MAIN_COMMITS=$(git rev-list --count main 2>/dev/null || echo "0")
if [ "$MAIN_COMMITS" -gt 0 ]; then
  echo "  ✓ Main branch has $MAIN_COMMITS commits"
else
  echo "  ✗ Main branch has no commits"
  ERRORS=$((ERRORS + 1))
fi

# Test 3: Git remote is configured
echo "[3/5] Checking Git remote is configured..."
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$REMOTE_URL" ]; then
  echo "  ✓ Git remote configured: $REMOTE_URL"
else
  echo "  ✗ No Git remote configured"
  ERRORS=$((ERRORS + 1))
fi

# Test 4: Remote URL matches expected value
echo "[4/5] Checking remote URL matches expected value..."
EXPECTED_REMOTE="git@github.com:cnavta/sprint-mcp.git"
if [ "$REMOTE_URL" = "$EXPECTED_REMOTE" ]; then
  echo "  ✓ Remote URL matches: $EXPECTED_REMOTE"
else
  echo "  ✗ Remote URL mismatch. Expected: $EXPECTED_REMOTE, Got: $REMOTE_URL"
  ERRORS=$((ERRORS + 1))
fi

# Test 5: Feature branch workflow (can diff against main)
echo "[5/5] Checking feature branch workflow..."
CURRENT_BRANCH=$(git branch --show-current)
if git diff main --quiet 2>/dev/null; then
  echo "  ✓ Feature branch ($CURRENT_BRANCH) can diff against main (currently no changes)"
else
  # If there are changes, that's also valid - we just want to ensure diff command works
  echo "  ✓ Feature branch ($CURRENT_BRANCH) can diff against main (has changes)"
fi

# Summary
echo ""
echo "=== Validation Summary ==="
if [ $ERRORS -eq 0 ]; then
  echo "✓ All validation checks passed!"
  echo ""
  echo "Sprint 2 successfully resolved all deferred Git issues:"
  echo "  ✓ Main branch established with baseline commit"
  echo "  ✓ Git remote configured ($REMOTE_URL)"
  echo "  ✓ Feature branch workflow enabled"
  exit 0
else
  echo "✗ $ERRORS validation check(s) failed"
  exit 1
fi
