/**
 * Protocol Phase Mapping
 *
 * Maps sprint statuses to protocol phases, gates, and next actions.
 * Provides context for agents navigating the Sprint Protocol lifecycle.
 *
 * Based on Sprint Protocol (AGENTS-uncompressed.md) sections §2.2 through §2.9.
 */

import type { SprintStatus } from '../types/sprint.js';

/**
 * Protocol gate that must be satisfied to proceed
 */
export interface ProtocolGate {
  /** Unique gate identifier */
  id: string;
  /** Human-readable gate description */
  description: string;
  /** Whether this gate is currently satisfied */
  satisfied?: boolean;
  /** Protocol section reference (e.g., "§2.4") */
  section?: string;
}

/**
 * Protocol phase definition
 */
export interface ProtocolPhase {
  /** Phase identifier */
  id: string;
  /** Human-readable phase name */
  name: string;
  /** Protocol section reference (e.g., "§2.4") */
  section: string;
  /** Sprint status that corresponds to this phase */
  status: SprintStatus;
  /** Phase description - what this phase means */
  description: string;
  /** Gates that must be satisfied in this phase */
  gates: ProtocolGate[];
  /** Next phase in the lifecycle */
  nextPhase?: string;
  /** Next sprint status after this phase */
  nextStatus?: SprintStatus;
}

/**
 * Context about current protocol phase and progress
 */
export interface PhaseContext {
  /** Current phase */
  current: ProtocolPhase;
  /** Next phase (if any) */
  next?: ProtocolPhase;
  /** Gates satisfied in current phase */
  gatesSatisfied: ProtocolGate[];
  /** Gates remaining in current phase */
  gatesRemaining: ProtocolGate[];
  /** Recommended next actions based on phase */
  recommendedActions: string[];
}

/**
 * Phase mapping from sprint status to protocol phase
 */
const PHASE_MAP: Record<string, ProtocolPhase> = {
  planning: {
    id: 'planning',
    name: 'Planning Phase',
    section: '§2.4',
    status: 'planning',
    description: 'Define scope, create execution plan, and establish acceptance criteria before any coding begins',
    gates: [
      {
        id: 'execution-plan-created',
        description: 'execution-plan.md created with scope, deliverables, and acceptance criteria',
        section: '§2.4',
      },
      {
        id: 'backlog-created',
        description: 'backlog.yaml created with atomic items and acceptance criteria',
        section: '§2.3.1',
      },
      {
        id: 'user-approval',
        description: 'User explicitly approved execution plan',
        section: '§2.4',
      },
    ],
    nextPhase: 'in-progress',
    nextStatus: 'in-progress',
  },
  'in-progress': {
    id: 'execution',
    name: 'Execution Phase',
    section: '§2.5',
    status: 'in-progress',
    description: 'Implement approved scope with intentional commits and backlog tracking',
    gates: [
      {
        id: 'backlog-items-implemented',
        description: 'All planned backlog items done or explicitly deferred',
        section: '§2.3.1',
      },
      {
        id: 'intentional-commits',
        description: 'Coherent work units committed with intent-focused messages',
        section: '§2.5.1',
      },
      {
        id: 'tests-passing',
        description: 'Test suite passes for implemented changes',
        section: '§3',
      },
    ],
    nextPhase: 'validating',
    nextStatus: 'validating',
  },
  validating: {
    id: 'validation',
    name: 'Validation Phase',
    section: '§2.6',
    status: 'validating',
    description: 'Execute validation script to verify build, tests, and deployment readiness',
    gates: [
      {
        id: 'validation-script-created',
        description: 'validate_deliverable.sh created and executable',
        section: '§2.6',
      },
      {
        id: 'validation-passes',
        description: 'Validation script passes (build + tests + deployment dry-run)',
        section: '§2.6',
      },
    ],
    nextPhase: 'verifying',
    nextStatus: 'verifying',
  },
  verifying: {
    id: 'verification',
    name: 'Verification Phase',
    section: '§2.7',
    status: 'verifying',
    description: 'Reconcile backlog items and document completed/partial/deferred work',
    gates: [
      {
        id: 'verification-report-created',
        description: 'verification-report.md reconciles all backlog items',
        section: '§2.7',
      },
      {
        id: 'backlog-reconciled',
        description: 'All done items have evidence, all blocked items have blockers',
        section: '§2.3.1',
      },
    ],
    nextPhase: 'published',
    nextStatus: 'published',
  },
  published: {
    id: 'publication',
    name: 'Publication Phase',
    section: '§2.8',
    status: 'published',
    description: 'Push feature branch and optionally create PR per completion handoff policy',
    gates: [
      {
        id: 'branch-pushed',
        description: 'Feature branch pushed to remote',
        section: '§2.8',
      },
      {
        id: 'pr-handled',
        description: 'PR created or explicitly waived per human-defined policy',
        section: 'S14',
      },
    ],
    nextPhase: 'complete',
    nextStatus: 'complete',
  },
  complete: {
    id: 'completion',
    name: 'Sprint Complete',
    section: '§2.9',
    status: 'complete',
    description: 'Sprint deliverables complete, learning artifacts created, ready for archive/cleanup',
    gates: [
      {
        id: 'retro-created',
        description: 'retro.md created with observations and partnership review',
        section: '§2.9.1',
      },
      {
        id: 'learnings-created',
        description: 'key-learnings.md created with reusable lessons',
        section: '§2.9.1',
      },
      {
        id: 'publication-recorded',
        description: 'publication.yaml records branch push and PR status',
        section: '§2.8',
      },
      {
        id: 'user-declaration',
        description: 'User said "Sprint complete" or "Force complete sprint"',
        section: 'S2',
      },
    ],
    nextPhase: undefined,
    nextStatus: undefined,
  },
};

/**
 * Get protocol phase definition for a given sprint status
 *
 * @param status - Sprint status (planning, in-progress, validating, etc.)
 * @returns Protocol phase definition or undefined if status unknown
 */
export function getPhaseByStatus(status: SprintStatus): ProtocolPhase | undefined {
  return PHASE_MAP[status];
}

/**
 * Get next phase in the sprint lifecycle
 *
 * @param currentStatus - Current sprint status
 * @returns Next protocol phase or undefined if at end of lifecycle
 */
export function getNextPhase(currentStatus: SprintStatus): ProtocolPhase | undefined {
  const currentPhase = getPhaseByStatus(currentStatus);
  if (!currentPhase || !currentPhase.nextPhase) {
    return undefined;
  }
  return PHASE_MAP[currentPhase.nextPhase];
}

/**
 * Get full phase context including satisfied/remaining gates
 *
 * This function provides full context about where the sprint is in the protocol
 * lifecycle. Callers can optionally provide information about which gates are
 * currently satisfied.
 *
 * @param status - Current sprint status
 * @param satisfiedGateIds - Optional array of gate IDs that are currently satisfied
 * @returns Phase context with current/next phases and gate status
 */
export function getPhaseContext(
  status: SprintStatus,
  satisfiedGateIds?: string[]
): PhaseContext | undefined {
  const currentPhase = getPhaseByStatus(status);
  if (!currentPhase) {
    return undefined;
  }

  const nextPhase = getNextPhase(status);
  const satisfied = satisfiedGateIds || [];

  const gatesSatisfied = currentPhase.gates.filter((gate) =>
    satisfied.includes(gate.id)
  );
  const gatesRemaining = currentPhase.gates.filter(
    (gate) => !satisfied.includes(gate.id)
  );

  const recommendedActions = generateRecommendedActions(
    currentPhase,
    gatesRemaining
  );

  return {
    current: currentPhase,
    next: nextPhase,
    gatesSatisfied,
    gatesRemaining,
    recommendedActions,
  };
}

/**
 * Generate recommended next actions based on phase and remaining gates
 *
 * @param phase - Current protocol phase
 * @param gatesRemaining - Gates not yet satisfied in current phase
 * @returns Array of recommended action strings
 */
function generateRecommendedActions(
  phase: ProtocolPhase,
  gatesRemaining: ProtocolGate[]
): string[] {
  const actions: string[] = [];

  // Phase-specific guidance
  switch (phase.id) {
    case 'planning':
      if (gatesRemaining.some((g) => g.id === 'execution-plan-created')) {
        actions.push(
          'Create execution-plan.md with scope, deliverables, acceptance criteria'
        );
      }
      if (gatesRemaining.some((g) => g.id === 'backlog-created')) {
        actions.push(
          'Create backlog.yaml with atomic items and acceptance criteria'
        );
      }
      if (gatesRemaining.some((g) => g.id === 'user-approval')) {
        actions.push('Request user approval of execution plan before coding');
      }
      break;

    case 'execution':
      actions.push('Implement approved backlog items');
      actions.push('Update backlog.yaml as items progress (§2.3.1)');
      actions.push('Commit after each coherent work unit (§2.5.1)');
      if (gatesRemaining.some((g) => g.id === 'tests-passing')) {
        actions.push('Ensure test suite passes');
      }
      break;

    case 'validation':
      if (gatesRemaining.some((g) => g.id === 'validation-script-created')) {
        actions.push(
          'Create validate_deliverable.sh with build, test, deployment steps'
        );
      }
      if (gatesRemaining.some((g) => g.id === 'validation-passes')) {
        actions.push('Execute validation script and fix any failures');
      }
      break;

    case 'verification':
      if (
        gatesRemaining.some((g) => g.id === 'verification-report-created')
      ) {
        actions.push(
          'Create verification-report.md with completed/partial/deferred items'
        );
      }
      if (gatesRemaining.some((g) => g.id === 'backlog-reconciled')) {
        actions.push(
          'Ensure all done items have evidence, all blocked items have reasons'
        );
      }
      break;

    case 'publication':
      if (gatesRemaining.some((g) => g.id === 'branch-pushed')) {
        actions.push('Push feature branch to remote');
      }
      if (gatesRemaining.some((g) => g.id === 'pr-handled')) {
        actions.push(
          'Create PR if desired (human-owned per S14) or explicitly waive'
        );
      }
      break;

    case 'completion':
      if (gatesRemaining.some((g) => g.id === 'retro-created')) {
        actions.push('Create retro.md with observations and partnership review');
      }
      if (gatesRemaining.some((g) => g.id === 'learnings-created')) {
        actions.push('Create key-learnings.md with reusable lessons');
      }
      if (gatesRemaining.some((g) => g.id === 'publication-recorded')) {
        actions.push('Create publication.yaml with branch push and PR status');
      }
      break;
  }

  return actions;
}

/**
 * Get all protocol phases in lifecycle order
 *
 * @returns Array of all protocol phases in order
 */
export function getAllPhases(): ProtocolPhase[] {
  return [
    PHASE_MAP.planning,
    PHASE_MAP['in-progress'],
    PHASE_MAP.validating,
    PHASE_MAP.verifying,
    PHASE_MAP.published,
    PHASE_MAP.complete,
  ];
}

/**
 * Validate that a status transition is valid per protocol
 *
 * @param fromStatus - Current sprint status
 * @param toStatus - Desired new status
 * @returns True if transition is valid, false otherwise
 */
export function isValidTransition(
  fromStatus: SprintStatus,
  toStatus: SprintStatus
): boolean {
  // Allow staying in same status
  if (fromStatus === toStatus) {
    return true;
  }

  const fromPhase = getPhaseByStatus(fromStatus);
  if (!fromPhase) {
    return false;
  }

  // Check if toStatus is the designated next status
  if (fromPhase.nextStatus === toStatus) {
    return true;
  }

  // Allow backward transitions for corrections (but log warnings in tools)
  // Allow forward skips only for forced completion scenarios
  // This is permissive to allow flexibility but tools should warn

  return true; // Permissive - let tools decide whether to warn/block
}
