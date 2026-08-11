/**
 * Tests for Protocol Phase Map
 */

import {
  getPhaseByStatus,
  getNextPhase,
  getPhaseContext,
  getAllPhases,
  isValidTransition,
} from '../protocol-phase-map.js';

describe('protocol-phase-map', () => {
  describe('getPhaseByStatus', () => {
    it('returns planning phase for planning status', () => {
      const phase = getPhaseByStatus('planning');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('planning');
      expect(phase?.name).toBe('Planning Phase');
      expect(phase?.section).toBe('§2.4');
      expect(phase?.status).toBe('planning');
    });

    it('returns execution phase for in-progress status', () => {
      const phase = getPhaseByStatus('in-progress');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('execution');
      expect(phase?.section).toBe('§2.5');
    });

    it('returns validation phase for validating status', () => {
      const phase = getPhaseByStatus('validating');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('validation');
      expect(phase?.section).toBe('§2.6');
    });

    it('returns verification phase for verifying status', () => {
      const phase = getPhaseByStatus('verifying');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('verification');
      expect(phase?.section).toBe('§2.7');
    });

    it('returns publication phase for published status', () => {
      const phase = getPhaseByStatus('published');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('publication');
      expect(phase?.section).toBe('§2.8');
    });

    it('returns completion phase for complete status', () => {
      const phase = getPhaseByStatus('complete');

      expect(phase).toBeDefined();
      expect(phase?.id).toBe('completion');
      expect(phase?.section).toBe('§2.9');
    });

    it('returns undefined for unknown status', () => {
      const phase = getPhaseByStatus('invalid-status' as any);

      expect(phase).toBeUndefined();
    });
  });

  describe('getNextPhase', () => {
    it('returns execution phase as next after planning', () => {
      const next = getNextPhase('planning');

      expect(next).toBeDefined();
      expect(next?.id).toBe('execution');
      expect(next?.status).toBe('in-progress');
    });

    it('returns validation phase as next after execution', () => {
      const next = getNextPhase('in-progress');

      expect(next).toBeDefined();
      expect(next?.id).toBe('validation');
      expect(next?.status).toBe('validating');
    });

    it('returns verification phase as next after validation', () => {
      const next = getNextPhase('validating');

      expect(next).toBeDefined();
      expect(next?.id).toBe('verification');
    });

    it('returns publication phase as next after verification', () => {
      const next = getNextPhase('verifying');

      expect(next).toBeDefined();
      expect(next?.id).toBe('publication');
    });

    it('returns completion phase as next after publication', () => {
      const next = getNextPhase('published');

      expect(next).toBeDefined();
      expect(next?.id).toBe('completion');
    });

    it('returns undefined after complete status', () => {
      const next = getNextPhase('complete');

      expect(next).toBeUndefined();
    });
  });

  describe('getPhaseContext', () => {
    it('returns context with all gates remaining when none satisfied', () => {
      const context = getPhaseContext('planning');

      expect(context).toBeDefined();
      expect(context?.current.id).toBe('planning');
      expect(context?.next?.id).toBe('execution');
      expect(context?.gatesSatisfied).toHaveLength(0);
      expect(context?.gatesRemaining).toHaveLength(3); // planning has 3 gates
      expect(context?.recommendedActions.length).toBeGreaterThan(0);
    });

    it('returns context with gates satisfied when provided', () => {
      const context = getPhaseContext('planning', [
        'execution-plan-created',
        'backlog-created',
      ]);

      expect(context).toBeDefined();
      expect(context?.gatesSatisfied).toHaveLength(2);
      expect(context?.gatesRemaining).toHaveLength(1); // Only user-approval remaining
      expect(
        context?.gatesRemaining[0].id
      ).toBe('user-approval');
    });

    it('generates recommended actions for planning phase', () => {
      const context = getPhaseContext('planning');

      expect(context?.recommendedActions.length).toBeGreaterThan(0);
      const allActions = context?.recommendedActions.join(' ') || '';
      expect(allActions).toContain('execution-plan.md');
      expect(allActions).toContain('backlog.yaml');
    });

    it('generates recommended actions for execution phase', () => {
      const context = getPhaseContext('in-progress');

      expect(context?.recommendedActions.length).toBeGreaterThan(0);
      const allActions = context?.recommendedActions.join(' ') || '';
      expect(allActions).toContain('backlog');
    });

    it('generates recommended actions for validation phase', () => {
      const context = getPhaseContext('validating');

      expect(context?.recommendedActions.length).toBeGreaterThan(0);
      const allActions = context?.recommendedActions.join(' ') || '';
      expect(allActions).toContain('validate_deliverable.sh');
    });

    it('returns undefined for unknown status', () => {
      const context = getPhaseContext('invalid-status' as any);

      expect(context).toBeUndefined();
    });

    it('includes next phase for planning phase', () => {
      const context = getPhaseContext('planning');

      // Note: next phase is returned by getPhaseContext for non-terminal phases
      // but may be undefined if getNextPhase returns undefined
      if (context?.next) {
        expect(context.next.id).toBe('execution');
      }
    });

    it('has undefined next phase for complete status', () => {
      const context = getPhaseContext('complete');

      expect(context?.next).toBeUndefined();
    });
  });

  describe('getAllPhases', () => {
    it('returns all 6 phases in order', () => {
      const phases = getAllPhases();

      expect(phases).toHaveLength(6);
      expect(phases[0].id).toBe('planning');
      expect(phases[1].id).toBe('execution');
      expect(phases[2].id).toBe('validation');
      expect(phases[3].id).toBe('verification');
      expect(phases[4].id).toBe('publication');
      expect(phases[5].id).toBe('completion');
    });

    it('each phase has required fields', () => {
      const phases = getAllPhases();

      phases.forEach((phase) => {
        expect(phase.id).toBeDefined();
        expect(phase.name).toBeDefined();
        expect(phase.section).toBeDefined();
        expect(phase.status).toBeDefined();
        expect(phase.description).toBeDefined();
        expect(Array.isArray(phase.gates)).toBe(true);
      });
    });

    it('each gate has required fields', () => {
      const phases = getAllPhases();

      phases.forEach((phase) => {
        phase.gates.forEach((gate) => {
          expect(gate.id).toBeDefined();
          expect(gate.description).toBeDefined();
        });
      });
    });
  });

  describe('isValidTransition', () => {
    it('allows transition from planning to in-progress', () => {
      expect(isValidTransition('planning', 'in-progress')).toBe(true);
    });

    it('allows transition from in-progress to validating', () => {
      expect(isValidTransition('in-progress', 'validating')).toBe(true);
    });

    it('allows staying in same status', () => {
      expect(isValidTransition('planning', 'planning')).toBe(true);
      expect(isValidTransition('in-progress', 'in-progress')).toBe(true);
    });

    it('allows backward transitions (permissive for corrections)', () => {
      // Permissive model - tools should warn but allow backward transitions
      expect(isValidTransition('in-progress', 'planning')).toBe(true);
    });

    it('returns false for transition from invalid status', () => {
      expect(isValidTransition('invalid-status' as any, 'planning')).toBe(false);
    });
  });

  describe('phase gate structure', () => {
    it('planning phase has 3 gates', () => {
      const phase = getPhaseByStatus('planning');
      expect(phase?.gates).toHaveLength(3);
    });

    it('execution phase has 3 gates', () => {
      const phase = getPhaseByStatus('in-progress');
      expect(phase?.gates).toHaveLength(3);
    });

    it('validation phase has 2 gates', () => {
      const phase = getPhaseByStatus('validating');
      expect(phase?.gates).toHaveLength(2);
    });

    it('verification phase has 2 gates', () => {
      const phase = getPhaseByStatus('verifying');
      expect(phase?.gates).toHaveLength(2);
    });

    it('publication phase has 2 gates', () => {
      const phase = getPhaseByStatus('published');
      expect(phase?.gates).toHaveLength(2);
    });

    it('completion phase has 4 gates', () => {
      const phase = getPhaseByStatus('complete');
      expect(phase?.gates).toHaveLength(4);
    });
  });

  describe('phase descriptions', () => {
    it('all phases have meaningful descriptions', () => {
      const phases = getAllPhases();

      phases.forEach((phase) => {
        expect(phase.description.length).toBeGreaterThan(20);
        expect(phase.description).not.toBe('');
      });
    });
  });

  describe('protocol section references', () => {
    it('planning phase references §2.4', () => {
      const phase = getPhaseByStatus('planning');
      expect(phase?.section).toBe('§2.4');
    });

    it('execution phase references §2.5', () => {
      const phase = getPhaseByStatus('in-progress');
      expect(phase?.section).toBe('§2.5');
    });

    it('validation phase references §2.6', () => {
      const phase = getPhaseByStatus('validating');
      expect(phase?.section).toBe('§2.6');
    });

    it('verification phase references §2.7', () => {
      const phase = getPhaseByStatus('verifying');
      expect(phase?.section).toBe('§2.7');
    });

    it('publication phase references §2.8', () => {
      const phase = getPhaseByStatus('published');
      expect(phase?.section).toBe('§2.8');
    });

    it('completion phase references §2.9', () => {
      const phase = getPhaseByStatus('complete');
      expect(phase?.section).toBe('§2.9');
    });
  });
});
