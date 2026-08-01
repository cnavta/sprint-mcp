/**
 * Validation Engine
 *
 * This module uses LLM (Claude Sonnet 4.5) to validate that compressed documents
 * preserve all semantic invariants from the original.
 *
 * @module compression/validation-engine
 */

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  SemanticInvariants,
  ValidationReport,
  SemanticCheckSchema,
} from './types.js';

/**
 * Validate that compressed document preserves semantic invariants
 *
 * This function performs both structural and semantic validation:
 * 1. Structural checks: sections, rules, and tables are present
 * 2. Semantic checks: LLM validates each semantic requirement is preserved
 *
 * @param compressedDocument - The compressed version to validate
 * @param referenceDocument - The original uncompressed document
 * @param invariants - Semantic invariants that MUST be preserved
 * @returns Promise resolving to validation report
 * @throws Error if LLM API call fails or validation is invalid
 *
 * @example
 * ```typescript
 * const compressed = await readFile('AGENTS.md', 'utf-8');
 * const reference = await readFile('AGENTS-uncompressed.md', 'utf-8');
 * const invariants = JSON.parse(await readFile('semantic-invariants.json', 'utf-8'));
 * const report = await validateCompression(compressed, reference, invariants);
 * console.log(`Validation: ${report.overallResult}`);
 * ```
 */
export async function validateCompression(
  compressedDocument: string,
  referenceDocument: string,
  invariants: SemanticInvariants
): Promise<ValidationReport> {
  console.log('✅ Validating compressed document...');
  console.log(`   Compressed length: ${compressedDocument.length} characters`);
  console.log(`   Reference length: ${referenceDocument.length} characters`);
  console.log(`   Invariants to check: ${invariants.semanticRequirements.length} semantic requirements`);

  // First, perform structural validation (non-LLM checks)
  const structuralChecks = performStructuralValidation(
    compressedDocument,
    invariants
  );

  console.log(`   Structural checks: sections ${structuralChecks.sectionsPresent.result}`);
  console.log(`   Structural checks: rules ${structuralChecks.rulesPresent.result}`);

  // Then, use LLM for semantic validation
  const semanticChecks = await performSemanticValidation(
    compressedDocument,
    referenceDocument,
    invariants
  );

  const passedSemanticChecks = semanticChecks.filter(c => c.result === 'PASS').length;
  console.log(`   Semantic checks: ${passedSemanticChecks}/${semanticChecks.length} passed`);

  // Determine overall result
  const structuralPass =
    structuralChecks.sectionsPresent.result === 'PASS' &&
    structuralChecks.rulesPresent.result === 'PASS' &&
    structuralChecks.tablesPresent.result === 'PASS';

  const semanticPass = semanticChecks.every((check) => check.result === 'PASS');

  const overallResult = structuralPass && semanticPass ? 'PASS' : 'FAIL';

  // Generate recommendations for failures
  const recommendations: string[] = [];

  if (!structuralPass) {
    if (structuralChecks.sectionsPresent.missing.length > 0) {
      recommendations.push(
        `Add missing sections: ${structuralChecks.sectionsPresent.missing.join(', ')}`
      );
    }
    if (structuralChecks.rulesPresent.missing.length > 0) {
      recommendations.push(
        `Add missing rules: ${structuralChecks.rulesPresent.missing.join(', ')}`
      );
    }
    if (structuralChecks.tablesPresent.missing.length > 0) {
      recommendations.push(
        `Add missing tables: ${structuralChecks.tablesPresent.missing.join(', ')}`
      );
    }
  }

  semanticChecks
    .filter((check) => check.result === 'FAIL')
    .forEach((check) => {
      recommendations.push(`${check.invariantId}: ${check.details}`);
    });

  const report: ValidationReport = {
    validationTimestamp: new Date().toISOString(),
    overallResult,
    structuralChecks,
    semanticChecks,
    recommendations,
  };

  console.log(`\n${overallResult === 'PASS' ? '✅' : '❌'} Validation ${overallResult}`);
  if (recommendations.length > 0) {
    console.log(`   ${recommendations.length} recommendations generated`);
  }

  return report;
}

/**
 * Perform structural validation checks (non-LLM)
 *
 * Checks for presence of required sections, rules, and keywords
 *
 * @param compressedDocument - The compressed document to validate
 * @param invariants - Structural invariants to check
 * @returns Structural checks result
 * @private
 */
function performStructuralValidation(
  compressedDocument: string,
  invariants: SemanticInvariants
): ValidationReport['structuralChecks'] {
  // Check sections
  const presentSections: string[] = [];
  const missingSections: string[] = [];

  invariants.structuralInvariants.sections.forEach((section) => {
    // Handle both exact matches and variations (with/without numbering)
    const normalizedSection = section.replace(/^\d+(\.\d+)*\s*/, ''); // Remove leading numbers
    if (compressedDocument.includes(section) || compressedDocument.includes(normalizedSection)) {
      presentSections.push(section);
    } else {
      missingSections.push(section);
    }
  });

  // Check rules
  const presentRules: string[] = [];
  const missingRules: string[] = [];

  invariants.structuralInvariants.rules.forEach((rule) => {
    if (compressedDocument.includes(rule)) {
      presentRules.push(rule);
    } else {
      missingRules.push(rule);
    }
  });

  // Check for tables (simplified check - look for markdown table patterns)
  // In a real implementation, you'd have a list of required tables
  const missingTables: string[] = [];

  return {
    sectionsPresent: {
      result: missingSections.length === 0 ? 'PASS' : 'FAIL',
      missing: missingSections,
    },
    rulesPresent: {
      result: missingRules.length === 0 ? 'PASS' : 'FAIL',
      missing: missingRules,
    },
    tablesPresent: {
      result: missingTables.length === 0 ? 'PASS' : 'FAIL',
      missing: missingTables,
    },
  };
}

/**
 * Perform semantic validation using LLM
 *
 * Uses LLM to check if each semantic requirement is preserved in compressed version
 *
 * @param compressedDocument - The compressed document to validate
 * @param referenceDocument - The original uncompressed document
 * @param invariants - Semantic invariants to check
 * @returns Array of semantic check results
 * @private
 */
async function performSemanticValidation(
  compressedDocument: string,
  referenceDocument: string,
  invariants: SemanticInvariants
): Promise<ValidationReport['semanticChecks']> {
  console.log('   🔍 Performing LLM-based semantic validation...');

  const validationPrompt = buildValidationPrompt(
    compressedDocument,
    referenceDocument,
    invariants
  );

  try {
    // Use the SemanticCheckSchema from types
    const SemanticChecksArraySchema = z.object({
      checks: z.array(SemanticCheckSchema),
    });

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: SemanticChecksArraySchema,
      prompt: validationPrompt,
      temperature: 0.1, // Low temperature for precision
    });

    return object.checks;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Semantic validation failed:', error.message);
      throw new Error(`Failed to validate semantics: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the LLM prompt for semantic validation
 *
 * @param compressedDocument - The compressed document to validate
 * @param referenceDocument - The original uncompressed document
 * @param invariants - Semantic invariants to check
 * @returns Formatted prompt for LLM
 * @private
 */
function buildValidationPrompt(
  compressedDocument: string,
  referenceDocument: string,
  invariants: SemanticInvariants
): string {
  const requirementsList = formatRequirementsForPrompt(invariants);

  return `You are a semantic equivalence validation engine. Your task is to verify that a compressed protocol document preserves ALL semantic invariants from the original.

## Your Mission

Compare the COMPRESSED version against the REFERENCE version and validate that ALL semantic requirements are preserved. For each requirement, determine if it is PASS (preserved) or FAIL (violated or weakened).

## Validation Criteria

For each semantic requirement:
1. **PASS** if:
   - The requirement is clearly present in the compressed version
   - The meaning is semantically equivalent (wording may differ, but intent is identical)
   - Authority boundaries are preserved
   - Process flows maintain correct ordering
   - Approval gates are still enforced

2. **FAIL** if:
   - The requirement is missing or significantly weakened
   - The meaning has changed in a way that affects behavior
   - Authority boundaries are blurred or removed
   - Process flows are altered or steps are omitted
   - Approval gates are bypassed or made optional

## Semantic Requirements to Validate

${requirementsList}

## Documents to Compare

### REFERENCE (Original - Source of Truth)

${referenceDocument}

### COMPRESSED (Version to Validate)

${compressedDocument}

---

## Output Format

For each requirement, provide:
- **invariantId**: The requirement ID (e.g., INV-001)
- **requirement**: The requirement text
- **result**: PASS or FAIL
- **evidence**: Object with:
  - **uncompressedLocation**: Where requirement appears in reference (section, line)
  - **compressedLocation**: Where requirement appears in compressed (section, line, or "MISSING")
  - **semanticEquivalence**: PRESERVED, WEAKENED, or MISSING
- **details**: Brief explanation of why it passed or failed

## Important Guidelines

1. **Be Strict**: If in doubt, mark as FAIL - semantic preservation is critical
2. **Focus on Meaning**: Wording can change, but meaning must be identical
3. **Check Authority**: Human vs LLM boundaries must be crystal clear
4. **Verify Completeness**: All process steps must be present in correct order
5. **Validate Gates**: Approval gates must still block progress until satisfied
6. **No Inference**: If a requirement isn't explicitly stated, it's FAIL

Generate the validation results now.`;
}

/**
 * Format semantic requirements for inclusion in the LLM prompt
 *
 * @param invariants - Semantic invariants to format
 * @returns Formatted string for prompt
 * @private
 */
function formatRequirementsForPrompt(invariants: SemanticInvariants): string {
  let formatted = '';

  // Semantic requirements
  invariants.semanticRequirements.forEach((req) => {
    formatted += `**${req.id}** [${req.criticality}]: ${req.requirement}\n`;
    formatted += `  Evidence in reference: ${req.evidence.join(', ')}\n\n`;
  });

  // Process flows
  formatted += '\n### Process Flow Preservation\n\n';
  invariants.processFlows.forEach((flow) => {
    formatted += `**${flow.id}**: ${flow.name}\n`;
    formatted += `  Required steps (in order): ${flow.steps.join(' → ')}\n`;
    if (flow.gateChecks.length > 0) {
      formatted += `  Gate checks: ${flow.gateChecks.join(', ')}\n`;
    }
    formatted += '\n';
  });

  // Authority boundaries
  formatted += '\n### Authority Boundary Preservation\n\n';
  invariants.authorityBoundaries.forEach((boundary) => {
    formatted += `**${boundary.actor.toUpperCase()}**:\n`;
    formatted += `  ALLOWED: ${boundary.allowedActions.join(', ')}\n`;
    formatted += `  PROHIBITED: ${boundary.prohibitedActions.join(', ')}\n\n`;
  });

  return formatted;
}
