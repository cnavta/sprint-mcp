/**
 * Tests for Markdown Parser Module
 */

import {
  parseMarkdownSections,
  extractBulletPoints,
  detectCategory,
  parseKeyLearningsMarkdown,
  parseRetroMarkdown,
  extractFromSummary,
} from '../markdown-parser.js';

describe('markdown-parser', () => {
  describe('parseMarkdownSections', () => {
    it('should parse sections with headers', () => {
      const markdown = `
# Section 1
Content for section 1

## Subsection 1.1
Content for subsection 1.1

# Section 2
Content for section 2
`;

      const sections = parseMarkdownSections(markdown);

      expect(sections).toHaveLength(3);
      expect(sections[0].header).toBe('Section 1');
      expect(sections[0].level).toBe(1);
      expect(sections[0].content).toContain('Content for section 1');
      expect(sections[1].header).toBe('Subsection 1.1');
      expect(sections[1].level).toBe(2);
      expect(sections[2].header).toBe('Section 2');
    });

    it('should handle markdown without sections', () => {
      const markdown = 'Just plain text without any headers';
      const sections = parseMarkdownSections(markdown);

      expect(sections).toHaveLength(0);
    });

    it('should trim section content', () => {
      const markdown = `
# Section 1

  Content with whitespace

`;

      const sections = parseMarkdownSections(markdown);

      expect(sections[0].content).toBe('Content with whitespace');
    });
  });

  describe('extractBulletPoints', () => {
    it('should extract bullet points with dash', () => {
      const markdown = `
- First item
- Second item
- Third item
`;

      const bullets = extractBulletPoints(markdown);

      expect(bullets).toHaveLength(3);
      expect(bullets[0]).toBe('First item');
      expect(bullets[1]).toBe('Second item');
      expect(bullets[2]).toBe('Third item');
    });

    it('should extract bullet points with asterisk', () => {
      const markdown = `
* First item
* Second item
`;

      const bullets = extractBulletPoints(markdown);

      expect(bullets).toHaveLength(2);
      expect(bullets[0]).toBe('First item');
      expect(bullets[1]).toBe('Second item');
    });

    it('should handle nested bullet points', () => {
      const markdown = `
- First item
  - Nested item
- Second item
`;

      const bullets = extractBulletPoints(markdown);

      expect(bullets).toHaveLength(3);
      expect(bullets).toContain('First item');
      expect(bullets).toContain('Nested item');
      expect(bullets).toContain('Second item');
    });

    it('should return empty array for no bullets', () => {
      const markdown = 'Just plain text';
      const bullets = extractBulletPoints(markdown);

      expect(bullets).toHaveLength(0);
    });
  });

  describe('detectCategory', () => {
    it('should detect technical category', () => {
      expect(detectCategory('TypeScript type safety improvements')).toBe('technical');
      expect(detectCategory('Fixed API bug')).toBe('technical');
      expect(detectCategory('Added new function')).toBe('technical');
    });

    it('should detect process category', () => {
      expect(detectCategory('Improved sprint workflow')).toBe('process');
      expect(detectCategory('Better planning methodology')).toBe('process');
      expect(detectCategory('Retrospective insights')).toBe('process');
    });

    it('should detect testing category', () => {
      expect(detectCategory('Added comprehensive test suite')).toBe('testing');
      expect(detectCategory('Improved test coverage significantly')).toBe('testing');
      expect(detectCategory('Jest assertion testing patterns')).toBe('testing');
    });

    it('should detect tooling category', () => {
      expect(detectCategory('npm tool script improvements')).toBe('tooling');
      expect(detectCategory('Git cli tool optimization')).toBe('tooling');
      expect(detectCategory('CLI tool enhancements')).toBe('tooling');
    });

    it('should detect documentation category', () => {
      expect(detectCategory('Updated README')).toBe('documentation');
      expect(detectCategory('Added JSDoc comments')).toBe('documentation');
      expect(detectCategory('Markdown formatting')).toBe('documentation');
    });

    it('should default to general for unknown', () => {
      expect(detectCategory('Random content here')).toBe('general');
      expect(detectCategory('Some other thing')).toBe('general');
    });
  });

  describe('parseKeyLearningsMarkdown', () => {
    it('should parse simple bullet list', () => {
      const markdown = `
# Key Learnings

- Always validate TypeScript input types
- Use TypeScript strict mode
- Run tests before committing
`;

      const lessons = parseKeyLearningsMarkdown(markdown, 'sprint-13');

      expect(lessons).toHaveLength(3);
      expect(lessons[0].content).toBe('Always validate TypeScript input types');
      expect(lessons[0].sprintId).toBe('sprint-13');
      expect(lessons[0].frequency).toBe(1);
      expect(lessons[0].category).toBe('technical');
    });

    it('should parse categorized sections', () => {
      const markdown = `
# Key Learnings

## Technical

- Always validate input types
- Use TypeScript strict mode

## Process

- Run dry-run before migrations
- Document decisions
`;

      const lessons = parseKeyLearningsMarkdown(markdown, 'sprint-13');

      expect(lessons).toHaveLength(4);

      const technicalLessons = lessons.filter(l => l.category === 'technical');
      expect(technicalLessons).toHaveLength(2);

      const processLessons = lessons.filter(l => l.category === 'process');
      expect(processLessons).toHaveLength(2);
    });

    it('should auto-detect category from content', () => {
      const markdown = `
# Learnings

## Miscellaneous

- Added comprehensive test suite
- Improved npm scripts
`;

      const lessons = parseKeyLearningsMarkdown(markdown, 'sprint-13');

      expect(lessons[0].category).toBe('testing');
      expect(lessons[1].category).toBe('tooling');
    });

    it('should handle markdown without sections', () => {
      const markdown = `
- First learning
- Second learning
`;

      const lessons = parseKeyLearningsMarkdown(markdown, 'sprint-13');

      expect(lessons).toHaveLength(2);
      expect(lessons[0].content).toBe('First learning');
    });
  });

  describe('parseRetroMarkdown', () => {
    it('should extract patterns from "What went well"', () => {
      const markdown = `
# Retrospective

## What Went Well

- Archive system worked perfectly
- All tests passing
- Good documentation

## What to Improve

- Need better error messages
`;

      const { lessons, patterns } = parseRetroMarkdown(markdown, 'sprint-13');

      expect(patterns).toHaveLength(3);
      expect(patterns[0].description).toBe('Archive system worked perfectly');
      expect(patterns[0].sprintId).toBe('sprint-13');

      expect(lessons).toHaveLength(1);
      expect(lessons[0].content).toBe('Need better error messages');
      expect(lessons[0].context).toBe('Area for improvement identified in retrospective');
    });

    it('should extract lessons from "What to improve"', () => {
      const markdown = `
# Sprint Retro

## Challenges

- Error messages could be clearer
- Test setup was complex
`;

      const { lessons } = parseRetroMarkdown(markdown, 'sprint-13');

      expect(lessons).toHaveLength(2);
      expect(lessons[0].content).toBe('Error messages could be clearer');
      expect(lessons[0].context).toBe('Area for improvement identified in retrospective');
    });

    it('should extract lessons from "Action items"', () => {
      const markdown = `
# Retrospective

## Action Items

- Add more integration tests
- Document the archive workflow
`;

      const { lessons } = parseRetroMarkdown(markdown, 'sprint-13');

      expect(lessons).toHaveLength(2);
      expect(lessons[0].content).toBe('Add more integration tests');
      expect(lessons[0].context).toBe('Action item from retrospective');
    });

    it('should handle multiple section types', () => {
      const markdown = `
# Retro

## Successes

- Great test coverage

## Issues

- Some edge cases missed

## Next Steps

- Add more validation
`;

      const { lessons, patterns } = parseRetroMarkdown(markdown, 'sprint-13');

      expect(patterns).toHaveLength(1);
      expect(lessons).toHaveLength(2);
    });
  });

  describe('extractFromSummary', () => {
    it('should extract from achievement sections', () => {
      const markdown = `
# Sprint Complete

## Achievements

- Implemented archive system
- Added 15 new tests
- Created comprehensive documentation
`;

      const lessons = extractFromSummary(markdown, 'sprint-13');

      expect(lessons).toHaveLength(3);
      expect(lessons[0].content).toBe('Delivered: Implemented archive system');
      expect(lessons[0].context).toBe('Sprint deliverable');
      expect(lessons[0].sprintId).toBe('sprint-13');
    });

    it('should extract from success sections', () => {
      const markdown = `
# Summary

## Successes

- All tests passing
- Documentation complete
`;

      const lessons = extractFromSummary(markdown, 'sprint-13');

      expect(lessons).toHaveLength(2);
      expect(lessons[0].content).toContain('Delivered:');
    });

    it('should extract from deliverable sections', () => {
      const markdown = `
# Sprint Summary

## Deliverables

- Archive tool implementation
- Knowledge extraction system
`;

      const lessons = extractFromSummary(markdown, 'sprint-13');

      expect(lessons).toHaveLength(2);
    });

    it('should return empty for non-achievement sections', () => {
      const markdown = `
# Summary

## Background

Just some context here
`;

      const lessons = extractFromSummary(markdown, 'sprint-13');

      expect(lessons).toHaveLength(0);
    });

    it('should detect categories from deliverables', () => {
      const markdown = `
# Complete

## Deliverables

- Added comprehensive test suite
- Improved documentation
`;

      const lessons = extractFromSummary(markdown, 'sprint-13');

      expect(lessons[0].category).toBe('testing');
      expect(lessons[1].category).toBe('documentation');
    });
  });
});
