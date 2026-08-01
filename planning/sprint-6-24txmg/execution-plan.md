# Execution Plan – sprint-6-24txmg

**Sprint**: LLM-Powered AGENTS.md Compression System
**Owner**: christophernavta
**Lead Implementor**: Claude (Sonnet 4.5)
**Created**: 2026-07-31

---

## Objective

Create an automated, LLM-powered npm script that compresses `AGENTS-uncompressed.md` (the explicit, high-token source) into `AGENTS.md` (a semantically-compressed, LLM-optimized version) while preserving all semantic intent through automated validation.

**Success Definition**: The system reliably produces a compressed AGENTS.md that passes 100% of semantic validation checks, reducing token count by 40-60% while preserving all MUST/MUST NOT requirements, authority boundaries, and process flows.

---

## Scope

### In Scope

**Phase 1: Core Infrastructure**
- TypeScript type definitions for semantic invariants, validation reports, and configurations
- Configuration management system for compression parameters
- CLI interface with three commands: extract, compress, validate

**Phase 2: Semantic Extraction**
- LLM-powered semantic invariant extractor
- Extraction of structural requirements (sections, rules, tables)
- Extraction of semantic requirements (approval gates, authority boundaries)
- Extraction of process flows with ordered steps
- Extraction of authority boundaries (human vs LLM actions)
- JSON output of extracted invariants

**Phase 3: Compression Engine**
- LLM-powered compression using Vercel AI SDK and Claude Sonnet 4.5
- Multi-pass compression strategy
- Template reference replacement
- Semantic condensation with invariant constraints
- Compression report generation

**Phase 4: Validation Engine**
- Structural validation (sections, rules, tables present)
- LLM-powered semantic equivalence checking
- Validation report generation with actionable feedback
- Exit code based on validation results

**Phase 5: Integration & Testing**
- npm scripts for compress:extract, compress:agents, compress:validate, compress:all
- Unit tests for each engine component
- Integration tests for end-to-end flow
- Test fixtures with known-good invariants and compression examples
- Validation script integration

**Phase 6: Documentation & Handoff**
- README documentation for usage
- Configuration examples and templates
- Verification report documenting what was delivered
- Retrospective and key learnings

### Out of Scope

The following are explicitly **not** in this sprint:
- Differential compression (only full document compression)
- Multi-format output (HTML, PDF)
- Version comparison tooling
- LLM fine-tuning or custom models
- CI/CD integration (future sprint)
- Git hooks for auto-detection of manual edits
- Auto-generation of referenced template files
- Interactive/wizard mode for compression decisions

---

## Deliverables

### Code Deliverables

1. **Type Definitions** (`src/compression/types.ts`)
   - SemanticInvariants interface and schema
   - CompressionConfig interface
   - ValidationReport interface and schema
   - Supporting types

2. **Semantic Extractor** (`src/compression/semantic-extractor.ts`)
   - Extract semantic invariants from AGENTS-uncompressed.md
   - Generate structured JSON output
   - Use Vercel AI SDK with Claude Sonnet 4.5

3. **Compression Engine** (`src/compression/compression-engine.ts`)
   - Compress using extracted invariants as constraints
   - Apply template reference replacement
   - Generate compression report

4. **Validation Engine** (`src/compression/validation-engine.ts`)
   - Structural validation checks
   - Semantic equivalence validation using LLM
   - Generate actionable validation report

5. **Configuration System** (`src/compression/config.ts`)
   - Load and validate compression configuration
   - Default configuration management
   - Configuration schema validation

6. **CLI Interface** (`src/compression/cli.ts`)
   - Command: `extract` - Extract semantic invariants
   - Command: `compress` - Compress document
   - Command: `validate` - Validate compressed version
   - Proper error handling and user feedback

7. **Configuration Files**
   - `config/compression-config.json` - Compression parameters
   - `.env.example` - Environment variable template

### Test Deliverables

8. **Unit Tests**
   - `src/compression/__tests__/semantic-extractor.test.ts`
   - `src/compression/__tests__/compression-engine.test.ts`
   - `src/compression/__tests__/validation-engine.test.ts`
   - `src/compression/__tests__/config.test.ts`

9. **Integration Tests**
   - `src/compression/__tests__/integration.test.ts` - End-to-end flow

10. **Test Fixtures**
    - Sample semantic invariants JSON
    - Sample compression config
    - Sample validation report

### Documentation Deliverables

11. **Usage Documentation** (`README-compression.md`)
    - How to run compression
    - Configuration options
    - Interpreting validation reports
    - Troubleshooting common issues

12. **Sprint Artifacts**
    - `validate_deliverable.sh` - Real, executable validation script
    - `verification-report.md` - What was delivered vs planned
    - `retro.md` - Retrospective observations
    - `key-learnings.md` - Reusable learnings

---

## Acceptance Criteria

### Functional Acceptance

**AC-1**: Semantic extractor successfully extracts invariants from AGENTS-uncompressed.md
- Extracts all required sections, rules (S1-S14), and mandatory keywords
- Identifies all semantic requirements with criticality levels
- Captures all process flows with ordered steps and gate checks
- Defines authority boundaries for human and LLM actors
- Outputs valid JSON matching SemanticInvariants schema

**AC-2**: Compression engine produces valid compressed output
- Accepts AGENTS-uncompressed.md and semantic-invariants.json as inputs
- Applies compression using Vercel AI SDK and Claude Sonnet 4.5
- Reduces token count by 40-60%
- Outputs compressed markdown file
- Generates compression report documenting changes

**AC-3**: Validation engine correctly validates semantic preservation
- Performs structural validation (sections, rules, tables)
- Performs semantic validation using LLM
- Generates validation report with PASS/FAIL for each invariant
- Provides actionable recommendations on failures
- Returns exit code 0 on pass, 1 on fail

**AC-4**: CLI interface is functional and user-friendly
- `npm run compress:extract` runs extraction
- `npm run compress:agents` runs compression
- `npm run compress:validate` runs validation
- `npm run compress:all` runs complete pipeline
- Clear error messages and progress feedback

**AC-5**: End-to-end compression pipeline works correctly
- Can compress AGENTS-uncompressed.md to AGENTS.md
- Compressed version passes all validation checks
- Process is idempotent (same input = same output)
- Completes in < 2 minutes

### Quality Acceptance

**AC-6**: Test coverage meets standards
- Unit tests for all engine components
- Integration test for end-to-end flow
- Test coverage >80% for compression code
- All tests pass: `npm test`

**AC-7**: Code quality meets standards
- TypeScript strict mode enabled
- No lint errors: `npm run lint` (if configured)
- Proper error handling throughout
- No secrets or credentials in code

**AC-8**: Documentation is complete
- README-compression.md explains usage
- Code includes JSDoc comments for public APIs
- Configuration options documented
- Examples provided

### Traceability Acceptance

**AC-9**: All code changes are traceable
- Every file change maps to a backlog item
- Commits follow intentional commit protocol (section 2.5.1)
- Request log documents major decisions
- Verification report reconciles backlog with deliverables

---

## Testing Strategy

### Unit Testing

**Framework**: Jest (existing project standard)

**Coverage Areas**:
1. **Type Validation**: Zod schemas correctly validate/reject inputs
2. **Config Management**: Loading, validation, defaults work correctly
3. **Semantic Extraction**: Mock LLM responses and verify parsing
4. **Compression**: Mock LLM responses and verify output structure
5. **Validation**: Mock LLM responses and verify report generation

**Mocking Strategy**:
- Mock Vercel AI SDK responses for deterministic testing
- Use test fixtures for known-good invariants and compressed documents
- Mock file I/O where appropriate

### Integration Testing

**Scope**: End-to-end compression pipeline

**Test Cases**:
1. Extract → Compress → Validate with sample document
2. Validation failure detection and reporting
3. Configuration override handling
4. Error handling for missing files, invalid configs

**Test Fixtures**:
- `fixtures/sample-protocol.md` - Mini protocol document
- `fixtures/sample-invariants.json` - Known-good invariants
- `fixtures/sample-compressed.md` - Expected compression output

### Manual Testing

**Pre-Sprint Completion**:
1. Run full compression on actual AGENTS-uncompressed.md
2. Compare output to existing AGENTS.md
3. Review validation report for any failures
4. Iterate on prompts if semantic preservation < 100%

---

## Deployment Approach

### Not Applicable

This sprint produces developer tooling (npm scripts) that run locally. There is no deployment to cloud infrastructure.

### Local Installation

Users will run:
```bash
npm install        # Install dependencies (Vercel AI SDK, etc.)
npm run build      # Compile TypeScript
npm run compress:all   # Run compression pipeline
```

### Environment Variables

Required:
```bash
ANTHROPIC_API_KEY=<key>   # For Claude API access
```

Documented in `.env.example`.

---

## Completion Handoff and PR Policy

### Branch Push

- **Required**: Yes
- **Branch**: `feature/sprint-6-24txmg-llm-powered-agents-md-compress`
- **Timing**: After validation passes and before requesting sprint completion
- **Responsibility**: LLM (Lead Implementor)

### Pull Request

- **Desired**: Yes
- **Owner**: Human (christophernavta)
- **Timing**: After branch push and sprint completion
- **LLM Responsibility**: None - human will create PR after review
- **Status Recording**: LLM will record in `publication.yaml` that PR creation is human-owned

**Rationale**: The human should review the compression system and its output before merging to main, as this will affect the authoritative protocol document (AGENTS.md).

---

## Release Decision

### Release Policy

**Release Required**: No

**Rationale**: This sprint delivers internal developer tooling. There is no package to publish, no deployment to run, and no version tag to create. The compression system becomes available for use once the PR is merged to main.

**Future Consideration**: If we later decide to publish this as an npm package for other projects, that would be a separate sprint with explicit release criteria.

---

## Dependencies

### External Dependencies

**Required for Implementation**:
1. **Anthropic API Key**: For Claude Sonnet 4.5 access via Vercel AI SDK
   - Owned by: Human (must provide)
   - Blocker if unavailable: Yes
   - Fallback: None

**Required npm Packages**:
2. **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`)
   - Version: ^4.0.0 (latest stable)
   - Installation: `npm install ai @ai-sdk/anthropic`

3. **Zod** (`zod`)
   - Version: ^3.23.0
   - Purpose: Schema validation for structured LLM outputs

4. **Commander** (`commander`)
   - Version: ^12.0.0
   - Purpose: CLI interface

5. **js-yaml** (`js-yaml`)
   - Version: ^4.1.0
   - Purpose: YAML config file parsing

### Internal Dependencies

**Source Files**:
- `AGENTS-uncompressed.md` - Must exist and be current
- Existing project tsconfig, jest config, package.json

**No blocking dependencies** on other sprints or services.

---

## Definition of Done

This sprint follows the project-wide Definition of Done from AGENTS.md section 3:

### ✅ Code Quality
- Adheres to project and architecture.yaml constraints (if architecture.yaml exists)
- No TODOs or placeholder logic in production paths
- TypeScript strict mode enabled, no type errors
- Stubs allowed only in test fixtures

### ✅ Testing
- Tests for all new behavior using Jest
- Mocks for Vercel AI SDK (external dependency)
- `npm test` must pass
- Test coverage >80% for compression code
- No test deferral without explicit human approval

### ✅ Deployment Artifacts
- Not applicable (local tooling, not deployed service)

### ✅ Documentation
- README-compression.md explains usage, configuration, troubleshooting
- JSDoc comments on public APIs
- Configuration examples provided
- Rationale for compression strategy documented in technical architecture

### ✅ Traceability
All code changes trace back to:
- Sprint sprint-6-24txmg
- Request IDs in `request-log.md`
- Backlog items in `backlog.yaml`
- Intent-focused commits following protocol section 2.5.1

### ✅ Validation
- `validate_deliverable.sh` exists and is logically passable
- Runs: `npm ci && npm run build && npm test && npm run compress:all`
- Exit code 0 indicates success

---

## Risk Management

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM hallucination produces invalid compression | Medium | High | Multi-pass validation with structured schemas; human review of first compression output |
| Semantic invariant extraction is incomplete | Medium | High | Human review of extracted invariants before compression; iterative refinement |
| Validation gives false positive (says valid when not) | Low | Critical | Include manual human review in acceptance criteria AC-5 |
| Token limits exceeded | Low | Medium | Current doc is ~50K tokens input, well within limits; chunking strategy documented for future |
| Inconsistent LLM outputs across runs | Medium | Medium | Use temperature 0.1-0.3; validate idempotency in tests |
| API rate limits or cost overruns | Low | Low | Single compression run ~3 LLM calls; cost negligible for development |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing ANTHROPIC_API_KEY blocks development | High | High | Human provides key at sprint start; documented in execution plan dependencies |
| Scope creep (adding Phase 2 features) | Medium | Medium | Strict adherence to "Out of Scope" section; backlog approval gate |
| Compressed output differs from existing AGENTS.md | High | Low | Expected - current AGENTS.md is manually compressed; validation against invariants is success criteria, not text match |

---

## Timeline Estimate

**Total Estimated Duration**: 6-8 hours of LLM implementation time

**Phase Breakdown**:
1. **Foundation** (1-2 hours): Types, config, CLI skeleton
2. **Semantic Extraction** (1.5-2 hours): Extractor implementation, prompt engineering, testing
3. **Compression Engine** (1.5-2 hours): Compression implementation, prompt engineering, testing
4. **Validation Engine** (1.5-2 hours): Validation implementation, prompt engineering, testing
5. **Integration & Testing** (1-1.5 hours): End-to-end tests, fixtures, validation script
6. **Documentation & Handoff** (0.5-1 hour): README, verification report, retro, learnings

**Critical Path**: Semantic Extraction → Compression → Validation (sequential dependencies)

**Parallel Work**: Tests can be written alongside implementation

---

## Open Questions for Human Approval

Before implementation begins, the following questions from the technical architecture require human decisions:

### Q1: Semantic Invariant Sufficiency
**Question**: Are the proposed invariant categories (structural, semantic requirements, process flows, authority boundaries) comprehensive enough?

**Options**:
- A) Yes, proceed with proposed categories
- B) Add additional invariant categories (specify)

**Recommendation**: Option A - categories cover the compression patterns observed

---

### Q2: Validation Threshold
**Question**: What % of semantic checks must pass for validation acceptance?

**Options**:
- A) 100% (strict - any failure blocks acceptance)
- B) 95% (allow minor discrepancies)
- C) Custom threshold (specify)

**Recommendation**: Option A - 100% pass required for semantic integrity

---

### Q3: Human-in-Loop for Compression
**Question**: Should compression require human approval before overwriting AGENTS.md?

**Options**:
- A) Yes - generate to temp file, require human review/approval before overwrite
- B) No - directly overwrite AGENTS.md (can revert via git)
- C) Make it configurable

**Recommendation**: Option A for first run, Option B for subsequent runs after validation

---

### Q4: Template References
**Question**: Should system auto-generate referenced template files if missing (e.g., `documentation/reference/execution-plan-template.md`)?

**Options**:
- A) Yes - generate stub templates
- B) No - compression can reference templates whether they exist or not
- C) Warn if referenced template missing but don't block

**Recommendation**: Option C - warn but don't block (template generation is future work)

---

### Q5: Version Strategy
**Question**: How should we version the compression config and semantic invariants?

**Options**:
- A) Version-control in git with AGENTS-uncompressed.md
- B) Generate fresh on each run (don't persist)
- C) Persist with timestamps for audit trail

**Recommendation**: Option A - version control for reproducibility

---

## Approval Request

**This execution plan requires explicit human approval before implementation begins (Sprint Protocol §2.4).**

After reviewing:
1. The execution plan above
2. The backlog (backlog.yaml, to be presented next)
3. Answering the 5 open questions

Please approve by saying **"Approved"** or request changes.

---

**End of Execution Plan**
