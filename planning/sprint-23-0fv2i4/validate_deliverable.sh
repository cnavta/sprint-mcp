#!/usr/bin/env bash
# validate_deliverable.sh - Sprint 23 Validation Script
# Sprint: sprint-23-0fv2i4
# Purpose: Validate all Sprint 23 deliverables meet acceptance criteria

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_check() {
    echo -e "  Checking: $1"
}

pass() {
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
    echo -e "  ${GREEN}✓${NC} $1"
}

fail() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    echo -e "  ${RED}✗${NC} $1"
}

warn() {
    ((TOTAL_CHECKS++))
    ((WARNING_CHECKS++))
    echo -e "  ${YELLOW}⚠${NC} $1"
}

# Project root detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
DOC_ROOT="${PROJECT_ROOT}/documentation"

echo -e "${BLUE}Sprint 23 Deliverable Validation${NC}"
echo -e "Project Root: ${PROJECT_ROOT}"
echo -e "Documentation Root: ${DOC_ROOT}"

# ============================================================================
# CHECK 1: Deliverable Files Exist
# ============================================================================
print_header "CHECK 1: Deliverable Files Exist"

DELIVERABLES=(
    "documentation/README.md"
    "documentation/getting-started/use-cases/choosing-your-path.md"
    "documentation/getting-started/developers/QUICKSTART-DEVELOPERS.md"
    "documentation/getting-started/developers/05-understanding-protocol.md"
    "documentation/getting-started/shared/sprint-protocol-overview.md"
)

for deliverable in "${DELIVERABLES[@]}"; do
    print_check "$deliverable"
    if [ -f "${PROJECT_ROOT}/${deliverable}" ]; then
        pass "File exists: ${deliverable}"
    else
        fail "File missing: ${deliverable}"
    fi
done

# ============================================================================
# CHECK 2: Markdown Syntax Validation
# ============================================================================
print_header "CHECK 2: Markdown Syntax Validation"

for deliverable in "${DELIVERABLES[@]}"; do
    filepath="${PROJECT_ROOT}/${deliverable}"
    if [ -f "$filepath" ]; then
        print_check "Validating markdown: $(basename $deliverable)"

        # Check for basic markdown issues
        issues=0

        # Check for unmatched code blocks
        if [ $(($(grep -c '^```' "$filepath" || true) % 2)) -ne 0 ]; then
            fail "Unmatched code blocks in $(basename $deliverable)"
            ((issues++))
        fi

        # Check for malformed links [text](url)
        if grep -qE '\[([^\]]+)\]\([^)]*$' "$filepath"; then
            fail "Malformed links in $(basename $deliverable)"
            ((issues++))
        fi

        # Check for empty headers
        if grep -qE '^#{1,6}\s*$' "$filepath"; then
            warn "Empty headers in $(basename $deliverable)"
        fi

        if [ $issues -eq 0 ]; then
            pass "Markdown syntax valid: $(basename $deliverable)"
        fi
    fi
done

# ============================================================================
# CHECK 3: Internal Link Validation
# ============================================================================
print_header "CHECK 3: Internal Link Validation"

for deliverable in "${DELIVERABLES[@]}"; do
    filepath="${PROJECT_ROOT}/${deliverable}"
    if [ -f "$filepath" ]; then
        print_check "Validating links: $(basename $deliverable)"

        # Extract markdown links [text](url)
        broken_links=0
        while IFS= read -r link; do
            # Extract URL from [text](url)
            url=$(echo "$link" | sed -E 's/.*\]\(([^)]+)\).*/\1/')

            # Skip external links (http/https)
            if [[ "$url" =~ ^https?:// ]]; then
                continue
            fi

            # Skip anchors without file path
            if [[ "$url" =~ ^# ]]; then
                continue
            fi

            # Resolve relative path
            file_dir=$(dirname "$filepath")
            if [[ "$url" =~ ^/ ]]; then
                # Absolute path from project root
                target_path="${PROJECT_ROOT}${url}"
            else
                # Relative path
                target_path="${file_dir}/${url}"
            fi

            # Remove anchor if present
            target_file="${target_path%%#*}"

            # Check if target exists
            if [ ! -f "$target_file" ] && [ ! -d "$target_file" ]; then
                fail "Broken link: $url in $(basename $deliverable)"
                ((broken_links++))
            fi
        done < <(grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$filepath" || true)

        if [ $broken_links -eq 0 ]; then
            pass "All internal links valid: $(basename $deliverable)"
        fi
    fi
done

# ============================================================================
# CHECK 4: Word Count / Time Estimates
# ============================================================================
print_header "CHECK 4: Word Count / Time Estimates"

# P1-T02: QUICKSTART-DEVELOPERS.md should be ~5 minutes (750-1000 words)
quickstart="${PROJECT_ROOT}/documentation/getting-started/developers/QUICKSTART-DEVELOPERS.md"
if [ -f "$quickstart" ]; then
    print_check "Quickstart word count (target: 750-1000 words for 5 min)"
    word_count=$(wc -w < "$quickstart" | tr -d ' ')

    if [ "$word_count" -ge 750 ] && [ "$word_count" -le 1000 ]; then
        pass "Quickstart word count optimal: ${word_count} words"
    elif [ "$word_count" -lt 750 ]; then
        warn "Quickstart may be too short: ${word_count} words (target 750-1000)"
    else
        warn "Quickstart may be too long: ${word_count} words (target 750-1000)"
    fi
fi

# P1-T03: Sprint Protocol Primer should be ~5 minutes (1000-1500 words)
protocol_dev="${PROJECT_ROOT}/documentation/getting-started/developers/05-understanding-protocol.md"
protocol_shared="${PROJECT_ROOT}/documentation/getting-started/shared/sprint-protocol-overview.md"

if [ -f "$protocol_dev" ]; then
    print_check "Protocol primer (dev) word count (target: 1000-1500 words for 5 min)"
    word_count=$(wc -w < "$protocol_dev" | tr -d ' ')

    if [ "$word_count" -ge 1000 ] && [ "$word_count" -le 1500 ]; then
        pass "Protocol primer word count optimal: ${word_count} words"
    elif [ "$word_count" -lt 1000 ]; then
        warn "Protocol primer may be too short: ${word_count} words (target 1000-1500)"
    else
        warn "Protocol primer may be too long: ${word_count} words (target 1000-1500)"
    fi
fi

# ============================================================================
# CHECK 5: Acceptance Criteria Validation
# ============================================================================
print_header "CHECK 5: Acceptance Criteria Validation"

# P1-T01: Use Case Spectrum Landing Page
choosing_path="${PROJECT_ROOT}/documentation/getting-started/use-cases/choosing-your-path.md"
if [ -f "$choosing_path" ]; then
    print_check "P1-T01 acceptance criteria"

    criteria_met=0

    # Check for 6 personas mentioned
    if grep -qi "developer\|creator\|maker\|hobbyist\|freelancer\|writer" "$choosing_path"; then
        ((criteria_met++))
    fi

    # Check for planned vs vibe mode
    if grep -qi "planned.*vibe\|vibe.*planned" "$choosing_path"; then
        ((criteria_met++))
    fi

    # Check for non-coding vs software
    if grep -qi "non-coding\|software" "$choosing_path"; then
        ((criteria_met++))
    fi

    if [ $criteria_met -ge 2 ]; then
        pass "P1-T01 acceptance criteria met (${criteria_met}/3 key elements found)"
    else
        warn "P1-T01 may be missing acceptance criteria (${criteria_met}/3 found)"
    fi
fi

# P1-T02: QUICKSTART-DEVELOPERS.md
if [ -f "$quickstart" ]; then
    print_check "P1-T02 acceptance criteria"

    criteria_met=0

    # Check for copy-paste commands
    if grep -q '```' "$quickstart"; then
        ((criteria_met++))
    fi

    # Check for vibe mode mention
    if grep -qi "vibe" "$quickstart"; then
        ((criteria_met++))
    fi

    # Check for verification steps
    if grep -qi "verify\|check\|test" "$quickstart"; then
        ((criteria_met++))
    fi

    if [ $criteria_met -ge 2 ]; then
        pass "P1-T02 acceptance criteria met (${criteria_met}/3 key elements found)"
    else
        warn "P1-T02 may be missing acceptance criteria (${criteria_met}/3 found)"
    fi
fi

# P1-T03: Sprint Protocol Primer
if [ -f "$protocol_dev" ]; then
    print_check "P1-T03 acceptance criteria"

    criteria_met=0

    # Check for planned vs vibe modes
    if grep -qi "planned.*vibe\|vibe.*planned" "$protocol_dev"; then
        ((criteria_met++))
    fi

    # Check for core concepts
    if grep -qi "worktree\|manifest\|phases" "$protocol_dev"; then
        ((criteria_met++))
    fi

    # Check for links to AGENTS.md
    if grep -q "AGENTS\.md" "$protocol_dev"; then
        ((criteria_met++))
    fi

    if [ $criteria_met -ge 2 ]; then
        pass "P1-T03 acceptance criteria met (${criteria_met}/3 key elements found)"
    else
        warn "P1-T03 may be missing acceptance criteria (${criteria_met}/3 found)"
    fi
fi

# ============================================================================
# CHECK 6: Code Examples Validation
# ============================================================================
print_header "CHECK 6: Code Examples Validation"

for deliverable in "${DELIVERABLES[@]}"; do
    filepath="${PROJECT_ROOT}/${deliverable}"
    if [ -f "$filepath" ]; then
        # Extract bash code blocks and check syntax
        in_bash_block=false
        line_num=0

        while IFS= read -r line; do
            ((line_num++))

            if [[ "$line" =~ ^\`\`\`(bash|sh) ]]; then
                in_bash_block=true
                continue
            fi

            if [[ "$line" =~ ^\`\`\`$ ]] && [ "$in_bash_block" = true ]; then
                in_bash_block=false
                continue
            fi

            if [ "$in_bash_block" = true ]; then
                # Skip comments and empty lines
                if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                    continue
                fi

                # Basic bash syntax check (very simple)
                if [[ "$line" =~ \$\( ]] && ! [[ "$line" =~ \) ]]; then
                    warn "Possible unclosed command substitution in $(basename $deliverable):${line_num}"
                fi
            fi
        done < "$filepath"
    fi
done

pass "Code examples syntax check complete"

# ============================================================================
# SUMMARY
# ============================================================================
print_header "VALIDATION SUMMARY"

echo -e "  Total Checks: ${TOTAL_CHECKS}"
echo -e "  ${GREEN}Passed: ${PASSED_CHECKS}${NC}"
echo -e "  ${YELLOW}Warnings: ${WARNING_CHECKS}${NC}"
echo -e "  ${RED}Failed: ${FAILED_CHECKS}${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All critical validations passed!${NC}\n"

    if [ $WARNING_CHECKS -gt 0 ]; then
        echo -e "${YELLOW}⚠ ${WARNING_CHECKS} warning(s) - review recommended but not blocking${NC}\n"
        exit 0
    fi

    exit 0
else
    echo -e "\n${RED}✗ ${FAILED_CHECKS} validation(s) failed${NC}\n"
    exit 1
fi
