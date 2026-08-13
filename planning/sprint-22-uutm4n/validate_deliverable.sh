#!/bin/bash

# Sprint 22 Validation Script
# Validates analysis and planning deliverables

set -e

SPRINT_DIR="/Users/christophernavta/IdeaProjects/sprint-mcp/.worktrees/sprint-22-uutm4n/planning/sprint-22-uutm4n"
EXIT_CODE=0

echo "======================================"
echo "Sprint 22 Deliverable Validation"
echo "======================================"
echo ""

# Function to check file exists and has content
check_file() {
    local file="$1"
    local min_size="${2:-1000}"  # Minimum 1KB by default

    if [ ! -f "$file" ]; then
        echo "❌ FAIL: $file does not exist"
        EXIT_CODE=1
        return 1
    fi

    local size=$(wc -c < "$file" | tr -d ' ')
    if [ "$size" -lt "$min_size" ]; then
        echo "❌ FAIL: $file is too small (${size} bytes, expected >=${min_size})"
        EXIT_CODE=1
        return 1
    fi

    echo "✅ PASS: $file exists (${size} bytes)"
    return 0
}

# Function to check file contains required sections
check_sections() {
    local file="$1"
    shift
    local sections=("$@")

    for section in "${sections[@]}"; do
        if ! grep -q "$section" "$file"; then
            echo "  ⚠️  WARNING: Missing section '$section' in $file"
        fi
    done
}

echo "Step 1: Checking Required Deliverables"
echo "---------------------------------------"

# Check implementation plan
check_file "$SPRINT_DIR/implementation-plan.md" 3000
check_sections "$SPRINT_DIR/implementation-plan.md" \
    "Sprint Goal" \
    "Deliverables" \
    "Success Criteria" \
    "Phase Breakdown"

# Check tri-audience gap analysis
check_file "$SPRINT_DIR/tri-audience-gap-analysis.md" 20000
check_sections "$SPRINT_DIR/tri-audience-gap-analysis.md" \
    "Tri-Audience Architecture" \
    "Structure the Vibe" \
    "Non-Coding Entry Path" \
    "Market Opportunity"

# Check Sprint 21 analysis report
check_file "$SPRINT_DIR/sprint-21-analysis-report.md" 5000
check_sections "$SPRINT_DIR/sprint-21-analysis-report.md" \
    "Salvageability Assessment" \
    "Integration Strategy"

# Check documentation backlog
check_file "$SPRINT_DIR/documentation-backlog-v2.yaml" 10000
if [ -f "$SPRINT_DIR/documentation-backlog-v2.yaml" ]; then
    # Validate YAML syntax
    if command -v npx &> /dev/null; then
        echo "  Validating YAML syntax..."
        npx js-yaml "$SPRINT_DIR/documentation-backlog-v2.yaml" > /dev/null 2>&1 && \
            echo "  ✅ YAML syntax valid" || \
            echo "  ⚠️  WARNING: YAML syntax check failed"
    fi
fi

# Check execution roadmap
check_file "$SPRINT_DIR/execution-roadmap.md" 5000
check_sections "$SPRINT_DIR/execution-roadmap.md" \
    "Phase 1" \
    "Success Metrics" \
    "Risk Management"

echo ""
echo "Step 2: Validating Sprint Manifest"
echo "-----------------------------------"
check_file "$SPRINT_DIR/sprint-manifest.yaml" 200

echo ""
echo "Step 3: Checking Project Health"
echo "--------------------------------"

# Navigate to project root
cd "/Users/christophernavta/IdeaProjects/sprint-mcp/.worktrees/sprint-22-uutm4n"

# Install dependencies
echo "Installing dependencies..."
npm ci --silent || npm install --silent

# Build project
echo "Building project..."
npm run build --silent

# Run tests
echo "Running test suite..."
npm test --silent

echo ""
echo "======================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ ALL VALIDATIONS PASSED"
else
    echo "❌ SOME VALIDATIONS FAILED"
fi
echo "======================================"

exit $EXIT_CODE
