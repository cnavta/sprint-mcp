/**
 * Config Module - Integration Tests
 *
 * Comprehensive test suite for compression configuration management.
 * Target: 90%+ coverage (config.ts is fully testable without LLM dependencies)
 *
 * Backlog Items: BL-007 to BL-013 (Phase 1)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  loadCompressionConfig,
  getDefaultConfig,
  mergeWithDefaults,
  validateConfig,
  DEFAULT_CONFIG,
} from '../config.js';
import type { CompressionConfig } from '../types.js';

describe('Config Module - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-config-test-'));
    process.chdir(testDir);
    await mkdir(join(testDir, 'config'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  // ========================================================================
  // loadCompressionConfig() - Comprehensive Tests
  // ========================================================================

  describe('loadCompressionConfig()', () => {
    it('should load default config when file does not exist', () => {
      const config = loadCompressionConfig('nonexistent.json');

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.targetTokenReduction).toBe(0.5);
      expect(config.preserveStructure).toBe(true);
      expect(config.llmOptimizations.preferActiveVoice).toBe(true);
    });

    it('should load default config when no path provided', () => {
      const config = loadCompressionConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should load and validate config from JSON file with relative path', async () => {
      const customConfig: CompressionConfig = {
        targetTokenReduction: 0.7,
        preserveStructure: false,
        templateReferencePatterns: [
          {
            pattern: 'example pattern',
            replacement: 'example replacement',
          },
        ],
        sectionOmissionRules: {
          allowOmission: ['Examples'],
          reason: ['Too verbose'],
        },
        llmOptimizations: {
          preferActiveVoice: false,
          preferImperativeMood: true,
          avoidPassiveConstructions: false,
          maxConsecutiveParagraphs: 5,
        },
      };

      await writeFile(
        join(testDir, 'config', 'test-config.json'),
        JSON.stringify(customConfig, null, 2)
      );

      const loaded = loadCompressionConfig('config/test-config.json');

      expect(loaded.targetTokenReduction).toBe(0.7);
      expect(loaded.preserveStructure).toBe(false);
      expect(loaded.sectionOmissionRules.allowOmission).toEqual(['Examples']);
      expect(loaded.templateReferencePatterns).toHaveLength(1);
      expect(loaded.templateReferencePatterns[0].pattern).toBe('example pattern');
    });

    it('should load config from absolute path', async () => {
      const customConfig: CompressionConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 0.8,
      };

      const absolutePath = join(testDir, 'absolute-config.json');
      await writeFile(absolutePath, JSON.stringify(customConfig, null, 2));

      const loaded = loadCompressionConfig(absolutePath);

      expect(loaded.targetTokenReduction).toBe(0.8);
    });

    it('should load config with minimal valid fields', async () => {
      const minimalConfig: CompressionConfig = {
        targetTokenReduction: 0.6,
        preserveStructure: true,
        templateReferencePatterns: [],
        sectionOmissionRules: {
          allowOmission: [],
          reason: [],
        },
        llmOptimizations: {
          preferActiveVoice: true,
          preferImperativeMood: true,
          avoidPassiveConstructions: true,
          maxConsecutiveParagraphs: 3,
        },
      };

      await writeFile(
        join(testDir, 'config', 'minimal.json'),
        JSON.stringify(minimalConfig)
      );

      const loaded = loadCompressionConfig('config/minimal.json');

      expect(loaded.targetTokenReduction).toBe(0.6);
      expect(loaded.templateReferencePatterns).toEqual([]);
    });

    it('should load config with maximum token reduction (1.0)', async () => {
      const maxReductionConfig: CompressionConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 1.0, // 100% reduction
      };

      await writeFile(
        join(testDir, 'config', 'max-reduction.json'),
        JSON.stringify(maxReductionConfig)
      );

      const loaded = loadCompressionConfig('config/max-reduction.json');

      expect(loaded.targetTokenReduction).toBe(1.0);
    });

    it('should load config with minimum token reduction (0.0)', async () => {
      const minReductionConfig: CompressionConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 0.0, // 0% reduction
      };

      await writeFile(
        join(testDir, 'config', 'min-reduction.json'),
        JSON.stringify(minReductionConfig)
      );

      const loaded = loadCompressionConfig('config/min-reduction.json');

      expect(loaded.targetTokenReduction).toBe(0.0);
    });

    it('should throw error for invalid JSON syntax', async () => {
      await writeFile(
        join(testDir, 'config', 'invalid.json'),
        '{ invalid json }'
      );

      expect(() => loadCompressionConfig('config/invalid.json')).toThrow(
        /Invalid JSON/
      );
    });

    it('should throw error for config with targetTokenReduction > 1', async () => {
      const invalidConfig = {
        targetTokenReduction: 1.5, // Invalid: > 1
        preserveStructure: true,
        templateReferencePatterns: [],
        sectionOmissionRules: { allowOmission: [], reason: [] },
        llmOptimizations: {
          preferActiveVoice: true,
          preferImperativeMood: true,
          avoidPassiveConstructions: true,
          maxConsecutiveParagraphs: 3,
        },
      };

      await writeFile(
        join(testDir, 'config', 'invalid-reduction.json'),
        JSON.stringify(invalidConfig)
      );

      expect(() =>
        loadCompressionConfig('config/invalid-reduction.json')
      ).toThrow(/validation failed/);
    });

    it('should throw error for config with negative targetTokenReduction', async () => {
      const invalidConfig = {
        targetTokenReduction: -0.5, // Invalid: negative
        preserveStructure: true,
        templateReferencePatterns: [],
        sectionOmissionRules: { allowOmission: [], reason: [] },
        llmOptimizations: {
          preferActiveVoice: true,
          preferImperativeMood: true,
          avoidPassiveConstructions: true,
          maxConsecutiveParagraphs: 3,
        },
      };

      await writeFile(
        join(testDir, 'config', 'negative-reduction.json'),
        JSON.stringify(invalidConfig)
      );

      expect(() =>
        loadCompressionConfig('config/negative-reduction.json')
      ).toThrow(/validation failed/);
    });

    it('should throw error for config missing required fields', async () => {
      const invalidConfig = {
        targetTokenReduction: 0.5,
        // Missing other required fields
      };

      await writeFile(
        join(testDir, 'config', 'missing-fields.json'),
        JSON.stringify(invalidConfig)
      );

      expect(() =>
        loadCompressionConfig('config/missing-fields.json')
      ).toThrow(/validation failed/);
    });

    it('should throw error for config with wrong field types', async () => {
      const invalidConfig = {
        targetTokenReduction: 0.5,
        preserveStructure: 'yes', // Should be boolean
        templateReferencePatterns: [],
        sectionOmissionRules: { allowOmission: [], reason: [] },
        llmOptimizations: {
          preferActiveVoice: true,
          preferImperativeMood: true,
          avoidPassiveConstructions: true,
          maxConsecutiveParagraphs: 3,
        },
      };

      await writeFile(
        join(testDir, 'config', 'wrong-types.json'),
        JSON.stringify(invalidConfig)
      );

      expect(() => loadCompressionConfig('config/wrong-types.json')).toThrow(
        /validation failed/
      );
    });

    it('should load config with multiple template patterns', async () => {
      const configWithPatterns: CompressionConfig = {
        ...DEFAULT_CONFIG,
        templateReferencePatterns: [
          { pattern: 'pattern1', replacement: 'replacement1' },
          { pattern: 'pattern2', replacement: 'replacement2' },
          { pattern: 'pattern3', replacement: 'replacement3' },
        ],
      };

      await writeFile(
        join(testDir, 'config', 'patterns.json'),
        JSON.stringify(configWithPatterns)
      );

      const loaded = loadCompressionConfig('config/patterns.json');

      expect(loaded.templateReferencePatterns).toHaveLength(3);
      expect(loaded.templateReferencePatterns[1].pattern).toBe('pattern2');
    });

    it('should load config with section omission rules', async () => {
      const configWithOmissions: CompressionConfig = {
        ...DEFAULT_CONFIG,
        sectionOmissionRules: {
          allowOmission: ['Examples', 'Historical Context', 'Appendix'],
          reason: ['Verbose', 'Not critical', 'Reference only'],
        },
      };

      await writeFile(
        join(testDir, 'config', 'omissions.json'),
        JSON.stringify(configWithOmissions)
      );

      const loaded = loadCompressionConfig('config/omissions.json');

      expect(loaded.sectionOmissionRules.allowOmission).toHaveLength(3);
      expect(loaded.sectionOmissionRules.reason).toHaveLength(3);
    });

    it('should load config with all LLM optimizations disabled', async () => {
      const allOptimizationsOff: CompressionConfig = {
        ...DEFAULT_CONFIG,
        llmOptimizations: {
          preferActiveVoice: false,
          preferImperativeMood: false,
          avoidPassiveConstructions: false,
          maxConsecutiveParagraphs: 10,
        },
      };

      await writeFile(
        join(testDir, 'config', 'opts-off.json'),
        JSON.stringify(allOptimizationsOff)
      );

      const loaded = loadCompressionConfig('config/opts-off.json');

      expect(loaded.llmOptimizations.preferActiveVoice).toBe(false);
      expect(loaded.llmOptimizations.preferImperativeMood).toBe(false);
      expect(loaded.llmOptimizations.avoidPassiveConstructions).toBe(false);
    });
  });

  // ========================================================================
  // getDefaultConfig() - Tests
  // ========================================================================

  describe('getDefaultConfig()', () => {
    it('should return DEFAULT_CONFIG constant', () => {
      const config = getDefaultConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('should return config with expected default values', () => {
      const config = getDefaultConfig();

      expect(config.targetTokenReduction).toBe(0.5);
      expect(config.preserveStructure).toBe(true);
      expect(config.llmOptimizations.preferActiveVoice).toBe(true);
      expect(config.llmOptimizations.preferImperativeMood).toBe(true);
      expect(config.llmOptimizations.avoidPassiveConstructions).toBe(true);
      expect(config.llmOptimizations.maxConsecutiveParagraphs).toBe(3);
    });

    it('should return same reference as DEFAULT_CONFIG', () => {
      const config = getDefaultConfig();

      // getDefaultConfig returns the same reference
      expect(config).toBe(DEFAULT_CONFIG);
    });
  });

  // ========================================================================
  // mergeWithDefaults() - Deep Merge Logic Tests
  // ========================================================================

  describe('mergeWithDefaults()', () => {
    it('should merge partial config with all defaults', () => {
      const partial: Partial<CompressionConfig> = {
        targetTokenReduction: 0.8,
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.targetTokenReduction).toBe(0.8); // Custom
      expect(merged.preserveStructure).toBe(true); // Default
      expect(merged.llmOptimizations.preferActiveVoice).toBe(true); // Default
    });

    it('should merge partial llmOptimizations without losing defaults', () => {
      const partial: Partial<CompressionConfig> = {
        llmOptimizations: {
          preferActiveVoice: false,
          preferImperativeMood: true, // Keep default
          avoidPassiveConstructions: true, // Keep default
          maxConsecutiveParagraphs: 5, // Custom
        },
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.llmOptimizations.preferActiveVoice).toBe(false); // Custom
      expect(merged.llmOptimizations.preferImperativeMood).toBe(true); // Default
      expect(merged.llmOptimizations.maxConsecutiveParagraphs).toBe(5); // Custom
      expect(merged.preserveStructure).toBe(true); // Default (check different field)
    });

    it('should merge partial sectionOmissionRules', () => {
      const partial: Partial<CompressionConfig> = {
        sectionOmissionRules: {
          allowOmission: ['Examples'],
          reason: ['Verbose'],
        },
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.sectionOmissionRules.allowOmission).toEqual(['Examples']);
      expect(merged.sectionOmissionRules.reason).toEqual(['Verbose']);
    });

    it('should replace templateReferencePatterns completely (not merge)', () => {
      const partial: Partial<CompressionConfig> = {
        templateReferencePatterns: [
          { pattern: 'new pattern', replacement: 'new replacement' },
        ],
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.templateReferencePatterns).toHaveLength(1);
      expect(merged.templateReferencePatterns[0].pattern).toBe('new pattern');
    });

    it('should handle empty partial config (return all defaults)', () => {
      const partial: Partial<CompressionConfig> = {};

      const merged = mergeWithDefaults(partial);

      expect(merged).toEqual(DEFAULT_CONFIG);
    });

    it('should handle partial config with only preserveStructure changed', () => {
      const partial: Partial<CompressionConfig> = {
        preserveStructure: false,
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.preserveStructure).toBe(false);
      expect(merged.llmOptimizations.preferActiveVoice).toBe(true); // Default
    });

    it('should handle undefined llmOptimizations (use all defaults)', () => {
      const partial: Partial<CompressionConfig> = {
        targetTokenReduction: 0.7,
        llmOptimizations: undefined,
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.llmOptimizations).toEqual(DEFAULT_CONFIG.llmOptimizations);
    });

    it('should handle partial llmOptimizations with only one field', () => {
      const partial: Partial<CompressionConfig> = {
        llmOptimizations: {
          maxConsecutiveParagraphs: 10,
        } as any,
      };

      const merged = mergeWithDefaults(partial);

      expect(merged.llmOptimizations.maxConsecutiveParagraphs).toBe(10);
      expect(merged.llmOptimizations.preferActiveVoice).toBe(true); // Default
    });
  });

  // ========================================================================
  // validateConfig() - Validation Tests
  // ========================================================================

  describe('validateConfig()', () => {
    it('should validate complete valid config', () => {
      const validConfig: CompressionConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 0.6,
      };

      expect(validateConfig(validConfig)).toBe(true);
    });

    it('should throw error for config with targetTokenReduction > 1', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 1.1,
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should throw error for config with negative targetTokenReduction', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: -0.1,
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should throw error for config with missing required fields', () => {
      const invalidConfig = {
        targetTokenReduction: 0.5,
        // Missing other fields
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should throw error for config with wrong type for preserveStructure', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        preserveStructure: 'yes',
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should throw error for config with wrong type for llmOptimizations', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        llmOptimizations: 'invalid',
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should throw error for config with invalid templateReferencePatterns', () => {
      const invalidConfig = {
        ...DEFAULT_CONFIG,
        templateReferencePatterns: [
          { pattern: 'test' }, // Missing 'replacement'
        ],
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });

    it('should validate config with edge case values', () => {
      const edgeCaseConfig: CompressionConfig = {
        targetTokenReduction: 0.0, // Min value
        preserveStructure: false,
        templateReferencePatterns: [],
        sectionOmissionRules: {
          allowOmission: [],
          reason: [],
        },
        llmOptimizations: {
          preferActiveVoice: false,
          preferImperativeMood: false,
          avoidPassiveConstructions: false,
          maxConsecutiveParagraphs: 1,
        },
      };

      expect(validateConfig(edgeCaseConfig)).toBe(true);
    });

    it('should throw error for null config', () => {
      expect(() => validateConfig(null)).toThrow(/validation failed/);
    });

    it('should throw error for undefined config', () => {
      expect(() => validateConfig(undefined)).toThrow(/validation failed/);
    });

    it('should throw error for config as array', () => {
      expect(() => validateConfig([])).toThrow(/validation failed/);
    });

    it('should throw error for config as string', () => {
      expect(() => validateConfig('invalid')).toThrow(/validation failed/);
    });
  });

  // ========================================================================
  // DEFAULT_CONFIG - Constant Tests
  // ========================================================================

  describe('DEFAULT_CONFIG constant', () => {
    it('should have expected structure', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('targetTokenReduction');
      expect(DEFAULT_CONFIG).toHaveProperty('preserveStructure');
      expect(DEFAULT_CONFIG).toHaveProperty('templateReferencePatterns');
      expect(DEFAULT_CONFIG).toHaveProperty('sectionOmissionRules');
      expect(DEFAULT_CONFIG).toHaveProperty('llmOptimizations');
    });

    it('should have valid targetTokenReduction', () => {
      expect(DEFAULT_CONFIG.targetTokenReduction).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.targetTokenReduction).toBeLessThanOrEqual(1);
    });

    it('should have boolean preserveStructure', () => {
      expect(typeof DEFAULT_CONFIG.preserveStructure).toBe('boolean');
    });

    it('should have array for templateReferencePatterns', () => {
      expect(Array.isArray(DEFAULT_CONFIG.templateReferencePatterns)).toBe(true);
    });

    it('should have valid llmOptimizations structure', () => {
      expect(typeof DEFAULT_CONFIG.llmOptimizations.preferActiveVoice).toBe('boolean');
      expect(typeof DEFAULT_CONFIG.llmOptimizations.preferImperativeMood).toBe('boolean');
      expect(typeof DEFAULT_CONFIG.llmOptimizations.avoidPassiveConstructions).toBe('boolean');
      expect(typeof DEFAULT_CONFIG.llmOptimizations.maxConsecutiveParagraphs).toBe('number');
    });
  });
});
