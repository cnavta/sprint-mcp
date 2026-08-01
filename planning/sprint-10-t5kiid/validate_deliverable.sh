#!/bin/bash
set -e

echo "========================================="
echo "Sprint 10 Validation Script"
echo "Testing Sprint Cleanup and Completion"
echo "========================================="
echo ""

# Change to repository root (assuming script is in planning/sprint-10-t5kiid/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "Repository root: $REPO_ROOT"
echo ""

# Step 1: Install dependencies
echo "Step 1/4: Installing dependencies..."
npm ci
echo "✅ Dependencies installed"
echo ""

# Step 2: Build project
echo "Step 2/4: Building project..."
npm run build
echo "✅ Project built successfully"
echo ""

# Step 3: Run test suite
echo "Step 3/4: Running test suite..."
npm test
echo "✅ All tests passed"
echo ""

# Step 4: Run coverage report
echo "Step 4/4: Running coverage report..."
npm run test:coverage
echo "✅ Coverage report generated"
echo ""

echo "========================================="
echo "✅ Sprint 10 Validation Complete"
echo "========================================="
echo ""
echo "Summary:"
echo "  - Dependencies: Installed"
echo "  - Build: Success"
echo "  - Tests: All passing"
echo "  - Coverage: Generated (see output above)"
echo ""
echo "Sprint 10 deliverables are ready for completion."
