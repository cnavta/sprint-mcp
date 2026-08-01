/**
 * Semantic Invariant Extractor
 *
 * This module uses LLM (Claude Sonnet 4.5) to extract semantic invariants
 * from the uncompressed protocol document. These invariants define what MUST
 * be preserved in any compressed version.
 *
 * @module compression/semantic-extractor
 */

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  SemanticInvariants,
  SemanticInvariantsSchema,
} from './types.js';

/**
 * Extract semantic invariants from source document using LLM
 *
 * This function analyzes the source protocol document and extracts:
 * - Structural invariants (sections, rules, keywords)
 * - Semantic requirements (approval gates, authority boundaries)
 * - Process flows (ordered steps, gate checks)
 * - Authority boundaries (human vs LLM actions)
 *
 * @param sourceDocument - The full text of the uncompressed protocol document
 * @returns Promise resolving to structured semantic invariants
 * @throws Error if LLM API call fails or response is invalid
 *
 * @example
 * ```typescript
 * const agentsUncompressed = await readFile('AGENTS-uncompressed.md', 'utf-8');
 * const invariants = await extractSemanticInvariants(agentsUncompressed);
 * console.log(`Extracted ${invariants.semanticRequirements.length} requirements`);
 * ```
 */
export async function extractSemanticInvariants(
  sourceDocument: string
): Promise<SemanticInvariants> {
  console.log('🔍 Extracting semantic invariants using Claude Sonnet 4.5...');
  console.log(`   Source document length: ${sourceDocument.length} characters`);

  const extractionPrompt = buildExtractionPrompt(sourceDocument);

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: SemanticInvariantsSchema,
      prompt: extractionPrompt,
      temperature: 0.1, // Low temperature for precision
    });

    console.log('✅ Semantic invariants extracted successfully');
    console.log(`   Sections: ${object.structuralInvariants.sections.length}`);
    console.log(`   Rules: ${object.structuralInvariants.rules.length}`);
    console.log(`   Semantic requirements: ${object.semanticRequirements.length}`);
    console.log(`   Process flows: ${object.processFlows.length}`);
    console.log(`   Authority boundaries: ${object.authorityBoundaries.length}`);

    return object;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Semantic extraction failed:', error.message);
      throw new Error(`Failed to extract semantic invariants: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the LLM prompt for semantic invariant extraction
 *
 * @param sourceDocument - The source document to analyze
 * @returns Formatted prompt for LLM
 * @private
 */
function buildExtractionPrompt(sourceDocument: string): string {
  return `You are a semantic analysis engine. Your task is to extract the CORE SEMANTIC INVARIANTS from a protocol document that MUST be preserved in any compressed version.

## Your Mission

Analyze the provided protocol document and extract semantic invariants as structured JSON. Focus ONLY on the invariants - the essential semantic content that must be preserved. Do NOT include stylistic choices, examples, or explanatory text.

## What to Extract

### 1. Structural Invariants
- **sections**: List ALL section headings with their numbering (e.g., "2.1 Sprint Control Rules", "2.5.1 Intentional Commit Protocol")
- **rules**: List ALL rule identifiers (e.g., "S1", "S2", "S3", "S11", "S12", etc.) that define protocol behavior
- **mandatoryKeywords**: Keywords indicating requirements (MUST, MUST NOT, SHALL, SHALL NOT, REQUIRED, etc.)

### 2. Semantic Requirements
For each CRITICAL semantic requirement:
- **id**: Unique identifier (INV-001, INV-002, etc.)
- **requirement**: One-sentence statement of the requirement
- **evidence**: Section references where this appears
- **criticality**: CRITICAL (breaks protocol), HIGH (major issue), or MEDIUM (minor issue)

Focus on:
- Approval gates (human must approve before X)
- Authority boundaries (who can/cannot do what)
- Required process steps
- Mandatory validations
- Completion criteria

### 3. Process Flows
For each major process (e.g., Sprint Start, Execution, Validation):
- **id**: Flow identifier (FLOW-001, FLOW-002, etc.)
- **name**: Human-readable flow name
- **steps**: Ordered list of required steps
- **gateChecks**: Approval gates or blocking conditions

### 4. Authority Boundaries
For human and LLM actors:
- **actor**: "human" or "llm"
- **allowedActions**: What this actor CAN do
- **prohibitedActions**: What this actor MUST NOT do

## Example Output Structure

{
  "structuralInvariants": {
    "sections": ["0. Precedence & Scope", "2.1 Sprint Control Rules", ...],
    "rules": ["S1", "S2", "S3", "S11", "S12", ...],
    "mandatoryKeywords": ["MUST", "MUST NOT", "SHALL", "SHALL NOT", ...]
  },
  "semanticRequirements": [
    {
      "id": "INV-001",
      "requirement": "Human approval required before implementation begins",
      "evidence": ["2.4 Planning Phase", "S6 approval rule"],
      "criticality": "CRITICAL"
    }
  ],
  "processFlows": [
    {
      "id": "FLOW-001",
      "name": "Sprint Start",
      "steps": ["Check for active sprints", "Generate sprint ID", "Create sprint directory", ...],
      "gateChecks": ["No active sprints exist (S3)"]
    }
  ],
  "authorityBoundaries": [
    {
      "actor": "human",
      "allowedActions": ["Approve plans", "Complete sprint", "Force complete", "Create PR"],
      "prohibitedActions": []
    },
    {
      "actor": "llm",
      "allowedActions": ["Execute shell commands", "Create commits", "Push branch"],
      "prohibitedActions": ["Execute release", "Create PR without assignment", "Infer approval"]
    }
  ]
}

## Important Guidelines

1. **Be Comprehensive**: Extract ALL rules, sections, and critical requirements
2. **Be Precise**: Each requirement should be a clear, atomic statement
3. **Be Structured**: Follow the schema exactly - this will be validated
4. **Prioritize Criticality**:
   - CRITICAL: Violations break the protocol or compromise safety
   - HIGH: Major deviations that affect sprint integrity
   - MEDIUM: Minor issues that should be preserved but aren't blocking
5. **Preserve Ordering**: Process flow steps must maintain their required sequence
6. **No Interpretation**: Extract what IS stated, not what you think it means

---

## Document to Analyze

${sourceDocument}

---

Extract the semantic invariants now.`;
}

/**
 * Validate extracted semantic invariants
 *
 * Performs sanity checks on extracted invariants to ensure they are usable
 * for compression validation.
 *
 * @param invariants - Extracted semantic invariants
 * @returns True if valid, throws error if invalid
 * @throws Error with details if invariants are incomplete or invalid
 *
 * @example
 * ```typescript
 * const invariants = await extractSemanticInvariants(source);
 * validateExtractedInvariants(invariants);
 * ```
 */
export function validateExtractedInvariants(
  invariants: SemanticInvariants
): boolean {
  const errors: string[] = [];

  // Check structural invariants
  if (invariants.structuralInvariants.sections.length === 0) {
    errors.push('No sections extracted');
  }
  if (invariants.structuralInvariants.rules.length === 0) {
    errors.push('No rules extracted');
  }

  // Check semantic requirements
  if (invariants.semanticRequirements.length === 0) {
    errors.push('No semantic requirements extracted');
  }

  // Check process flows
  if (invariants.processFlows.length === 0) {
    errors.push('No process flows extracted');
  }

  // Check authority boundaries
  const hasHumanBoundary = invariants.authorityBoundaries.some(
    (b) => b.actor === 'human'
  );
  const hasLlmBoundary = invariants.authorityBoundaries.some(
    (b) => b.actor === 'llm'
  );

  if (!hasHumanBoundary) {
    errors.push('No human authority boundary extracted');
  }
  if (!hasLlmBoundary) {
    errors.push('No LLM authority boundary extracted');
  }

  // Check for duplicate IDs
  const requirementIds = invariants.semanticRequirements.map((r) => r.id);
  const flowIds = invariants.processFlows.map((f) => f.id);
  const allIds = [...requirementIds, ...flowIds];
  const uniqueIds = new Set(allIds);

  if (allIds.length !== uniqueIds.size) {
    errors.push('Duplicate IDs found in invariants');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid semantic invariants:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }

  console.log('✅ Semantic invariants validation passed');
  return true;
}
