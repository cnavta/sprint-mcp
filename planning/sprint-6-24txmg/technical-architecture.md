# Technical Architecture — LLM-Powered AGENTS.md Compression System
**Sprint**: sprint-6-24txmg
**Architect**: Claude (Sonnet 4.5)
**Created**: 2026-07-31

---

## Executive Summary

This document defines the technical architecture for an automated LLM-powered compression system that transforms `AGENTS-uncompressed.md` (the explicit, high-token source) into `AGENTS.md` (a semantically-compressed, LLM-optimized version) while preserving all semantic intent and operational requirements.

The system uses a two-phase approach:
1. **Semantic Extraction Phase**: Extracts core semantic invariants and success criteria from the uncompressed version
2. **Compression & Validation Phase**: Compresses the document using LLM guidance while validating semantic preservation

---

## 1. Problem Statement

### Current State

- **AGENTS-uncompressed.md**: ~960 lines, explicit intent, source of truth for protocol changes
- **AGENTS.md**: ~385 lines, manually compressed, semantically equivalent
- **Pain Point**: Manual compression is error-prone, time-consuming, and risks losing semantic fidelity

### Observed Compression Patterns

From analyzing both files, the compression approach includes:

1. **Structure Preservation**: Section headings, numbering, and hierarchy remain intact
2. **Template References**: Detailed inline examples replaced with references to `documentation/reference/` templates
3. **Semantic Condensation**: Multi-paragraph explanations reduced to concise statements preserving meaning
4. **Selective Omission**: Some sections (Sprint Index 2.3.2, Worktree details) completely removed
5. **Rule Consolidation**: Detailed rules tables remain, but explanatory text is condensed

### Requirements

1. **Semantic Preservation**: All operational requirements, rules, and decision points MUST be preserved
2. **LLM Optimization**: Output must be optimized for LLM coding agent consumption (clear, concise, scannable)
3. **Verifiable Correctness**: Success criteria must be machine-checkable
4. **Automation**: Process must be executable via npm script
5. **Maintainability**: Changes to AGENTS-uncompressed.md should trigger regeneration

---

## 2. Architectural Approach

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  LLM Compression Pipeline                    │
└─────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│   Semantic   │      │  Compression  │      │  Validation  │
│  Extractor   │─────▶│    Engine     │─────▶│   Engine     │
└──────────────┘      └───────────────┘      └──────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
  invariants.json       compressed.md         validation-report.json
```

### 2.2 Component Descriptions

#### **Semantic Extractor** (`src/compression/semantic-extractor.ts`)

**Purpose**: Extract semantic invariants that MUST be preserved in any compressed version

**Inputs**:
- `AGENTS-uncompressed.md` (source document)

**Outputs**:
- `semantic-invariants.json` (structured semantic requirements)

**Extraction Criteria**:
```json
{
  "structuralInvariants": {
    "sections": ["list of required section headings with numbering"],
    "rules": ["list of rule identifiers like S1, S2, S3..."],
    "mandatoryKeywords": ["MUST", "MUST NOT", "SHALL", "SHALL NOT", etc.]
  },
  "semanticRequirements": [
    {
      "id": "INV-001",
      "requirement": "Human approval required before implementation",
      "evidence": ["section references where this appears"],
      "criticality": "CRITICAL | HIGH | MEDIUM"
    }
  ],
  "processFlows": [
    {
      "id": "FLOW-001",
      "name": "Sprint Start",
      "steps": ["ordered list of required steps"],
      "gateChecks": ["approval gates that cannot be removed"]
    }
  ],
  "authorityBoundaries": [
    {
      "actor": "human | llm",
      "allowedActions": ["list"],
      "prohibitedActions": ["list"]
    }
  ]
}
```

**LLM Prompt Strategy**:
```typescript
const extractionPrompt = `
You are a semantic analysis engine. Your task is to extract the CORE SEMANTIC
INVARIANTS from a protocol document that MUST be preserved in any compressed version.

Focus on:
- Required process flows and their ordering
- Authority boundaries (who can do what)
- Approval gates and decision points
- Mandatory actions (MUST/MUST NOT)
- Critical rules that define system behavior

Extract these as structured JSON that can be used to validate a compressed version.
Do NOT include stylistic choices, examples, or explanatory text.

Document to analyze:
${agentsUncompressed}
`;
```

#### **Compression Engine** (`src/compression/compression-engine.ts`)

**Purpose**: Generate a semantically-compressed version optimized for LLM consumption

**Inputs**:
- `AGENTS-uncompressed.md` (source)
- `semantic-invariants.json` (constraints)
- `compression-config.json` (compression parameters)

**Outputs**:
- `AGENTS.md` (compressed version)
- `compression-report.json` (what changed and why)

**Compression Strategy**:

1. **Multi-Pass Compression**:
   - Pass 1: Structural analysis and section mapping
   - Pass 2: Semantic condensation with invariant checking
   - Pass 3: LLM optimization review

2. **LLM Prompt for Compression**:
```typescript
const compressionPrompt = `
You are a technical documentation compression specialist optimizing a protocol
document for LLM coding agent consumption.

CONSTRAINTS (These are INVARIANTS you MUST preserve):
${JSON.stringify(semanticInvariants, null, 2)}

COMPRESSION TECHNIQUES (apply in order):
1. Template Reference Replacement
   - Replace detailed inline examples with: "Before X, read \`documentation/reference/Y\`"
   - Preserve rule tables and critical process flows

2. Semantic Condensation
   - Reduce explanatory prose to essential meaning
   - Preserve all MUST/MUST NOT requirements
   - Keep authority boundaries explicit
   - Maintain rule identifiers (S1, S2, etc.)

3. Structure Optimization
   - Preserve section numbering and hierarchy
   - Keep critical tables and diagrams
   - Remove redundant examples when a template reference suffices

4. LLM Optimization
   - Use clear, scannable language
   - Front-load critical requirements
   - Maintain consistent terminology
   - Keep decision points unambiguous

FORBIDDEN:
- Removing or weakening MUST/MUST NOT statements
- Changing authority boundaries
- Omitting approval gates
- Altering process flow sequences
- Removing critical rules

SOURCE DOCUMENT:
${agentsUncompressed}

Generate the compressed version.
`;
```

3. **Compression Configuration** (`compression-config.json`):
```json
{
  "targetTokenReduction": 0.6,
  "preserveStructure": true,
  "templateReferencePatterns": [
    {
      "pattern": "detailed example of X",
      "replacement": "Before X, read `documentation/reference/X-template.md`"
    }
  ],
  "sectionOmissionRules": {
    "allowOmission": ["sections that can be completely removed"],
    "reason": ["why omission is safe"]
  },
  "llmOptimizations": {
    "preferActiveVoice": true,
    "preferImperativeMood": true,
    "avoidPassiveConstructions": true,
    "maxConsecutiveParagraphs": 3
  }
}
```

#### **Validation Engine** (`src/compression/validation-engine.ts`)

**Purpose**: Verify compressed version preserves all semantic invariants

**Inputs**:
- `AGENTS.md` (compressed version)
- `semantic-invariants.json` (required invariants)
- `AGENTS-uncompressed.md` (reference)

**Outputs**:
- `validation-report.json` (pass/fail with evidence)

**Validation Checks**:

1. **Structural Validation**:
   - All required sections present with correct numbering
   - All rule identifiers (S1-S14) present
   - Required tables and diagrams present

2. **Semantic Validation** (LLM-powered):
```typescript
const semanticValidationPrompt = `
You are a semantic equivalence validator. Compare two versions of a protocol
document to verify the compressed version preserves ALL semantic requirements.

SEMANTIC INVARIANTS (these MUST be present in compressed version):
${JSON.stringify(semanticInvariants, null, 2)}

VALIDATION TASKS:
For each invariant:
1. Locate it in the compressed document
2. Verify the semantic meaning is preserved (not just text match)
3. Confirm authority boundaries are unchanged
4. Check that process flows maintain required ordering
5. Verify all MUST/MUST NOT statements are present

Output a structured validation report with PASS/FAIL for each invariant
and specific evidence (line numbers, text excerpts).

REFERENCE (uncompressed):
${agentsUncompressed}

CANDIDATE (compressed):
${agentsCompressed}
`;
```

3. **Validation Report Structure**:
```json
{
  "validationTimestamp": "ISO-8601",
  "overallResult": "PASS | FAIL",
  "structuralChecks": {
    "sectionsPresent": { "result": "PASS", "missing": [] },
    "rulesPresent": { "result": "PASS", "missing": [] },
    "tablesPresent": { "result": "PASS", "missing": [] }
  },
  "semanticChecks": [
    {
      "invariantId": "INV-001",
      "requirement": "Human approval required before implementation",
      "result": "PASS | FAIL",
      "evidence": {
        "uncompressedLocation": "section 2.4, line 378",
        "compressedLocation": "section 2.4, line 148",
        "semanticEquivalence": "PRESERVED | WEAKENED | MISSING"
      },
      "details": "explanation of finding"
    }
  ],
  "recommendations": [
    "list of suggested fixes if FAIL"
  ]
}
```

---

## 3. Technology Stack

### 3.1 Core Dependencies

```json
{
  "dependencies": {
    "ai": "^4.0.0",                    // Vercel AI SDK
    "@ai-sdk/anthropic": "^1.0.0",     // Claude provider
    "zod": "^3.23.0",                   // Schema validation
    "js-yaml": "^4.1.0",                // YAML parsing (for configs)
    "commander": "^12.0.0"              // CLI interface
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "tsx": "^4.19.2"                    // TypeScript execution
  }
}
```

### 3.2 File Structure

```
src/
  compression/
    semantic-extractor.ts       # Extract invariants from source
    compression-engine.ts       # LLM-powered compression
    validation-engine.ts        # Validate semantic preservation
    types.ts                    # TypeScript types
    config.ts                   # Configuration management
    cli.ts                      # CLI entry point

config/
  compression-config.json       # Compression parameters

scripts/
  compress-agents.sh           # Orchestration script

.env.example                   # Environment variable template
```

### 3.3 npm Scripts

```json
{
  "scripts": {
    "compress:agents": "tsx src/compression/cli.ts compress",
    "compress:extract": "tsx src/compression/cli.ts extract",
    "compress:validate": "tsx src/compression/cli.ts validate",
    "compress:all": "npm run compress:extract && npm run compress:agents && npm run compress:validate"
  }
}
```

---

## 4. Execution Flow

### 4.1 End-to-End Process

```bash
# Full automated compression
npm run compress:all
```

**Sequence**:
1. **Extract** semantic invariants from `AGENTS-uncompressed.md`
   - Outputs: `planning/sprint-6-24txmg/semantic-invariants.json`

2. **Compress** using extracted invariants as constraints
   - Inputs: `AGENTS-uncompressed.md`, `semantic-invariants.json`
   - Outputs: `AGENTS.md`, `compression-report.json`

3. **Validate** compressed version preserves invariants
   - Inputs: `AGENTS.md`, `semantic-invariants.json`, `AGENTS-uncompressed.md`
   - Outputs: `validation-report.json`

4. **Exit Code**:
   - 0: Validation passed
   - 1: Validation failed (print recommendations)

### 4.2 CLI Interface

```typescript
// src/compression/cli.ts
import { Command } from 'commander';

const program = new Command();

program
  .name('agents-compressor')
  .description('LLM-powered compression for AGENTS.md protocol documents')
  .version('1.0.0');

program
  .command('extract')
  .description('Extract semantic invariants from AGENTS-uncompressed.md')
  .option('-i, --input <path>', 'Input file', 'AGENTS-uncompressed.md')
  .option('-o, --output <path>', 'Output file', 'semantic-invariants.json')
  .action(async (options) => {
    // Implementation
  });

program
  .command('compress')
  .description('Compress AGENTS-uncompressed.md to AGENTS.md')
  .option('-i, --input <path>', 'Input file', 'AGENTS-uncompressed.md')
  .option('-c, --config <path>', 'Config file', 'compression-config.json')
  .option('-s, --invariants <path>', 'Semantic invariants', 'semantic-invariants.json')
  .option('-o, --output <path>', 'Output file', 'AGENTS.md')
  .action(async (options) => {
    // Implementation
  });

program
  .command('validate')
  .description('Validate compressed version preserves semantic invariants')
  .option('--compressed <path>', 'Compressed file', 'AGENTS.md')
  .option('--reference <path>', 'Reference file', 'AGENTS-uncompressed.md')
  .option('--invariants <path>', 'Semantic invariants', 'semantic-invariants.json')
  .option('-o, --output <path>', 'Validation report', 'validation-report.json')
  .action(async (options) => {
    // Implementation
  });

program.parse();
```

---

## 5. LLM Integration Strategy

### 5.1 Vercel AI SDK Usage

```typescript
import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

// Semantic extraction with structured output
export async function extractSemanticInvariants(
  sourceDocument: string
): Promise<SemanticInvariants> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: SemanticInvariantsSchema,
    prompt: extractionPrompt(sourceDocument),
    temperature: 0.1, // Low temperature for precision
  });

  return object;
}

// Compression with text generation
export async function compressDocument(
  sourceDocument: string,
  invariants: SemanticInvariants,
  config: CompressionConfig
): Promise<string> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    prompt: compressionPrompt(sourceDocument, invariants, config),
    temperature: 0.3, // Slightly higher for stylistic choices
    maxTokens: 16000,
  });

  return text;
}

// Validation with structured output
export async function validateCompression(
  compressed: string,
  reference: string,
  invariants: SemanticInvariants
): Promise<ValidationReport> {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ValidationReportSchema,
    prompt: validationPrompt(compressed, reference, invariants),
    temperature: 0.1, // Low temperature for accuracy
  });

  return object;
}
```

### 5.2 Cost Optimization

- **Caching**: Use Vercel AI SDK prompt caching for repeated compression runs
- **Model Selection**: Use Claude Sonnet 4.5 (balance of quality and cost)
- **Streaming**: Not needed for this use case (batch processing)
- **Token Limits**: Input ~50K tokens, output ~20K tokens (well within limits)

---

## 6. Success Criteria

### 6.1 Functional Requirements

✅ **FR-1**: System successfully extracts semantic invariants from AGENTS-uncompressed.md
✅ **FR-2**: System generates AGENTS.md that passes all validation checks
✅ **FR-3**: Compressed version is 40-60% of original token count
✅ **FR-4**: All MUST/MUST NOT requirements preserved
✅ **FR-5**: All rule identifiers (S1-S14) present and correct
✅ **FR-6**: All authority boundaries preserved
✅ **FR-7**: All process flows maintain required ordering

### 6.2 Non-Functional Requirements

✅ **NFR-1**: Execution time < 2 minutes for full compression cycle
✅ **NFR-2**: Validation report provides actionable feedback on failures
✅ **NFR-3**: CLI interface is intuitive and well-documented
✅ **NFR-4**: System is idempotent (same input = same output)
✅ **NFR-5**: Configuration is version-controlled and auditable

### 6.3 Validation Acceptance

The compressed AGENTS.md is considered valid when:

1. **Structural validation passes**: All sections, rules, tables present
2. **Semantic validation passes**: All invariants verified as preserved
3. **Human review confirms**: Architect reviews validation report and compressed output
4. **Regression test**: Existing sprints would behave identically under compressed protocol

---

## 7. Risk Analysis

### 7.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucinates invalid compressed version | HIGH | Multi-pass validation with structured output schemas |
| Semantic invariant extraction incomplete | HIGH | Human review of extracted invariants before compression |
| Validation gives false positive | CRITICAL | Include human review step in acceptance criteria |
| Token limits exceeded on large documents | MEDIUM | Implement chunking strategy if needed |
| Inconsistent LLM outputs across runs | MEDIUM | Use low temperature (0.1-0.3) and seed where available |

### 7.2 Process Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual changes to AGENTS.md overwrite automation | MEDIUM | Add validation hook in CI to detect divergence |
| Compression config drift | LOW | Version control all config files |
| Cost of repeated LLM calls during development | LOW | Use local caching, optimize prompts |

---

## 8. Future Enhancements

### 8.1 Phase 2 Features

1. **Differential Compression**: Only recompress sections that changed in uncompressed version
2. **Multi-Format Output**: Generate HTML, PDF versions from same semantic model
3. **Version Comparison**: Automated diff between protocol versions
4. **LLM Fine-Tuning**: Custom model trained on protocol compression patterns
5. **Interactive Mode**: CLI wizard for reviewing/accepting compression decisions

### 8.2 Integration Points

- **CI/CD**: Automated validation that AGENTS.md matches AGENTS-uncompressed.md semantics
- **Documentation System**: Auto-generate reference templates mentioned in compressed version
- **Version Control**: Git hooks to detect manual edits to AGENTS.md

---

## 9. Implementation Plan Summary

### Phase 1: Foundation (This Sprint)
1. Implement semantic extractor with Vercel AI SDK
2. Implement compression engine
3. Implement validation engine
4. Create CLI interface
5. Write comprehensive tests
6. Document usage and configuration

### Phase 2: Validation (This Sprint)
1. Run full compression on AGENTS-uncompressed.md
2. Compare output to manually-compressed AGENTS.md
3. Iterate on invariant extraction and compression prompts
4. Achieve >95% semantic preservation score

### Phase 3: Automation (Future Sprint)
1. Integrate into npm scripts
2. Add CI/CD validation
3. Create monitoring for semantic drift
4. Document maintenance procedures

---

## 10. Open Questions for Human Review

1. **Semantic Invariant Sufficiency**: Are the proposed invariant categories comprehensive enough?
2. **Validation Threshold**: What % of semantic checks must pass for acceptance? (Recommend: 100%)
3. **Human-in-Loop**: Should compression require human approval before overwriting AGENTS.md?
4. **Template References**: Should system auto-generate referenced templates if missing?
5. **Version Strategy**: How should we version the compression config and invariants?

---

## Appendix A: Type Definitions

```typescript
// src/compression/types.ts

export interface SemanticInvariants {
  structuralInvariants: {
    sections: string[];
    rules: string[];
    mandatoryKeywords: string[];
  };
  semanticRequirements: SemanticRequirement[];
  processFlows: ProcessFlow[];
  authorityBoundaries: AuthorityBoundary[];
}

export interface SemanticRequirement {
  id: string;
  requirement: string;
  evidence: string[];
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface ProcessFlow {
  id: string;
  name: string;
  steps: string[];
  gateChecks: string[];
}

export interface AuthorityBoundary {
  actor: 'human' | 'llm';
  allowedActions: string[];
  prohibitedActions: string[];
}

export interface CompressionConfig {
  targetTokenReduction: number;
  preserveStructure: boolean;
  templateReferencePatterns: TemplatePattern[];
  sectionOmissionRules: {
    allowOmission: string[];
    reason: string[];
  };
  llmOptimizations: {
    preferActiveVoice: boolean;
    preferImperativeMood: boolean;
    avoidPassiveConstructions: boolean;
    maxConsecutiveParagraphs: number;
  };
}

export interface TemplatePattern {
  pattern: string;
  replacement: string;
}

export interface ValidationReport {
  validationTimestamp: string;
  overallResult: 'PASS' | 'FAIL';
  structuralChecks: StructuralChecks;
  semanticChecks: SemanticCheck[];
  recommendations: string[];
}

export interface StructuralChecks {
  sectionsPresent: { result: 'PASS' | 'FAIL'; missing: string[] };
  rulesPresent: { result: 'PASS' | 'FAIL'; missing: string[] };
  tablesPresent: { result: 'PASS' | 'FAIL'; missing: string[] };
}

export interface SemanticCheck {
  invariantId: string;
  requirement: string;
  result: 'PASS' | 'FAIL';
  evidence: {
    uncompressedLocation: string;
    compressedLocation: string;
    semanticEquivalence: 'PRESERVED' | 'WEAKENED' | 'MISSING';
  };
  details: string;
}
```

---

**End of Technical Architecture Document**

**Next Steps**: Human review and approval before implementation begins.
