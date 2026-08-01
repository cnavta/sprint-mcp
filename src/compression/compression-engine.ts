/**
 * Compression Engine
 *
 * This module uses LLM (Claude Sonnet 4.5) to compress protocol documents
 * while preserving semantic invariants.
 *
 * @module compression/compression-engine
 */

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  SemanticInvariants,
  CompressionConfig,
  CompressionReport,
} from './types.js';

/**
 * Compress a protocol document using LLM while preserving semantic invariants
 *
 * This function takes the uncompressed source document and applies LLM-powered
 * compression techniques while ensuring all semantic invariants are preserved.
 *
 * @param sourceDocument - The full text of the uncompressed protocol document
 * @param invariants - Semantic invariants that MUST be preserved
 * @param config - Compression configuration settings
 * @returns Promise resolving to compressed markdown string
 * @throws Error if LLM API call fails or compression is invalid
 *
 * @example
 * ```typescript
 * const source = await readFile('AGENTS-uncompressed.md', 'utf-8');
 * const invariants = JSON.parse(await readFile('semantic-invariants.json', 'utf-8'));
 * const config = loadCompressionConfig();
 * const compressed = await compressDocument(source, invariants, config);
 * ```
 */
export async function compressDocument(
  sourceDocument: string,
  invariants: SemanticInvariants,
  config: CompressionConfig
): Promise<string> {
  console.log('📦 Compressing document using Claude Sonnet 4.5...');
  console.log(`   Source length: ${sourceDocument.length} characters`);
  console.log(`   Target reduction: ${config.targetTokenReduction * 100}%`);
  console.log(`   Semantic requirements to preserve: ${invariants.semanticRequirements.length}`);

  const compressionPrompt = buildCompressionPrompt(
    sourceDocument,
    invariants,
    config
  );

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      prompt: compressionPrompt,
      temperature: 0.3, // Slightly higher for stylistic choices
    });

    console.log('✅ Document compressed successfully');
    console.log(`   Compressed length: ${text.length} characters`);
    console.log(
      `   Actual reduction: ${((1 - text.length / sourceDocument.length) * 100).toFixed(1)}%`
    );

    return text;
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Compression failed:', error.message);
      throw new Error(`Failed to compress document: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the LLM prompt for document compression
 *
 * @param sourceDocument - The source document to compress
 * @param invariants - Semantic invariants to preserve
 * @param config - Compression configuration
 * @returns Formatted prompt for LLM
 * @private
 */
function buildCompressionPrompt(
  sourceDocument: string,
  invariants: SemanticInvariants,
  config: CompressionConfig
): string {
  const invariantsList = formatInvariantsForPrompt(invariants);

  return `You are a technical documentation compression specialist. Your task is to compress a protocol document for LLM coding agent consumption while PRESERVING ALL SEMANTIC INVARIANTS.

## Your Mission

Compress the provided protocol document to approximately ${config.targetTokenReduction * 100}% token reduction while maintaining semantic equivalence. The compressed version must be optimized for LLM coding agents to understand and follow.

## CRITICAL CONSTRAINTS (You MUST preserve these)

${invariantsList}

## Compression Techniques (Apply in order)

### 1. Template Reference Replacement
Replace detailed inline examples with references to template files:
- Pattern: "Required contents: [detailed schema]"
- Replacement: "Before creating, read \`documentation/reference/[template].md\`"

Preserve rule tables and critical process flows.

### 2. Semantic Condensation
Reduce explanatory prose to essential meaning:
- Multi-paragraph explanations → concise statements
- Redundant examples → single representative example or template reference
- Verbose instructions → imperative, active voice
- **PRESERVE** all MUST/MUST NOT requirements exactly
- **PRESERVE** all authority boundaries explicitly
- **PRESERVE** all rule identifiers (S1, S2, S3, etc.)

### 3. Structure Optimization
${config.preserveStructure ? '**PRESERVE** section numbering and hierarchy' : 'Optimize section structure as needed'}
- Keep critical tables and decision flowcharts
- Remove redundant examples when a template reference suffices
- Consolidate related requirements

### 4. LLM Optimization
${config.llmOptimizations.preferActiveVoice ? '- Use active voice over passive' : ''}
${config.llmOptimizations.preferImperativeMood ? '- Use imperative mood for instructions' : ''}
${config.llmOptimizations.avoidPassiveConstructions ? '- Avoid passive constructions' : ''}
- Front-load critical requirements in each section
- Maintain consistent terminology
- Keep decision points unambiguous
- Use scannable formatting (tables, lists, headings)

## FORBIDDEN Actions

**NEVER** do these:
- Remove or weaken MUST/MUST NOT statements
- Change authority boundaries (who can do what)
- Omit approval gates
- Alter process flow sequences
- Remove or renumber critical rules
- Change the meaning of semantic requirements

## Quality Checks

Before returning the compressed version, verify:
1. All sections from structuralInvariants.sections are present
2. All rules from structuralInvariants.rules are present
3. All semantic requirements are preserved (may be condensed but meaning intact)
4. All process flows maintain correct ordering
5. Authority boundaries are clearly defined
6. Token reduction is approximately ${config.targetTokenReduction * 100}%

## Source Document to Compress

${sourceDocument}

---

Generate the compressed version now. Output ONLY the compressed markdown document, with NO preamble or explanation.`;
}

/**
 * Format semantic invariants for inclusion in the LLM prompt
 *
 * @param invariants - Semantic invariants to format
 * @returns Formatted string for prompt
 * @private
 */
function formatInvariantsForPrompt(invariants: SemanticInvariants): string {
  let formatted = '### Structural Invariants\n\n';

  formatted += '**Required Sections** (preserve numbering):\n';
  invariants.structuralInvariants.sections.forEach((section) => {
    formatted += `- ${section}\n`;
  });

  formatted += '\n**Required Rules** (preserve identifiers and meaning):\n';
  invariants.structuralInvariants.rules.forEach((rule) => {
    formatted += `- ${rule}\n`;
  });

  formatted += '\n**Mandatory Keywords**: ';
  formatted += invariants.structuralInvariants.mandatoryKeywords.join(', ');
  formatted += '\n\n';

  formatted += '### Semantic Requirements (CRITICAL - preserve meaning)\n\n';
  invariants.semanticRequirements
    .filter((req) => req.criticality === 'CRITICAL')
    .forEach((req) => {
      formatted += `**${req.id}** [${req.criticality}]: ${req.requirement}\n`;
    });

  formatted += '\n### Process Flows (preserve step ordering)\n\n';
  invariants.processFlows.forEach((flow) => {
    formatted += `**${flow.id}**: ${flow.name}\n`;
    formatted += `Steps: ${flow.steps.join(' → ')}\n`;
    if (flow.gateChecks.length > 0) {
      formatted += `Gate checks: ${flow.gateChecks.join(', ')}\n`;
    }
    formatted += '\n';
  });

  formatted += '### Authority Boundaries (preserve exactly)\n\n';
  invariants.authorityBoundaries.forEach((boundary) => {
    formatted += `**${boundary.actor.toUpperCase()}**:\n`;
    formatted += `- ALLOWED: ${boundary.allowedActions.join(', ')}\n`;
    formatted += `- PROHIBITED: ${boundary.prohibitedActions.join(', ')}\n\n`;
  });

  return formatted;
}

/**
 * Generate a compression report documenting what changed
 *
 * @param sourceDocument - Original source document
 * @param compressedDocument - Compressed document
 * @param invariantsPath - Path to semantic invariants file
 * @param configPath - Path to configuration file
 * @returns Compression report with metrics
 *
 * @example
 * ```typescript
 * const report = generateCompressionReport(source, compressed, 'invariants.json', 'config.json');
 * console.log(`Reduction: ${report.reductionPercentage}%`);
 * ```
 */
export function generateCompressionReport(
  sourceDocument: string,
  compressedDocument: string,
  invariantsPath: string,
  configPath: string
): CompressionReport {
  const sourceTokenCount = estimateTokenCount(sourceDocument);
  const compressedTokenCount = estimateTokenCount(compressedDocument);
  const reductionPercentage = ((1 - compressedTokenCount / sourceTokenCount) * 100);

  return {
    compressionTimestamp: new Date().toISOString(),
    sourceTokenCount,
    compressedTokenCount,
    reductionPercentage: parseFloat(reductionPercentage.toFixed(2)),
    changesApplied: {
      templateReferences: 0, // TODO: Count in future iteration
      semanticCondensations: 0, // TODO: Count in future iteration
      sectionsOmitted: [], // TODO: Track in future iteration
    },
    invariantsUsed: invariantsPath,
    configUsed: configPath,
  };
}

/**
 * Estimate token count for a document
 *
 * Uses a simple heuristic: ~4 characters per token for English text
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 * @private
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
