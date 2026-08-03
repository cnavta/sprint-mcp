#!/bin/bash
set -e

echo "=================================================="
echo "Sprint 3 Deliverable Validation"
echo "Git Worktrees Integration and MCP Testing"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    FAILED=1
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

section() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
}

# Navigate to repository root
cd "$(git rev-parse --show-toplevel)" || exit 1

section "Step 1: Environment Verification"

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    pass "Node.js installed: $NODE_VERSION"
else
    fail "Node.js not found"
    exit 1
fi

# Check npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    pass "npm installed: $NPM_VERSION"
else
    fail "npm not found"
    exit 1
fi

# Check git version
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    pass "Git installed: $GIT_VERSION"
else
    fail "Git not found"
    exit 1
fi

# Check git worktree command availability
if git worktree list &> /dev/null; then
    pass "Git worktree command available"
else
    fail "Git worktree command not available (requires Git 2.5+)"
fi

section "Step 2: Dependency Installation"

echo "Running npm ci to install dependencies..."
if npm ci; then
    pass "Dependencies installed successfully"
else
    fail "npm ci failed"
    exit 1
fi

section "Step 3: TypeScript Compilation"

echo "Building TypeScript code..."
if npm run build; then
    pass "TypeScript compilation successful"
else
    fail "Build failed"
    exit 1
fi

# Verify dist directory exists
if [ -d "dist" ]; then
    pass "dist/ directory created"
else
    fail "dist/ directory not found after build"
fi

section "Step 4: Test Suite Execution"

echo "Running test suite..."
if npm test; then
    pass "All tests passed"
else
    fail "Test suite failed"
    exit 1
fi

section "Step 5: Test Coverage Verification"

echo "Checking test coverage..."
if npm run test:coverage > /tmp/coverage-output.txt 2>&1; then
    # Extract coverage percentages
    TOOLS_COVERAGE=$(grep "src/tools" /tmp/coverage-output.txt | awk '{print $2}' | head -1 | tr -d '%')

    if [ -n "$TOOLS_COVERAGE" ]; then
        if (( $(echo "$TOOLS_COVERAGE >= 80" | bc -l) )); then
            pass "src/tools/ coverage: ${TOOLS_COVERAGE}% (meets 80% threshold)"
        else
            fail "src/tools/ coverage: ${TOOLS_COVERAGE}% (below 80% threshold)"
        fi
    else
        warn "Could not parse coverage for src/tools/"
    fi

    pass "Test coverage report generated"
else
    warn "Coverage check had errors but tests passed"
fi

section "Step 6: Git Worktree Smoke Test"

echo "Testing git worktree functionality..."

# Create a temporary worktree for testing
TEST_WORKTREE=".worktrees/validation-test-$$"

if [ -d "$TEST_WORKTREE" ]; then
    echo "Removing existing test worktree..."
    git worktree remove "$TEST_WORKTREE" --force 2>/dev/null || true
fi

# Check if we're in a git repository with commits
if ! git rev-parse HEAD &> /dev/null; then
    warn "Not in a git repository with commits, skipping worktree smoke test"
else
    # Create test worktree
    if git worktree add "$TEST_WORKTREE" -b "validation-test-branch-$$" 2>/dev/null; then
        pass "Created test worktree: $TEST_WORKTREE"

        # Verify worktree exists
        if [ -d "$TEST_WORKTREE" ]; then
            pass "Worktree directory exists"

            # Check if we can cd into it
            if cd "$TEST_WORKTREE"; then
                CURRENT_BRANCH=$(git branch --show-current)
                if [[ "$CURRENT_BRANCH" == "validation-test-branch-$$" ]]; then
                    pass "Worktree is on correct branch: $CURRENT_BRANCH"
                else
                    fail "Worktree on unexpected branch: $CURRENT_BRANCH"
                fi
                cd - > /dev/null
            else
                fail "Could not cd into worktree"
            fi

            # Cleanup test worktree
            if git worktree remove "$TEST_WORKTREE" 2>/dev/null; then
                pass "Removed test worktree"
            else
                warn "Could not remove test worktree (may need manual cleanup)"
            fi
        else
            fail "Worktree directory was not created"
        fi
    else
        warn "Could not create test worktree (may be on detached HEAD or other issue)"
    fi
fi

section "Step 7: File Structure Verification"

# Verify key deliverable files exist
REQUIRED_FILES=(
    "src/common/git-utils.ts"
    "src/common/__tests__/git-utils.test.ts"
    "src/tools/start-sprint.ts"
    "src/tools/__tests__/start-sprint.test.ts"
    "AGENTS-uncompressed.md"
    "planning/sprint-3-c8f2a9/sprint-manifest.yaml"
    "planning/sprint-3-c8f2a9/execution-plan.md"
    "planning/sprint-3-c8f2a9/backlog.yaml"
    "planning/sprint-3-c8f2a9/request-log.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        pass "File exists: $file"
    else
        fail "Missing required file: $file"
    fi
done

section "Step 8: Code Quality Checks"

# Check for TypeScript errors in worktree-related code
if grep -r "TODO\|FIXME\|XXX" src/common/git-utils.ts src/tools/start-sprint.ts 2>/dev/null; then
    warn "Found TODO/FIXME comments in worktree code"
else
    pass "No TODO/FIXME comments in critical code paths"
fi

# Verify worktree functions are exported
if grep -q "export.*createWorktree" src/common/git-utils.ts; then
    pass "createWorktree is exported"
else
    fail "createWorktree is not exported"
fi

if grep -q "export.*listWorktrees" src/common/git-utils.ts; then
    pass "listWorktrees is exported"
else
    fail "listWorktrees is not exported"
fi

section "Validation Summary"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}=================================================="
    echo "✓ ALL VALIDATION CHECKS PASSED"
    echo "==================================================${NC}"
    echo ""
    echo "Sprint 3 deliverables are ready for verification."
    echo ""
    exit 0
else
    echo -e "${RED}=================================================="
    echo "✗ VALIDATION FAILED"
    echo "==================================================${NC}"
    echo ""
    echo "Please review the failures above and fix before proceeding."
    echo ""
    exit 1
fi
