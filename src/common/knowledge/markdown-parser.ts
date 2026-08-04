/**
 * Markdown Parser Module
 *
 * Parses various markdown formats for knowledge extraction.
 * Handles key-learnings, retrospectives, summaries, and verification reports.
 */

import { logger } from '../logger.js';
import type { Lesson, Pattern, KnowledgeCategory } from '../../types/knowledge.js';

/**
 * Markdown section
 *
 * Represents a section of markdown content with header and body.
 */
export interface MarkdownSection {
  /** Section header text (without # prefix) */
  header: string;

  /** Header level (1-6) */
  level: number;

  /** Section body content (markdown) */
  content: string;
}

/**
 * Parse markdown into sections by headers
 *
 * Splits markdown content by headers (# Header) and extracts sections.
 *
 * @param markdown - Raw markdown content
 * @returns Array of sections with headers and content
 *
 * @example
 * ```typescript
 * const sections = parseMarkdownSections(`
 * # Section 1
 * Content here
 *
 * ## Subsection
 * More content
 * `);
 * // Returns: [
 * //   { header: 'Section 1', level: 1, content: 'Content here...' },
 * //   { header: 'Subsection', level: 2, content: 'More content' }
 * // ]
 * ```
 */
export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.split('\n');

  let currentSection: MarkdownSection | null = null;

  for (const line of lines) {
    // Check if line is a header
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      const level = headerMatch[1].length;
      const header = headerMatch[2].trim();

      currentSection = {
        header,
        level,
        content: '',
      };
    } else if (currentSection) {
      // Append line to current section content
      currentSection.content += line + '\n';
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Trim content whitespace
  for (const section of sections) {
    section.content = section.content.trim();
  }

  return sections;
}

/**
 * Extract bullet points from markdown content
 *
 * Finds all bullet points (lines starting with - or *) and returns them.
 *
 * @param markdown - Markdown content
 * @returns Array of bullet point text (without bullet prefix)
 *
 * @example
 * ```typescript
 * const bullets = extractBulletPoints(`
 * - First item
 * - Second item
 *   - Nested item
 * * Third item
 * `);
 * // Returns: ['First item', 'Second item', 'Nested item', 'Third item']
 * ```
 */
export function extractBulletPoints(markdown: string): string[] {
  const bullets: string[] = [];
  const lines = markdown.split('\n');

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1].trim());
    }
  }

  return bullets;
}

/**
 * Detect category from content
 *
 * Attempts to classify content into a knowledge category based on keywords.
 *
 * @param content - Text content to analyze
 * @returns Detected category or 'general'
 *
 * @example
 * ```typescript
 * const category = detectCategory('Improved TypeScript type safety');
 * // Returns: 'technical'
 * ```
 */
export function detectCategory(content: string): KnowledgeCategory {
  const contentLower = content.toLowerCase();

  // Technical keywords
  if (
    /\b(typescript|javascript|code|api|function|class|type|interface|bug|error)\b/.test(contentLower)
  ) {
    return 'technical';
  }

  // Process keywords
  if (
    /\b(workflow|sprint|planning|retrospective|agile|scrum|methodology)\b/.test(contentLower)
  ) {
    return 'process';
  }

  // Testing keywords
  if (
    /\b(test|testing|unit test|integration test|coverage|jest|assertion)\b/.test(contentLower)
  ) {
    return 'testing';
  }

  // Tooling keywords
  if (
    /\b(tool|cli|npm|git|github|ci\/cd|build|deploy)\b/.test(contentLower)
  ) {
    return 'tooling';
  }

  // Documentation keywords
  if (
    /\b(documentation|docs|readme|comment|jsdoc|markdown)\b/.test(contentLower)
  ) {
    return 'documentation';
  }

  // Performance keywords
  if (
    /\b(performance|optimization|speed|latency|cache|memory)\b/.test(contentLower)
  ) {
    return 'performance';
  }

  // Security keywords
  if (
    /\b(security|authentication|authorization|encryption|vulnerability)\b/.test(contentLower)
  ) {
    return 'security';
  }

  // Deployment keywords
  if (
    /\b(deployment|infrastructure|cloud|docker|kubernetes|terraform)\b/.test(contentLower)
  ) {
    return 'deployment';
  }

  // Collaboration keywords
  if (
    /\b(collaboration|team|communication|review|pairing|feedback)\b/.test(contentLower)
  ) {
    return 'collaboration';
  }

  // Default to general
  return 'general';
}

/**
 * Parse key-learnings.md format
 *
 * Extracts lessons from key-learnings markdown files.
 * Supports various formats:
 * - Bullet list of learnings
 * - Sections with categorized learnings
 * - Mixed format with headers and bullets
 *
 * @param markdown - Key learnings markdown content
 * @param sprintId - Sprint identifier
 * @returns Array of lessons extracted
 *
 * @example
 * ```typescript
 * const lessons = parseKeyLearningsMarkdown(`
 * # Key Learnings
 *
 * ## Technical
 * - Always validate input types
 * - Use TypeScript strict mode
 *
 * ## Process
 * - Run dry-run before migrations
 * `, 'sprint-13-eaydun');
 * ```
 */
export function parseKeyLearningsMarkdown(
  markdown: string,
  sprintId: string
): Lesson[] {
  const lessons: Lesson[] = [];
  const sections = parseMarkdownSections(markdown);
  const timestamp = new Date().toISOString();

  // If no sections, extract bullets from entire document
  if (sections.length === 0) {
    const bullets = extractBulletPoints(markdown);
    for (const bullet of bullets) {
      lessons.push({
        content: bullet,
        category: detectCategory(bullet),
        sprintId,
        frequency: 1,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
      });
    }
    return lessons;
  }

  // Extract from sections
  for (const section of sections) {
    // Try to map section header to category
    let category: KnowledgeCategory = 'general';
    const headerLower = section.header.toLowerCase();

    if (headerLower.includes('technical')) category = 'technical';
    else if (headerLower.includes('process')) category = 'process';
    else if (headerLower.includes('testing') || headerLower.includes('test')) category = 'testing';
    else if (headerLower.includes('tooling') || headerLower.includes('tool')) category = 'tooling';
    else if (headerLower.includes('documentation') || headerLower.includes('docs')) category = 'documentation';
    else if (headerLower.includes('performance')) category = 'performance';
    else if (headerLower.includes('security')) category = 'security';
    else if (headerLower.includes('deployment') || headerLower.includes('infrastructure')) category = 'deployment';
    else if (headerLower.includes('collaboration') || headerLower.includes('team')) category = 'collaboration';

    // Extract bullets from section
    const bullets = extractBulletPoints(section.content);

    for (const bullet of bullets) {
      // Use section category if available, otherwise auto-detect
      const finalCategory = category !== 'general' ? category : detectCategory(bullet);

      lessons.push({
        content: bullet,
        category: finalCategory,
        sprintId,
        frequency: 1,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp,
      });
    }
  }

  logger.debug(`Parsed ${lessons.length} lessons from key-learnings.md`);

  return lessons;
}

/**
 * Parse retro.md format
 *
 * Extracts insights from retrospective markdown files.
 * Looks for common retro sections:
 * - What went well / Went Well / Successes
 * - What to improve / To Improve / Challenges
 * - Action items / Actions
 *
 * @param markdown - Retrospective markdown content
 * @param sprintId - Sprint identifier
 * @returns Object with lessons and patterns
 *
 * @example
 * ```typescript
 * const { lessons, patterns } = parseRetroMarkdown(`
 * # Retrospective
 *
 * ## What Went Well
 * - Archive system worked perfectly
 * - All tests passing
 *
 * ## What to Improve
 * - Need better error messages
 * `, 'sprint-13-eaydun');
 * ```
 */
export function parseRetroMarkdown(
  markdown: string,
  sprintId: string
): { lessons: Lesson[]; patterns: Pattern[] } {
  const lessons: Lesson[] = [];
  const patterns: Pattern[] = [];
  const sections = parseMarkdownSections(markdown);
  const timestamp = new Date().toISOString();

  for (const section of sections) {
    const headerLower = section.header.toLowerCase();
    const bullets = extractBulletPoints(section.content);

    // "What went well" sections -> patterns
    if (
      headerLower.includes('went well') ||
      headerLower.includes('successes') ||
      headerLower.includes('what worked')
    ) {
      for (const bullet of bullets) {
        patterns.push({
          name: bullet.substring(0, 50), // First 50 chars as name
          description: bullet,
          category: detectCategory(bullet),
          sprintId,
          frequency: 1,
        });
      }
    }
    // "What to improve" sections -> lessons
    else if (
      headerLower.includes('improve') ||
      headerLower.includes('challenges') ||
      headerLower.includes('issues') ||
      headerLower.includes('problems')
    ) {
      for (const bullet of bullets) {
        lessons.push({
          content: bullet,
          category: detectCategory(bullet),
          sprintId,
          context: 'Area for improvement identified in retrospective',
          frequency: 1,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
        });
      }
    }
    // "Action items" -> lessons with context
    else if (
      headerLower.includes('action') ||
      headerLower.includes('next steps')
    ) {
      for (const bullet of bullets) {
        lessons.push({
          content: bullet,
          category: detectCategory(bullet),
          sprintId,
          context: 'Action item from retrospective',
          frequency: 1,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
        });
      }
    }
    // Other sections -> general lessons
    else {
      for (const bullet of bullets) {
        lessons.push({
          content: bullet,
          category: detectCategory(bullet),
          sprintId,
          frequency: 1,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
        });
      }
    }
  }

  logger.debug(`Parsed retro: ${lessons.length} lessons, ${patterns.length} patterns`);

  return { lessons, patterns };
}

/**
 * Extract knowledge from SPRINT_COMPLETE.md or summary files
 *
 * Extracts high-level insights from sprint summary files.
 * Looks for summary sections and key achievements.
 *
 * @param markdown - Summary markdown content
 * @param sprintId - Sprint identifier
 * @returns Array of lessons extracted
 *
 * @example
 * ```typescript
 * const lessons = extractFromSummary(`
 * # Sprint Complete
 *
 * ## Achievements
 * - Implemented archive system
 * - Added 15 new tests
 * `, 'sprint-13-eaydun');
 * ```
 */
export function extractFromSummary(
  markdown: string,
  sprintId: string
): Lesson[] {
  const lessons: Lesson[] = [];
  const sections = parseMarkdownSections(markdown);
  const timestamp = new Date().toISOString();

  for (const section of sections) {
    const headerLower = section.header.toLowerCase();

    // Extract from achievement/success sections
    if (
      headerLower.includes('achievement') ||
      headerLower.includes('success') ||
      headerLower.includes('deliverable') ||
      headerLower.includes('complete')
    ) {
      const bullets = extractBulletPoints(section.content);

      for (const bullet of bullets) {
        lessons.push({
          content: `Delivered: ${bullet}`,
          category: detectCategory(bullet),
          sprintId,
          context: 'Sprint deliverable',
          frequency: 1,
          firstSeenAt: timestamp,
          lastSeenAt: timestamp,
        });
      }
    }
  }

  logger.debug(`Extracted ${lessons.length} lessons from summary`);

  return lessons;
}
