/**
 * Test Helpers and Utilities
 *
 * Shared utilities for testing MCP tools
 */

import type { SprintManifest } from '../../types/sprint.js';

/**
 * Create a mock sprint manifest for testing
 */
export function createMockManifest(overrides: Partial<SprintManifest> = {}): SprintManifest {
  const defaults: SprintManifest = {
    id: 'sprint-1-abc123',
    title: 'Test Sprint',
    goal: 'Test sprint goal',
    owner: 'test-owner',
    createdAt: '2026-01-01T00:00:00Z',
    status: 'in-progress',
    links: {
      branch: 'feature/sprint-1-abc123-test-sprint',
    },
    notes: 'Test sprint notes',
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a mock completed sprint manifest
 */
export function createCompletedManifest(sprintNumber: number = 1): SprintManifest {
  return createMockManifest({
    id: `sprint-${sprintNumber}-test${sprintNumber}`,
    status: 'complete',
  });
}

/**
 * Create a mock active sprint manifest (not complete)
 */
export function createActiveManifest(sprintNumber: number = 2): SprintManifest {
  return createMockManifest({
    id: `sprint-${sprintNumber}-test${sprintNumber}`,
    status: 'in-progress',
  });
}

/**
 * Create a mock planning sprint manifest
 */
export function createPlanningManifest(sprintNumber: number = 3): SprintManifest {
  return createMockManifest({
    id: `sprint-${sprintNumber}-test${sprintNumber}`,
    status: 'planning',
  });
}

/**
 * Mock file system structure for testing
 */
export interface MockFileSystem {
  [path: string]: string | MockFileSystem;
}

/**
 * Helper to verify MCP tool response format
 */
export function isValidMCPResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const resp = response as Record<string, unknown>;

  if (!Array.isArray(resp.content)) {
    return false;
  }

  return resp.content.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'type' in item &&
      item.type === 'text' &&
      'text' in item &&
      typeof item.text === 'string'
  );
}

/**
 * Extract text from MCP response
 */
export function extractResponseText(response: { content: Array<{ type: string; text: string }> }): string {
  return response.content
    .filter((item) => item.type === 'text')
    .map((item) => item.text)
    .join('\n');
}

/**
 * Check if MCP response indicates an error
 */
export function isErrorResponse(response: { isError?: boolean }): boolean {
  return response.isError === true;
}
