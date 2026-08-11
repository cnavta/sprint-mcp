#!/bin/bash
# Sprint 19 Validation Script
# Validates protocol-phase-map test fixes

set -e

echo "=== Sprint 19 Validation: Protocol Phase Map Test Fixes ==="
echo

echo "Step 1: Install dependencies"
npm ci
echo "✅ Dependencies installed"
echo

echo "Step 2: Build project"
npm run build
echo "✅ Build successful"
echo

echo "Step 3: Run full test suite"
npm test
echo "✅ All tests passed"
echo

echo "=== Validation Complete ==="
echo "All validation steps passed successfully"
