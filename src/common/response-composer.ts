/**
 * Response Composer Utility
 *
 * Provides standardized formatting for MCP tool responses with consistent
 * protocol citations, next-step guidance, and phase context.
 *
 * Enables all tools to follow the same response structure for better agent parsing.
 */

import type { SprintStatus } from '../types/sprint.js';
import { getPhaseContext } from './protocol-phase-map.js';

/**
 * Protocol rule or section citation
 */
export interface ProtocolCitation {
  /** Rule ID (e.g., "S1", "S3") or section (e.g., "§2.4", "§2.9") */
  ref: string;
  /** Human-readable description of what this rule/section covers */
  description: string;
  /** Whether this rule/gate is satisfied */
  satisfied?: boolean;
}

/**
 * Recommended next action
 */
export interface NextAction {
  /** Action order/priority */
  order: number;
  /** Action description */
  description: string;
  /** Whether this action is required (vs optional) */
  required: boolean;
  /** Whether this is a protocol gate that blocks progression */
  protocolGate?: boolean;
}

/**
 * Tool response content block
 */
export interface ResponseContent {
  type: 'text';
  text: string;
}

/**
 * Complete tool response structure
 */
export interface ToolResponse {
  content: ResponseContent[];
  isError?: boolean;
}

/**
 * Format a protocol citation for display
 *
 * @param citation - Protocol citation to format
 * @returns Formatted markdown string
 *
 * @example
 * formatProtocolCitation({ ref: 'S3', description: 'Only one sprint may be active at a time', satisfied: false })
 * // Returns: "**Sprint Protocol Rule S3**: Only one sprint may be active at a time"
 */
export function formatProtocolCitation(citation: ProtocolCitation): string {
  const prefix = citation.ref.startsWith('§')
    ? 'Protocol'
    : 'Sprint Protocol Rule';
  const status = citation.satisfied !== undefined
    ? citation.satisfied
      ? ' ✅'
      : ' ❌'
    : '';

  return `**${prefix} ${citation.ref}**: ${citation.description}${status}`;
}

/**
 * Format multiple protocol citations into a section
 *
 * @param citations - Array of protocol citations
 * @param title - Section title (default: "Sprint Protocol Compliance")
 * @returns Formatted markdown section
 */
export function formatProtocolCitationsSection(
  citations: ProtocolCitation[],
  title = 'Sprint Protocol Compliance'
): string {
  if (citations.length === 0) {
    return '';
  }

  const lines = [
    `**${title}**:`,
    ...citations.map((c) => formatProtocolCitation(c)),
  ];

  return lines.join('\n');
}

/**
 * Format a next action for display
 *
 * @param action - Next action to format
 * @returns Formatted markdown string
 */
export function formatNextAction(action: NextAction): string {
  const marker = action.required ? '**' : '';
  const gateIndicator = action.protocolGate ? ' (protocol gate)' : '';

  return `${action.order}. ${marker}${action.description}${marker}${gateIndicator}`;
}

/**
 * Format multiple next actions into a numbered list section
 *
 * @param actions - Array of next actions
 * @param title - Section title (default: "Recommended Next Actions")
 * @returns Formatted markdown section
 */
export function formatNextActionsSection(
  actions: NextAction[],
  title = 'Recommended Next Actions'
): string {
  if (actions.length === 0) {
    return '';
  }

  const sortedActions = [...actions].sort((a, b) => a.order - b.order);
  const lines = [
    `**${title}**:`,
    ...sortedActions.map((a) => formatNextAction(a)),
  ];

  return lines.join('\n');
}

/**
 * Format protocol phase context for display
 *
 * Includes current phase name, section, description, gates, and next phase.
 *
 * @param status - Current sprint status
 * @param satisfiedGateIds - Optional array of gate IDs that are currently satisfied
 * @returns Formatted markdown section or empty string if phase unknown
 */
export function formatPhaseContext(
  status: SprintStatus,
  satisfiedGateIds?: string[]
): string {
  const context = getPhaseContext(status, satisfiedGateIds);
  if (!context) {
    return '';
  }

  const lines: string[] = [
    `**Current Protocol Phase**: ${context.current.name} (${context.current.section})`,
    '',
    context.current.description,
  ];

  // Gates satisfied
  if (context.gatesSatisfied.length > 0) {
    lines.push('', '**Gates Satisfied**:');
    context.gatesSatisfied.forEach((gate) => {
      lines.push(`✅ ${gate.description}`);
    });
  }

  // Gates remaining
  if (context.gatesRemaining.length > 0) {
    lines.push('', '**Next Gates**:');
    context.gatesRemaining.forEach((gate) => {
      const sectionRef = gate.section ? ` (${gate.section})` : '';
      lines.push(`- ${gate.description}${sectionRef}`);
    });
  }

  // Next phase
  if (context.next) {
    lines.push('', `**Next Phase**: ${context.next.name} (${context.next.section})`);
  }

  return lines.join('\n');
}

/**
 * Compose a complete tool response from sections
 *
 * Combines multiple formatted sections into a complete response with
 * consistent structure and spacing.
 *
 * @param sections - Object with named sections to include
 * @param options - Response options (isError flag)
 * @returns Complete tool response
 *
 * @example
 * composeResponse({
 *   title: '✅ Sprint started successfully!',
 *   details: { 'Sprint ID': 'sprint-1', 'Status': 'planning' },
 *   protocolCitations: [{ ref: 'S1', description: 'Sprint started on explicit user request', satisfied: true }],
 *   nextActions: [{ order: 1, description: 'Create execution-plan.md', required: true }]
 * })
 */
export function composeResponse(
  sections: {
    title: string;
    summary?: string;
    details?: Record<string, string>;
    warnings?: string[];
    errors?: string[];
    phaseContext?: string;
    protocolCitations?: ProtocolCitation[];
    nextActions?: NextAction[];
    additionalSections?: string[];
  },
  options?: { isError?: boolean }
): ToolResponse {
  const parts: string[] = [];

  // Title (always present)
  parts.push(sections.title);

  // Summary (if provided)
  if (sections.summary) {
    parts.push('', sections.summary);
  }

  // Details (if provided)
  if (sections.details && Object.keys(sections.details).length > 0) {
    parts.push('', '**Details**:');
    Object.entries(sections.details).forEach(([key, value]) => {
      parts.push(`- ${key}: ${value}`);
    });
  }

  // Errors (if any)
  if (sections.errors && sections.errors.length > 0) {
    parts.push('', '**Errors**:');
    sections.errors.forEach((error) => {
      parts.push(`❌ ${error}`);
    });
  }

  // Warnings (if any)
  if (sections.warnings && sections.warnings.length > 0) {
    parts.push('', '**Warnings**:');
    sections.warnings.forEach((warning) => {
      parts.push(`⚠️  ${warning}`);
    });
  }

  // Phase context (if provided)
  if (sections.phaseContext) {
    parts.push('', sections.phaseContext);
  }

  // Protocol citations (if provided)
  if (sections.protocolCitations && sections.protocolCitations.length > 0) {
    parts.push('', formatProtocolCitationsSection(sections.protocolCitations));
  }

  // Next actions (if provided)
  if (sections.nextActions && sections.nextActions.length > 0) {
    parts.push('', formatNextActionsSection(sections.nextActions));
  }

  // Additional sections (if provided)
  if (sections.additionalSections) {
    sections.additionalSections.forEach((section) => {
      parts.push('', section);
    });
  }

  const text = parts.join('\n');

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
    isError: options?.isError,
  };
}

/**
 * Create a simple success response
 *
 * @param title - Success message title
 * @param details - Optional details object
 * @returns Tool response
 */
export function successResponse(
  title: string,
  details?: Record<string, string>
): ToolResponse {
  return composeResponse({ title, details });
}

/**
 * Create a simple error response
 *
 * @param title - Error message title
 * @param errors - Array of error messages
 * @param suggestions - Optional array of suggested next actions
 * @returns Tool response with isError flag
 */
export function errorResponse(
  title: string,
  errors: string[],
  suggestions?: string[]
): ToolResponse {
  return composeResponse(
    {
      title,
      errors,
      additionalSections: suggestions
        ? ['**Suggestions**:', ...suggestions.map((s) => `- ${s}`)]
        : undefined,
    },
    { isError: true }
  );
}
