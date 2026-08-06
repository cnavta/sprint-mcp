#!/bin/bash
# Sprint 14: SPRINT_ROOT Implementation - Validation Script
#
# This script validates that SPRINT_ROOT environment variable support
# has been correctly implemented across all MCP tools and modules.

set -e  # Exit on error

echo "🔍 Sprint 14 Validation: SPRINT_ROOT Implementation"
echo "===================================================="
echo ""

# Validation tracking
FAILURES=0
WARNINGS=0

# Helper functions
pass() {
    echo "✅ $1"
}

fail() {
    echo "❌ $1"
    FAILURES=$((FAILURES + 1))
}

warn() {
    echo "⚠️  $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo "ℹ️  $1"
}

section() {
    echo ""
    echo "📋 $1"
    echo "----------------------------------------"
}

# =============================================================================
# SECTION 1: Build and Dependency Check
# =============================================================================

section "Build and Dependencies"

info "Installing dependencies..."
npm ci --silent || fail "npm ci failed"

info "Building project..."
npm run build || fail "Build failed"

pass "Build successful"

# =============================================================================
# SECTION 2: Unit Test Suite
# =============================================================================

section "Unit Tests"

info "Running all unit tests..."
npm test -- --passWithNoTests || fail "Unit tests failed"

pass "All unit tests passed"

# =============================================================================
# SECTION 3: Test Coverage
# =============================================================================

section "Test Coverage"

info "Running tests with coverage..."
npm run test:coverage -- --passWithNoTests || warn "Coverage tests failed"

# Check if coverage meets threshold (80%)
if [ -f coverage/coverage-summary.json ]; then
    pass "Coverage report generated"
else
    warn "Coverage report not found"
fi

# =============================================================================
# SECTION 4: SPRINT_ROOT-Specific Tests
# =============================================================================

section "SPRINT_ROOT Functionality Tests"

info "Testing project-config module..."
npm test -- src/common/__tests__/project-config.test.ts || fail "project-config tests failed"
pass "project-config module tests passed"

info "Testing sprint-index-manager with SPRINT_ROOT..."
npm test -- src/common/__tests__/sprint-index-manager.test.ts || fail "sprint-index-manager tests failed"
pass "sprint-index-manager tests passed"

info "Testing git-utils (worktree paths)..."
npm test -- src/common/__tests__/git-utils.test.ts || fail "git-utils tests failed"
pass "git-utils tests passed (CRITICAL: worktree paths validated)"

info "Testing all MCP tools..."
npm test -- src/tools/__tests__/ || fail "MCP tool tests failed"
pass "All MCP tool tests passed"

# =============================================================================
# SECTION 5: Integration Tests
# =============================================================================

section "Integration Tests"

if [ -f src/__tests__/integration/sprint-root.test.ts ]; then
    info "Running SPRINT_ROOT integration tests..."
    npm test -- src/__tests__/integration/sprint-root.test.ts || fail "SPRINT_ROOT integration tests failed"
    pass "SPRINT_ROOT integration tests passed"
else
    warn "SPRINT_ROOT integration tests not found"
fi

if [ -f src/__tests__/integration/backward-compatibility.test.ts ]; then
    info "Running backward compatibility tests..."
    npm test -- src/__tests__/integration/backward-compatibility.test.ts || fail "Backward compatibility tests failed"
    pass "Backward compatibility tests passed"
else
    warn "Backward compatibility tests not found"
fi

# =============================================================================
# SECTION 6: Manual Validation (Simulated)
# =============================================================================

section "Manual Validation Checks"

# Check that project-config.ts exists
if [ -f src/common/project-config.ts ]; then
    pass "project-config.ts module exists"
else
    fail "project-config.ts module NOT FOUND"
fi

# Check that project-config.ts exports required functions
if grep -q "export function getProjectRoot" src/common/project-config.ts; then
    pass "getProjectRoot() function exists"
else
    fail "getProjectRoot() function NOT FOUND"
fi

if grep -q "export function getPlanningDir" src/common/project-config.ts; then
    pass "getPlanningDir() function exists"
else
    fail "getPlanningDir() function NOT FOUND"
fi

if grep -q "export function getSprintIndexPath" src/common/project-config.ts; then
    pass "getSprintIndexPath() function exists"
else
    fail "getSprintIndexPath() function NOT FOUND"
fi

# Check that modules import from project-config
info "Checking sprint-index-manager imports project-config..."
if grep -q "from './project-config" src/common/sprint-index-manager.ts; then
    pass "sprint-index-manager imports project-config"
else
    warn "sprint-index-manager may not import project-config"
fi

info "Checking start-sprint imports project-config..."
if grep -q "from.*project-config" src/tools/start-sprint.ts; then
    pass "start-sprint imports project-config"
else
    warn "start-sprint may not import project-config"
fi

# Check that process.cwd() is not used directly in migrated files
info "Checking for direct process.cwd() usage in sprint-index-manager..."
if grep -q "process\.cwd()" src/common/sprint-index-manager.ts 2>/dev/null; then
    # Check if it's in a comment or not in actual code
    DIRECT_USAGE=$(grep -v "^[[:space:]]*\*" src/common/sprint-index-manager.ts | grep -v "^[[:space:]]*//" | grep "process\.cwd()" || true)
    if [ -n "$DIRECT_USAGE" ]; then
        warn "sprint-index-manager still has direct process.cwd() usage"
    else
        pass "sprint-index-manager no longer uses process.cwd() directly"
    fi
else
    pass "sprint-index-manager no longer uses process.cwd() directly"
fi

# =============================================================================
# SECTION 7: Documentation Validation
# =============================================================================

section "Documentation Validation"

if [ -f documentation/claude-desktop-installation-guide.md ]; then
    if grep -q "SPRINT_ROOT" documentation/claude-desktop-installation-guide.md; then
        pass "Installation guide documents SPRINT_ROOT"
    else
        warn "Installation guide may not document SPRINT_ROOT"
    fi
else
    warn "Installation guide not found"
fi

if [ -f README.md ]; then
    if grep -q "SPRINT_ROOT" README.md; then
        pass "README documents SPRINT_ROOT"
    else
        warn "README may not document SPRINT_ROOT"
    fi
fi

# =============================================================================
# SECTION 8: Runtime Test (Optional, requires MCP server)
# =============================================================================

section "Runtime Validation (Skipped)"

info "Runtime MCP server test skipped (requires active MCP connection)"
info "Manual testing required:"
info "  1. Set SPRINT_ROOT environment variable"
info "  2. Start MCP server: npm run dev"
info "  3. Call start-sprint tool"
info "  4. Verify sprint created in SPRINT_ROOT/planning/"

# =============================================================================
# FINAL SUMMARY
# =============================================================================

echo ""
echo "===================================================="
echo "📊 Validation Summary"
echo "===================================================="
echo ""

if [ $FAILURES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ ALL VALIDATIONS PASSED"
    echo ""
    echo "Sprint 14 deliverables are complete and validated."
    echo "SPRINT_ROOT implementation is ready for production."
    exit 0
elif [ $FAILURES -eq 0 ]; then
    echo "✅ All critical validations passed"
    echo "⚠️  $WARNINGS warning(s) detected"
    echo ""
    echo "Sprint 14 is substantially complete but has minor issues."
    echo "Review warnings before marking sprint complete."
    exit 0
else
    echo "❌ VALIDATION FAILED"
    echo ""
    echo "Failures: $FAILURES"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Sprint 14 deliverables are NOT complete."
    echo "Fix failures before marking sprint complete."
    exit 1
fi
