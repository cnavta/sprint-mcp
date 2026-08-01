/**
 * Type Definitions for LLM-Powered AGENTS.md Compression System
 *
 * This module defines all TypeScript interfaces and Zod schemas for:
 * - Semantic invariants extraction
 * - Compression configuration
 * - Validation reporting
 *
 * @module compression/types
 */

import { z } from 'zod';

// ============================================================================
// SEMANTIC INVARIANTS - Extracted requirements that MUST be preserved
// ============================================================================

/**
 * Semantic requirement that must be preserved in compressed version
 */
export const SemanticRequirementSchema = z.object({
  id: z.string().describe('Unique identifier (e.g., INV-001)'),
  requirement: z.string().describe('The semantic requirement to preserve'),
  evidence: z
    .array(z.string())
    .describe('Section references where this appears in source'),
  criticality: z
    .enum(['CRITICAL', 'HIGH', 'MEDIUM'])
    .describe('Importance level of this requirement'),
});

export type SemanticRequirement = z.infer<typeof SemanticRequirementSchema>;

/**
 * Process flow with ordered steps and gate checks
 */
export const ProcessFlowSchema = z.object({
  id: z.string().describe('Flow identifier (e.g., FLOW-001)'),
  name: z.string().describe('Human-readable flow name'),
  steps: z
    .array(z.string())
    .describe('Ordered list of required steps in this process'),
  gateChecks: z
    .array(z.string())
    .describe('Approval gates that cannot be removed'),
});

export type ProcessFlow = z.infer<typeof ProcessFlowSchema>;

/**
 * Authority boundary defining what human vs LLM can do
 */
export const AuthorityBoundarySchema = z.object({
  actor: z.enum(['human', 'llm']).describe('Who this boundary applies to'),
  allowedActions: z.array(z.string()).describe('Actions this actor CAN perform'),
  prohibitedActions: z
    .array(z.string())
    .describe('Actions this actor MUST NOT perform'),
});

export type AuthorityBoundary = z.infer<typeof AuthorityBoundarySchema>;

/**
 * Complete set of semantic invariants extracted from source document
 */
export const SemanticInvariantsSchema = z.object({
  structuralInvariants: z.object({
    sections: z
      .array(z.string())
      .describe('Required section headings with numbering'),
    rules: z
      .array(z.string())
      .describe('Rule identifiers that must be present (e.g., S1, S2, S3)'),
    mandatoryKeywords: z
      .array(z.string())
      .describe('Keywords that indicate requirements (MUST, MUST NOT, etc.)'),
  }),
  semanticRequirements: z
    .array(SemanticRequirementSchema)
    .describe('Core semantic requirements to preserve'),
  processFlows: z
    .array(ProcessFlowSchema)
    .describe('Process flows with ordering constraints'),
  authorityBoundaries: z
    .array(AuthorityBoundarySchema)
    .describe('Human vs LLM authority definitions'),
});

export type SemanticInvariants = z.infer<typeof SemanticInvariantsSchema>;

// ============================================================================
// COMPRESSION CONFIGURATION
// ============================================================================

/**
 * Template reference replacement pattern
 */
export const TemplatePatternSchema = z.object({
  pattern: z
    .string()
    .describe('Pattern to match in source document (e.g., "detailed example of X")'),
  replacement: z
    .string()
    .describe(
      'Replacement text (e.g., "Before X, read `documentation/reference/X-template.md`")'
    ),
});

export type TemplatePattern = z.infer<typeof TemplatePatternSchema>;

/**
 * Configuration for compression engine
 */
export const CompressionConfigSchema = z.object({
  targetTokenReduction: z
    .number()
    .min(0)
    .max(1)
    .describe('Target reduction ratio (0.6 = 60% reduction)'),
  preserveStructure: z
    .boolean()
    .describe('Whether to preserve section numbering and hierarchy'),
  templateReferencePatterns: z
    .array(TemplatePatternSchema)
    .describe('Patterns for replacing detailed examples with template references'),
  sectionOmissionRules: z.object({
    allowOmission: z
      .array(z.string())
      .describe('Sections that can be completely removed'),
    reason: z.array(z.string()).describe('Rationale for each omission'),
  }),
  llmOptimizations: z.object({
    preferActiveVoice: z.boolean().describe('Prefer active voice over passive'),
    preferImperativeMood: z
      .boolean()
      .describe('Use imperative mood for instructions'),
    avoidPassiveConstructions: z
      .boolean()
      .describe('Avoid passive voice where possible'),
    maxConsecutiveParagraphs: z
      .number()
      .describe('Maximum consecutive paragraphs before breaking up'),
  }),
});

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;

// ============================================================================
// VALIDATION REPORTING
// ============================================================================

/**
 * Structural validation check results
 */
export const StructuralChecksSchema = z.object({
  sectionsPresent: z.object({
    result: z.enum(['PASS', 'FAIL']),
    missing: z.array(z.string()).describe('Missing section headings'),
  }),
  rulesPresent: z.object({
    result: z.enum(['PASS', 'FAIL']),
    missing: z.array(z.string()).describe('Missing rule identifiers'),
  }),
  tablesPresent: z.object({
    result: z.enum(['PASS', 'FAIL']),
    missing: z.array(z.string()).describe('Missing required tables'),
  }),
});

export type StructuralChecks = z.infer<typeof StructuralChecksSchema>;

/**
 * Evidence for semantic equivalence check
 */
export const SemanticEvidenceSchema = z.object({
  uncompressedLocation: z
    .string()
    .describe('Location in source document (section, line)'),
  compressedLocation: z
    .string()
    .describe('Location in compressed document (section, line)'),
  semanticEquivalence: z
    .enum(['PRESERVED', 'WEAKENED', 'MISSING'])
    .describe('Whether semantic meaning was preserved'),
});

export type SemanticEvidence = z.infer<typeof SemanticEvidenceSchema>;

/**
 * Individual semantic check result
 */
export const SemanticCheckSchema = z.object({
  invariantId: z.string().describe('ID of the invariant being checked'),
  requirement: z.string().describe('The requirement text'),
  result: z.enum(['PASS', 'FAIL']),
  evidence: SemanticEvidenceSchema,
  details: z.string().describe('Explanation of the finding'),
});

export type SemanticCheck = z.infer<typeof SemanticCheckSchema>;

/**
 * Complete validation report
 */
export const ValidationReportSchema = z.object({
  validationTimestamp: z.string().describe('ISO 8601 timestamp'),
  overallResult: z.enum(['PASS', 'FAIL']),
  structuralChecks: StructuralChecksSchema,
  semanticChecks: z.array(SemanticCheckSchema),
  recommendations: z
    .array(z.string())
    .describe('Suggested fixes if validation fails'),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;

// ============================================================================
// COMPRESSION REPORT
// ============================================================================

/**
 * Report documenting what changed during compression
 */
export interface CompressionReport {
  compressionTimestamp: string;
  sourceTokenCount: number;
  compressedTokenCount: number;
  reductionPercentage: number;
  changesApplied: {
    templateReferences: number;
    semanticCondensations: number;
    sectionsOmitted: string[];
  };
  invariantsUsed: string; // Path to semantic-invariants.json
  configUsed: string; // Path to compression-config.json
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Actor type for authority boundaries
 */
export type Actor = 'human' | 'llm';

/**
 * Criticality levels for semantic requirements
 */
export type Criticality = 'CRITICAL' | 'HIGH' | 'MEDIUM';

/**
 * Validation result values
 */
export type ValidationResult = 'PASS' | 'FAIL';

/**
 * Semantic equivalence levels
 */
export type SemanticEquivalence = 'PRESERVED' | 'WEAKENED' | 'MISSING';
