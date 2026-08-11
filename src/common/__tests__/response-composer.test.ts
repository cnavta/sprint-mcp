/**
 * Tests for Response Composer Utility
 */

import {
  formatProtocolCitation,
  formatProtocolCitationsSection,
  formatNextAction,
  formatNextActionsSection,
  formatPhaseContext,
  composeResponse,
  successResponse,
  errorResponse,
  type ProtocolCitation,
  type NextAction,
} from '../response-composer.js';

describe('response-composer', () => {
  describe('formatProtocolCitation', () => {
    it('formats S-rule citation without satisfaction status', () => {
      const citation: ProtocolCitation = {
        ref: 'S3',
        description: 'Only one sprint may be active at a time',
      };

      const result = formatProtocolCitation(citation);

      expect(result).toBe(
        '**Sprint Protocol Rule S3**: Only one sprint may be active at a time'
      );
    });

    it('formats §-section citation without satisfaction status', () => {
      const citation: ProtocolCitation = {
        ref: '§2.4',
        description: 'Planning Phase requirements',
      };

      const result = formatProtocolCitation(citation);

      expect(result).toBe('**Protocol §2.4**: Planning Phase requirements');
    });

    it('formats citation with satisfied status (true)', () => {
      const citation: ProtocolCitation = {
        ref: 'S1',
        description: 'Sprint started on explicit user request',
        satisfied: true,
      };

      const result = formatProtocolCitation(citation);

      expect(result).toBe(
        '**Sprint Protocol Rule S1**: Sprint started on explicit user request ✅'
      );
    });

    it('formats citation with satisfied status (false)', () => {
      const citation: ProtocolCitation = {
        ref: '§2.6',
        description: 'Validation script must pass',
        satisfied: false,
      };

      const result = formatProtocolCitation(citation);

      expect(result).toBe('**Protocol §2.6**: Validation script must pass ❌');
    });
  });

  describe('formatProtocolCitationsSection', () => {
    it('returns empty string for empty citations array', () => {
      const result = formatProtocolCitationsSection([]);

      expect(result).toBe('');
    });

    it('formats single citation with default title', () => {
      const citations: ProtocolCitation[] = [
        { ref: 'S1', description: 'Sprint started on explicit user request' },
      ];

      const result = formatProtocolCitationsSection(citations);

      expect(result).toContain('**Sprint Protocol Compliance**:');
      expect(result).toContain('**Sprint Protocol Rule S1**:');
      expect(result).toContain('Sprint started on explicit user request');
    });

    it('formats multiple citations with custom title', () => {
      const citations: ProtocolCitation[] = [
        {
          ref: 'S3',
          description: 'Only one sprint may be active at a time',
          satisfied: true,
        },
        {
          ref: '§2.4',
          description: 'Planning Phase requirements',
          satisfied: false,
        },
      ];

      const result = formatProtocolCitationsSection(
        citations,
        'Gate Validation'
      );

      expect(result).toContain('**Gate Validation**:');
      expect(result).toContain('**Sprint Protocol Rule S3**:');
      expect(result).toContain('✅');
      expect(result).toContain('**Protocol §2.4**:');
      expect(result).toContain('❌');
    });
  });

  describe('formatNextAction', () => {
    it('formats required action without protocol gate', () => {
      const action: NextAction = {
        order: 1,
        description: 'Create execution-plan.md',
        required: true,
      };

      const result = formatNextAction(action);

      expect(result).toBe('1. **Create execution-plan.md**');
    });

    it('formats optional action without protocol gate', () => {
      const action: NextAction = {
        order: 2,
        description: 'Review previous sprint retrospectives',
        required: false,
      };

      const result = formatNextAction(action);

      expect(result).toBe('2. Review previous sprint retrospectives');
    });

    it('formats required action with protocol gate', () => {
      const action: NextAction = {
        order: 1,
        description: 'Obtain user approval before coding',
        required: true,
        protocolGate: true,
      };

      const result = formatNextAction(action);

      expect(result).toBe(
        '1. **Obtain user approval before coding** (protocol gate)'
      );
    });

    it('formats optional action with protocol gate', () => {
      const action: NextAction = {
        order: 3,
        description: 'Create PR if desired',
        required: false,
        protocolGate: true,
      };

      const result = formatNextAction(action);

      expect(result).toBe('3. Create PR if desired (protocol gate)');
    });
  });

  describe('formatNextActionsSection', () => {
    it('returns empty string for empty actions array', () => {
      const result = formatNextActionsSection([]);

      expect(result).toBe('');
    });

    it('formats single action with default title', () => {
      const actions: NextAction[] = [
        {
          order: 1,
          description: 'Create execution-plan.md',
          required: true,
        },
      ];

      const result = formatNextActionsSection(actions);

      expect(result).toContain('**Recommended Next Actions**:');
      expect(result).toContain('1. **Create execution-plan.md**');
    });

    it('formats multiple actions in order with custom title', () => {
      const actions: NextAction[] = [
        { order: 3, description: 'Third task', required: false },
        { order: 1, description: 'First task', required: true },
        { order: 2, description: 'Second task', required: true },
      ];

      const result = formatNextActionsSection(actions, 'Next Steps');

      expect(result).toContain('**Next Steps**:');
      expect(result).toContain('1. **First task**');
      expect(result).toContain('2. **Second task**');
      expect(result).toContain('3. Third task');

      // Verify ordering
      const firstIndex = result.indexOf('1. **First task**');
      const secondIndex = result.indexOf('2. **Second task**');
      const thirdIndex = result.indexOf('3. Third task');
      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('formatPhaseContext', () => {
    it('returns phase context for planning status', () => {
      const result = formatPhaseContext('planning');

      expect(result).toContain('**Current Protocol Phase**: Planning Phase');
      expect(result).toContain('(§2.4)');
      expect(result).toContain('Define scope, create execution plan');
      expect(result).toContain('**Next Gates**:');
      expect(result).toContain('execution-plan.md');
      expect(result).toContain('backlog.yaml');
      expect(result).toContain('User explicitly approved');
    });

    it('returns phase context with satisfied gates', () => {
      const result = formatPhaseContext('planning', [
        'execution-plan-created',
        'backlog-created',
      ]);

      expect(result).toContain('**Gates Satisfied**:');
      expect(result).toContain('✅');
      expect(result).toContain('**Next Gates**:');
      // Only user-approval should be remaining
      expect(result).toContain('User explicitly approved');
    });

    it('returns phase context for complete status without next phase', () => {
      const result = formatPhaseContext('complete');

      expect(result).toContain('**Current Protocol Phase**: Sprint Complete');
      expect(result).toContain('(§2.9)');
      expect(result).not.toContain('**Next Phase**:');
    });

    it('returns empty string for unknown status', () => {
      const result = formatPhaseContext('invalid-status' as any);

      expect(result).toBe('');
    });
  });

  describe('composeResponse', () => {
    it('creates response with title only', () => {
      const response = composeResponse({
        title: '✅ Operation successful',
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toBe('✅ Operation successful');
      expect(response.isError).toBeUndefined();
    });

    it('creates response with title and summary', () => {
      const response = composeResponse({
        title: '✅ Sprint started',
        summary: 'Sprint sprint-18-y4v2xi has been initialized successfully.',
      });

      expect(response.content[0].text).toContain('✅ Sprint started');
      expect(response.content[0].text).toContain(
        'Sprint sprint-18-y4v2xi has been initialized successfully.'
      );
    });

    it('creates response with title and details', () => {
      const response = composeResponse({
        title: '✅ Sprint started',
        details: {
          'Sprint ID': 'sprint-18-y4v2xi',
          Status: 'planning',
          Owner: 'christophernavta',
        },
      });

      const text = response.content[0].text;
      expect(text).toContain('**Details**:');
      expect(text).toContain('- Sprint ID: sprint-18-y4v2xi');
      expect(text).toContain('- Status: planning');
      expect(text).toContain('- Owner: christophernavta');
    });

    it('creates response with errors', () => {
      const response = composeResponse({
        title: '❌ Sprint start failed',
        errors: [
          'Sprint sprint-17-abc123 is already active',
          'Cannot start multiple sprints simultaneously',
        ],
      });

      const text = response.content[0].text;
      expect(text).toContain('**Errors**:');
      expect(text).toContain('❌ Sprint sprint-17-abc123 is already active');
      expect(text).toContain(
        '❌ Cannot start multiple sprints simultaneously'
      );
    });

    it('creates response with warnings', () => {
      const response = composeResponse({
        title: '⚠️  Configuration needs attention',
        warnings: [
          'Archive auto-archival is disabled',
          'Knowledge extraction is disabled',
        ],
      });

      const text = response.content[0].text;
      expect(text).toContain('**Warnings**:');
      expect(text).toContain('⚠️  Archive auto-archival is disabled');
      expect(text).toContain('⚠️  Knowledge extraction is disabled');
    });

    it('creates response with phase context', () => {
      const phaseContext = formatPhaseContext('planning');
      const response = composeResponse({
        title: '✅ Sprint started',
        phaseContext,
      });

      const text = response.content[0].text;
      expect(text).toContain('**Current Protocol Phase**: Planning Phase');
      expect(text).toContain('(§2.4)');
    });

    it('creates response with protocol citations', () => {
      const response = composeResponse({
        title: '✅ Sprint started',
        protocolCitations: [
          {
            ref: 'S1',
            description: 'Sprint started on explicit user request',
            satisfied: true,
          },
          {
            ref: 'S3',
            description: 'Only one sprint may be active at a time',
            satisfied: true,
          },
        ],
      });

      const text = response.content[0].text;
      expect(text).toContain('**Sprint Protocol Compliance**:');
      expect(text).toContain('**Sprint Protocol Rule S1**:');
      expect(text).toContain('**Sprint Protocol Rule S3**:');
      expect(text).toContain('✅');
    });

    it('creates response with next actions', () => {
      const response = composeResponse({
        title: '✅ Sprint started',
        nextActions: [
          {
            order: 1,
            description: 'Create execution-plan.md',
            required: true,
            protocolGate: true,
          },
          {
            order: 2,
            description: 'Create backlog.yaml',
            required: true,
          },
        ],
      });

      const text = response.content[0].text;
      expect(text).toContain('**Recommended Next Actions**:');
      expect(text).toContain('1. **Create execution-plan.md** (protocol gate)');
      expect(text).toContain('2. **Create backlog.yaml**');
    });

    it('creates response with additional sections', () => {
      const response = composeResponse({
        title: '✅ Operation successful',
        additionalSections: [
          '**Custom Section**:\nCustom content here',
          '**Another Section**:\nMore custom content',
        ],
      });

      const text = response.content[0].text;
      expect(text).toContain('**Custom Section**:');
      expect(text).toContain('Custom content here');
      expect(text).toContain('**Another Section**:');
      expect(text).toContain('More custom content');
    });

    it('creates response with all sections combined', () => {
      const response = composeResponse({
        title: '✅ Sprint started successfully',
        summary: 'Your sprint is ready to begin.',
        details: { 'Sprint ID': 'sprint-18-y4v2xi' },
        warnings: ['Remember to update backlog.yaml regularly'],
        phaseContext: formatPhaseContext('planning'),
        protocolCitations: [
          { ref: 'S1', description: 'User requested sprint start', satisfied: true },
        ],
        nextActions: [
          {
            order: 1,
            description: 'Create execution-plan.md',
            required: true,
          },
        ],
        additionalSections: ['**Note**: This is a test sprint'],
      });

      const text = response.content[0].text;
      expect(text).toContain('✅ Sprint started successfully');
      expect(text).toContain('Your sprint is ready to begin.');
      expect(text).toContain('**Details**:');
      expect(text).toContain('**Warnings**:');
      expect(text).toContain('**Current Protocol Phase**:');
      expect(text).toContain('**Sprint Protocol Compliance**:');
      expect(text).toContain('**Recommended Next Actions**:');
      expect(text).toContain('**Note**: This is a test sprint');
    });

    it('sets isError flag when provided', () => {
      const response = composeResponse(
        {
          title: '❌ Operation failed',
        },
        { isError: true }
      );

      expect(response.isError).toBe(true);
    });

    it('omits empty sections', () => {
      const response = composeResponse({
        title: '✅ Simple success',
        details: {},
        warnings: [],
        errors: [],
        protocolCitations: [],
        nextActions: [],
      });

      const text = response.content[0].text;
      expect(text).toBe('✅ Simple success');
      expect(text).not.toContain('**Details**:');
      expect(text).not.toContain('**Warnings**:');
      expect(text).not.toContain('**Errors**:');
      expect(text).not.toContain('**Sprint Protocol Compliance**:');
      expect(text).not.toContain('**Recommended Next Actions**:');
    });
  });

  describe('successResponse', () => {
    it('creates simple success response without details', () => {
      const response = successResponse('✅ Operation successful');

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toBe('✅ Operation successful');
      expect(response.isError).toBeUndefined();
    });

    it('creates success response with details', () => {
      const response = successResponse('✅ Sprint updated', {
        'Sprint ID': 'sprint-18-y4v2xi',
        'New Status': 'in-progress',
      });

      const text = response.content[0].text;
      expect(text).toContain('✅ Sprint updated');
      expect(text).toContain('**Details**:');
      expect(text).toContain('- Sprint ID: sprint-18-y4v2xi');
      expect(text).toContain('- New Status: in-progress');
      expect(response.isError).toBeUndefined();
    });
  });

  describe('errorResponse', () => {
    it('creates error response with single error', () => {
      const response = errorResponse('❌ Operation failed', [
        'Sprint not found',
      ]);

      const text = response.content[0].text;
      expect(text).toContain('❌ Operation failed');
      expect(text).toContain('**Errors**:');
      expect(text).toContain('❌ Sprint not found');
      expect(response.isError).toBe(true);
    });

    it('creates error response with multiple errors', () => {
      const response = errorResponse('❌ Validation failed', [
        'Missing execution-plan.md',
        'Missing backlog.yaml',
        'Missing validate_deliverable.sh',
      ]);

      const text = response.content[0].text;
      expect(text).toContain('**Errors**:');
      expect(text).toContain('❌ Missing execution-plan.md');
      expect(text).toContain('❌ Missing backlog.yaml');
      expect(text).toContain('❌ Missing validate_deliverable.sh');
      expect(response.isError).toBe(true);
    });

    it('creates error response with suggestions', () => {
      const response = errorResponse(
        '❌ Sprint not found',
        ['No active sprint found'],
        [
          'Start a new sprint with start-sprint tool',
          'Check sprint-index.yaml for available sprints',
        ]
      );

      const text = response.content[0].text;
      expect(text).toContain('**Errors**:');
      expect(text).toContain('❌ No active sprint found');
      expect(text).toContain('**Suggestions**:');
      expect(text).toContain('- Start a new sprint with start-sprint tool');
      expect(text).toContain(
        '- Check sprint-index.yaml for available sprints'
      );
      expect(response.isError).toBe(true);
    });
  });

  describe('section ordering', () => {
    it('maintains consistent section order in composed responses', () => {
      const response = composeResponse({
        title: 'Title',
        summary: 'Summary',
        details: { key: 'value' },
        errors: ['Error'],
        warnings: ['Warning'],
        phaseContext: 'Phase context',
        protocolCitations: [{ ref: 'S1', description: 'Rule' }],
        nextActions: [
          { order: 1, description: 'Action', required: true },
        ],
        additionalSections: ['Additional'],
      });

      const text = response.content[0].text;
      const sections = [
        'Title',
        'Summary',
        '**Details**:',
        '**Errors**:',
        '**Warnings**:',
        'Phase context',
        '**Sprint Protocol Compliance**:',
        '**Recommended Next Actions**:',
        'Additional',
      ];

      let lastIndex = -1;
      sections.forEach((section) => {
        const index = text.indexOf(section);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });
});
