/**
 * Tests for Knowledge Deduplication Module
 */

import {
  normalizeText,
  calculateSimilarity,
  findDuplicateLesson,
  mergeLessons,
  deduplicateLessons,
  deduplicatePatterns,
  deduplicateAntiPatterns,
  deduplicateKnowledge,
  DEFAULT_DEDUP_CONFIG,
  type DeduplicationConfig,
} from '../deduplicator.js';
import type {
  Lesson,
  Pattern,
  AntiPattern,
  ExtractedKnowledge,
} from '../../../types/knowledge.js';

describe('deduplicator', () => {
  const testConfig: DeduplicationConfig = {
    lessonSimilarityThreshold: 0.8,
    patternSimilarityThreshold: 0.75,
    caseSensitive: false,
    normalizeWhitespace: true,
  };

  describe('normalizeText', () => {
    it('should normalize whitespace', () => {
      const text = '  TypeScript   is    great  ';
      const normalized = normalizeText(text, testConfig);
      expect(normalized).toBe('typescript is great');
    });

    it('should convert to lowercase when case-insensitive', () => {
      const text = 'TypeScript Is GREAT';
      const normalized = normalizeText(text, testConfig);
      expect(normalized).toBe('typescript is great');
    });

    it('should preserve case when case-sensitive', () => {
      const config: DeduplicationConfig = {
        ...testConfig,
        caseSensitive: true,
      };
      const text = 'TypeScript Is GREAT';
      const normalized = normalizeText(text, config);
      expect(normalized).toBe('TypeScript Is GREAT');
    });

    it('should preserve whitespace when disabled', () => {
      const config: DeduplicationConfig = {
        ...testConfig,
        normalizeWhitespace: false,
      };
      const text = '  typescript   is    great  ';
      const normalized = normalizeText(text, config);
      expect(normalized).toBe('  typescript   is    great  ');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical texts', () => {
      const similarity = calculateSimilarity(
        'Always validate input types',
        'Always validate input types',
        testConfig
      );
      expect(similarity).toBe(1.0);
    });

    it('should return high similarity for mostly matching texts', () => {
      const similarity = calculateSimilarity(
        'Always validate input types',
        'Always validate input data',
        testConfig
      );
      // 4 out of 5 unique words match: always, validate, input vs types, data
      expect(similarity).toBeCloseTo(0.6, 1);
    });

    it('should return low similarity for different texts', () => {
      const similarity = calculateSimilarity(
        'Always validate input types',
        'Use TypeScript strict mode',
        testConfig
      );
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 0 for completely different texts', () => {
      const similarity = calculateSimilarity(
        'foo bar baz',
        'qux quux corge',
        testConfig
      );
      expect(similarity).toBe(0);
    });

    it('should be case-insensitive by default', () => {
      const similarity = calculateSimilarity(
        'Always Validate Input Types',
        'always validate input types',
        testConfig
      );
      expect(similarity).toBe(1.0);
    });
  });

  describe('findDuplicateLesson', () => {
    const existingLessons: Lesson[] = [
      {
        content: 'Always validate input types',
        category: 'technical',
        sprintId: 'sprint-1',
        frequency: 1,
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-01-01T00:00:00Z',
      },
      {
        content: 'Run dry-run before migrations',
        category: 'process',
        sprintId: 'sprint-1',
        frequency: 1,
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-01-01T00:00:00Z',
      },
    ];

    it('should find exact duplicate', () => {
      const newLesson: Lesson = {
        content: 'Always validate input types',
        category: 'technical',
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const index = findDuplicateLesson(newLesson, existingLessons, testConfig);
      expect(index).toBe(0);
    });

    it('should find similar duplicate above threshold', () => {
      const newLesson: Lesson = {
        content: 'Always validate input types thoroughly',
        category: 'technical',
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const index = findDuplicateLesson(newLesson, existingLessons, testConfig);
      expect(index).toBe(0); // 4/5 words match = 0.8 similarity
    });

    it('should not find duplicate below similarity threshold', () => {
      const newLesson: Lesson = {
        content: 'Always validate input data',
        category: 'technical',
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const index = findDuplicateLesson(newLesson, existingLessons, testConfig);
      expect(index).toBe(-1); // Similarity is 0.6, below 0.8 threshold
    });

    it('should not find duplicate in different category', () => {
      const newLesson: Lesson = {
        content: 'Always validate input types',
        category: 'process', // Different category
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const index = findDuplicateLesson(newLesson, existingLessons, testConfig);
      expect(index).toBe(-1);
    });

    it('should return -1 for unique lesson', () => {
      const newLesson: Lesson = {
        content: 'Use TypeScript strict mode',
        category: 'technical',
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const index = findDuplicateLesson(newLesson, existingLessons, testConfig);
      expect(index).toBe(-1);
    });
  });

  describe('mergeLessons', () => {
    it('should increment frequency', () => {
      const existing: Lesson = {
        content: 'Always validate input types',
        category: 'technical',
        sprintId: 'sprint-1',
        frequency: 2,
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-01-15T00:00:00Z',
      };

      const newLesson: Lesson = {
        content: 'Always validate input types',
        category: 'technical',
        sprintId: 'sprint-2',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const merged = mergeLessons(existing, newLesson);

      expect(merged.frequency).toBe(3);
      expect(merged.lastSeenAt).toBe(newLesson.lastSeenAt);
      expect(merged.firstSeenAt).toBe(existing.firstSeenAt);
    });

    it('should merge context when different', () => {
      const existing: Lesson = {
        content: 'Validate input',
        category: 'technical',
        sprintId: 'sprint-1',
        context: 'API endpoints',
        frequency: 1,
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-01-01T00:00:00Z',
      };

      const newLesson: Lesson = {
        content: 'Validate input',
        category: 'technical',
        sprintId: 'sprint-2',
        context: 'User forms',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const merged = mergeLessons(existing, newLesson);

      expect(merged.context).toBe('API endpoints; User forms');
    });

    it('should not duplicate context', () => {
      const existing: Lesson = {
        content: 'Validate input',
        category: 'technical',
        sprintId: 'sprint-1',
        context: 'API endpoints',
        frequency: 1,
        firstSeenAt: '2026-01-01T00:00:00Z',
        lastSeenAt: '2026-01-01T00:00:00Z',
      };

      const newLesson: Lesson = {
        content: 'Validate input',
        category: 'technical',
        sprintId: 'sprint-2',
        context: 'API endpoints',
        frequency: 1,
        firstSeenAt: '2026-02-01T00:00:00Z',
        lastSeenAt: '2026-02-01T00:00:00Z',
      };

      const merged = mergeLessons(existing, newLesson);

      expect(merged.context).toBe('API endpoints');
    });
  });

  describe('deduplicateLessons', () => {
    it('should deduplicate identical lessons', () => {
      const lessons: Lesson[] = [
        {
          content: 'Always validate input types',
          category: 'technical',
          sprintId: 'sprint-1',
          frequency: 1,
          firstSeenAt: '2026-01-01T00:00:00Z',
          lastSeenAt: '2026-01-01T00:00:00Z',
        },
        {
          content: 'Always validate input types',
          category: 'technical',
          sprintId: 'sprint-2',
          frequency: 1,
          firstSeenAt: '2026-02-01T00:00:00Z',
          lastSeenAt: '2026-02-01T00:00:00Z',
        },
      ];

      const deduplicated = deduplicateLessons(lessons, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].frequency).toBe(2);
    });

    it('should deduplicate similar lessons above threshold', () => {
      const lessons: Lesson[] = [
        {
          content: 'Always validate input types',
          category: 'technical',
          sprintId: 'sprint-1',
          frequency: 1,
          firstSeenAt: '2026-01-01T00:00:00Z',
          lastSeenAt: '2026-01-01T00:00:00Z',
        },
        {
          content: 'Always validate input types thoroughly',
          category: 'technical',
          sprintId: 'sprint-2',
          frequency: 1,
          firstSeenAt: '2026-02-01T00:00:00Z',
          lastSeenAt: '2026-02-01T00:00:00Z',
        },
      ];

      const deduplicated = deduplicateLessons(lessons, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].frequency).toBe(2);
    });

    it('should preserve unique lessons', () => {
      const lessons: Lesson[] = [
        {
          content: 'Always validate input types',
          category: 'technical',
          sprintId: 'sprint-1',
          frequency: 1,
          firstSeenAt: '2026-01-01T00:00:00Z',
          lastSeenAt: '2026-01-01T00:00:00Z',
        },
        {
          content: 'Use TypeScript strict mode',
          category: 'technical',
          sprintId: 'sprint-2',
          frequency: 1,
          firstSeenAt: '2026-02-01T00:00:00Z',
          lastSeenAt: '2026-02-01T00:00:00Z',
        },
      ];

      const deduplicated = deduplicateLessons(lessons, testConfig);

      expect(deduplicated).toHaveLength(2);
    });

    it('should not merge lessons from different categories', () => {
      const lessons: Lesson[] = [
        {
          content: 'Always validate input types',
          category: 'technical',
          sprintId: 'sprint-1',
          frequency: 1,
          firstSeenAt: '2026-01-01T00:00:00Z',
          lastSeenAt: '2026-01-01T00:00:00Z',
        },
        {
          content: 'Always validate input types',
          category: 'process',
          sprintId: 'sprint-2',
          frequency: 1,
          firstSeenAt: '2026-02-01T00:00:00Z',
          lastSeenAt: '2026-02-01T00:00:00Z',
        },
      ];

      const deduplicated = deduplicateLessons(lessons, testConfig);

      expect(deduplicated).toHaveLength(2);
    });
  });

  describe('deduplicatePatterns', () => {
    it('should deduplicate identical patterns', () => {
      const patterns: Pattern[] = [
        {
          name: 'Dry-Run Validation',
          description: 'Preview destructive operations before execution',
          category: 'process',
          sprintId: 'sprint-1',
          frequency: 1,
        },
        {
          name: 'Dry-Run Validation',
          description: 'Preview destructive operations before execution',
          category: 'process',
          sprintId: 'sprint-2',
          frequency: 1,
        },
      ];

      const deduplicated = deduplicatePatterns(patterns, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].frequency).toBe(2);
    });

    it('should merge benefits from duplicate patterns', () => {
      const patterns: Pattern[] = [
        {
          name: 'Dry-Run Validation',
          description: 'Preview destructive operations',
          category: 'process',
          sprintId: 'sprint-1',
          benefits: ['Prevents data loss'],
          frequency: 1,
        },
        {
          name: 'Dry-Run Validation',
          description: 'Preview destructive operations',
          category: 'process',
          sprintId: 'sprint-2',
          benefits: ['Builds confidence'],
          frequency: 1,
        },
      ];

      const deduplicated = deduplicatePatterns(patterns, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].benefits).toContain('Prevents data loss');
      expect(deduplicated[0].benefits).toContain('Builds confidence');
    });

    it('should preserve unique patterns', () => {
      const patterns: Pattern[] = [
        {
          name: 'Dry-Run Validation',
          description: 'Preview operations',
          category: 'process',
          sprintId: 'sprint-1',
          frequency: 1,
        },
        {
          name: 'Archive System',
          description: 'Organize old sprints',
          category: 'process',
          sprintId: 'sprint-2',
          frequency: 1,
        },
      ];

      const deduplicated = deduplicatePatterns(patterns, testConfig);

      expect(deduplicated).toHaveLength(2);
    });
  });

  describe('deduplicateAntiPatterns', () => {
    it('should deduplicate identical anti-patterns', () => {
      const antiPatterns: AntiPattern[] = [
        {
          name: 'Hardcoded Paths',
          description: 'Using process.cwd() instead of utilities',
          category: 'technical',
          sprintId: 'sprint-1',
          problem: 'Breaks multi-repo support',
          frequency: 1,
        },
        {
          name: 'Hardcoded Paths',
          description: 'Using process.cwd() instead of utilities',
          category: 'technical',
          sprintId: 'sprint-2',
          problem: 'Breaks multi-repo support',
          frequency: 1,
        },
      ];

      const deduplicated = deduplicateAntiPatterns(antiPatterns, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].frequency).toBe(2);
    });

    it('should merge examples from duplicate anti-patterns', () => {
      const antiPatterns: AntiPattern[] = [
        {
          name: 'Hardcoded Paths',
          description: 'Using hardcoded paths',
          category: 'technical',
          sprintId: 'sprint-1',
          problem: 'Breaks flexibility',
          examples: ['join(process.cwd(), "planning")'],
          frequency: 1,
        },
        {
          name: 'Hardcoded Paths',
          description: 'Using hardcoded paths',
          category: 'technical',
          sprintId: 'sprint-2',
          problem: 'Breaks flexibility',
          examples: ['const dir = "/absolute/path"'],
          frequency: 1,
        },
      ];

      const deduplicated = deduplicateAntiPatterns(antiPatterns, testConfig);

      expect(deduplicated).toHaveLength(1);
      expect(deduplicated[0].examples).toContain('join(process.cwd(), "planning")');
      expect(deduplicated[0].examples).toContain('const dir = "/absolute/path"');
    });
  });

  describe('deduplicateKnowledge', () => {
    it('should deduplicate all knowledge types', () => {
      const knowledge: ExtractedKnowledge = {
        sprintId: 'sprint-1',
        lessons: [
          {
            content: 'Validate input types carefully',
            category: 'technical',
            sprintId: 'sprint-1',
            frequency: 1,
            firstSeenAt: '2026-01-01T00:00:00Z',
            lastSeenAt: '2026-01-01T00:00:00Z',
          },
          {
            content: 'Validate input types carefully always',
            category: 'technical',
            sprintId: 'sprint-1',
            frequency: 1,
            firstSeenAt: '2026-01-01T00:00:00Z',
            lastSeenAt: '2026-01-01T00:00:00Z',
          },
        ],
        patterns: [
          {
            name: 'Dry-Run',
            description: 'Preview operations',
            category: 'process',
            sprintId: 'sprint-1',
            frequency: 1,
          },
          {
            name: 'Dry-Run',
            description: 'Preview operations',
            category: 'process',
            sprintId: 'sprint-1',
            frequency: 1,
          },
        ],
        antiPatterns: [],
        metrics: {
          sprintId: 'sprint-1',
        },
        source: ['key-learnings.md'],
        extractedAt: '2026-01-01T00:00:00Z',
      };

      const deduplicated = deduplicateKnowledge(knowledge, testConfig);

      expect(deduplicated.lessons).toHaveLength(1);
      expect(deduplicated.lessons[0].frequency).toBe(2);
      expect(deduplicated.patterns).toHaveLength(1);
      expect(deduplicated.patterns[0].frequency).toBe(2);
    });

    it('should preserve metadata', () => {
      const knowledge: ExtractedKnowledge = {
        sprintId: 'sprint-1',
        lessons: [],
        patterns: [],
        antiPatterns: [],
        metrics: {
          sprintId: 'sprint-1',
          duration: 'PT2H30M',
        },
        source: ['key-learnings.md', 'retro.md'],
        extractedAt: '2026-01-01T00:00:00Z',
      };

      const deduplicated = deduplicateKnowledge(knowledge, testConfig);

      expect(deduplicated.sprintId).toBe('sprint-1');
      expect(deduplicated.source).toEqual(['key-learnings.md', 'retro.md']);
      expect(deduplicated.metrics).toEqual(knowledge.metrics);
    });
  });

  describe('DEFAULT_DEDUP_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_DEDUP_CONFIG.lessonSimilarityThreshold).toBe(0.8);
      expect(DEFAULT_DEDUP_CONFIG.patternSimilarityThreshold).toBe(0.75);
      expect(DEFAULT_DEDUP_CONFIG.caseSensitive).toBe(false);
      expect(DEFAULT_DEDUP_CONFIG.normalizeWhitespace).toBe(true);
    });
  });
});
