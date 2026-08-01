/**
 * Validation Spike - Compression Modules Testing
 *
 * This spike tests the feasibility of integration testing for compression modules.
 *
 * KEY FINDING: Compression modules heavily depend on LLM API calls (generateText,
 * generateObject from `ai` SDK), which are expensive, slow, and require API keys.
 *
 * TESTING STRATEGY:
 * 1. Integration tests for modules WITHOUT LLM dependencies (config.ts)
 * 2. Unit tests for helper functions (formatting, validation logic)
 * 3. LLM-calling functions require mocking OR skipping (not practical for CI)
 *
 * This spike validates:
 * - Integration test pattern works for config module
 * - Helper functions can be tested without mocking
 * - Documented approach for LLM-dependent functions
 *
 * Backlog Items: BL-003, BL-004, BL-005
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
import {
  validateExtractedInvariants,
} from '../semantic-extractor.js';
import {
  generateCompressionReport,
} from '../compression-engine.js';
import type { SemanticInvariants, CompressionConfig } from '../types.js';

describe('Compression Modules - Validation Spike', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'sprint-mcp-compression-test-'));
    process.chdir(testDir);
    await mkdir(join(testDir, 'config'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  // ========================================================================
  // POC Test 1: Config Module - Integration Test (No LLM Dependencies)
  // ========================================================================
  // This validates that integration test pattern works for modules
  // without LLM dependencies.

  describe('POC-1: Config Module Integration Tests', () => {
    it('should load default config when file does not exist', () => {
      const config = loadCompressionConfig('nonexistent.json');

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.targetTokenReduction).toBe(0.5);
      expect(config.preserveStructure).toBe(true);
      expect(config.llmOptimizations.preferActiveVoice).toBe(true);
    });

    it('should load and validate config from JSON file', async () => {
      const customConfig: CompressionConfig = {
        targetTokenReduction: 0.7,
        preserveStructure: false,
        templateReferencePatterns: [],
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
    });

    it('should throw error for invalid JSON', async () => {
      await writeFile(
        join(testDir, 'config', 'invalid.json'),
        '{ invalid json }'
      );

      expect(() => loadCompressionConfig('config/invalid.json')).toThrow(
        /Invalid JSON/
      );
    });

    it('should throw error for config missing required fields', async () => {
      const invalidConfig = {
        targetTokenReduction: 1.5, // Invalid: > 1
      };

      await writeFile(
        join(testDir, 'config', 'invalid-schema.json'),
        JSON.stringify(invalidConfig)
      );

      expect(() => loadCompressionConfig('config/invalid-schema.json')).toThrow(
        /validation failed/
      );
    });
  });

  // ========================================================================
  // POC Test 2: Helper Functions - Unit Tests (No LLM Dependencies)
  // ========================================================================
  // This validates that helper functions can be tested without mocking.

  describe('POC-2: Helper Functions Unit Tests', () => {
    it('should return default config via getDefaultConfig()', () => {
      const config = getDefaultConfig();

      expect(config).toEqual(DEFAULT_CONFIG);
      expect(config.targetTokenReduction).toBe(0.5);
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<CompressionConfig> = {
        targetTokenReduction: 0.8,
        llmOptimizations: {
          preferActiveVoice: false,
          preferImperativeMood: true,
          avoidPassiveConstructions: true,
          maxConsecutiveParagraphs: 10,
        },
      };

      const merged = mergeWithDefaults(customConfig);

      expect(merged.targetTokenReduction).toBe(0.8);
      expect(merged.preserveStructure).toBe(true); // from defaults
      expect(merged.llmOptimizations.preferActiveVoice).toBe(false); // custom
      expect(merged.llmOptimizations.maxConsecutiveParagraphs).toBe(10); // custom
    });

    it('should validate valid config object', () => {
      const validConfig: CompressionConfig = {
        ...DEFAULT_CONFIG,
        targetTokenReduction: 0.6,
      };

      expect(validateConfig(validConfig)).toBe(true);
    });

    it('should throw error for invalid config object', () => {
      const invalidConfig = {
        targetTokenReduction: -0.5, // Invalid: negative
        preserveStructure: 'yes', // Invalid: should be boolean
      };

      expect(() => validateConfig(invalidConfig)).toThrow(/validation failed/);
    });
  });

  // ========================================================================
  // POC Test 3: Semantic Extractor Validation (No LLM Dependencies)
  // ========================================================================
  // This validates that validation logic can be tested without LLM calls.

  describe('POC-3: Semantic Extractor Validation Logic', () => {
    it('should validate complete semantic invariants', () => {
      const validInvariants: SemanticInvariants = {
        structuralInvariants: {
          sections: ['Section 1', 'Section 2'],
          rules: ['S1', 'S2', 'S3'],
          mandatoryKeywords: ['MUST', 'MUST NOT'],
        },
        semanticRequirements: [
          {
            id: 'INV-001',
            requirement: 'Test requirement',
            evidence: ['Section 1'],
            criticality: 'CRITICAL',
          },
        ],
        processFlows: [
          {
            id: 'FLOW-001',
            name: 'Test Flow',
            steps: ['Step 1', 'Step 2'],
            gateChecks: ['Gate 1'],
          },
        ],
        authorityBoundaries: [
          {
            actor: 'human',
            allowedActions: ['approve'],
            prohibitedActions: [],
          },
          {
            actor: 'llm',
            allowedActions: ['execute'],
            prohibitedActions: ['approve'],
          },
        ],
      };

      expect(() => validateExtractedInvariants(validInvariants)).not.toThrow();
      expect(validateExtractedInvariants(validInvariants)).toBe(true);
    });

    it('should reject invariants with missing sections', () => {
      const invalidInvariants: SemanticInvariants = {
        structuralInvariants: {
          sections: [], // Empty!
          rules: ['S1'],
          mandatoryKeywords: ['MUST'],
        },
        semanticRequirements: [
          {
            id: 'INV-001',
            requirement: 'Test',
            evidence: ['Test'],
            criticality: 'CRITICAL',
          },
        ],
        processFlows: [
          {
            id: 'FLOW-001',
            name: 'Test',
            steps: ['Step 1'],
            gateChecks: [],
          },
        ],
        authorityBoundaries: [
          {
            actor: 'human',
            allowedActions: ['approve'],
            prohibitedActions: [],
          },
          {
            actor: 'llm',
            allowedActions: ['execute'],
            prohibitedActions: [],
          },
        ],
      };

      expect(() => validateExtractedInvariants(invalidInvariants)).toThrow(
        /No sections extracted/
      );
    });

    it('should reject invariants with missing authority boundaries', () => {
      const invalidInvariants: SemanticInvariants = {
        structuralInvariants: {
          sections: ['Section 1'],
          rules: ['S1'],
          mandatoryKeywords: ['MUST'],
        },
        semanticRequirements: [
          {
            id: 'INV-001',
            requirement: 'Test',
            evidence: ['Test'],
            criticality: 'CRITICAL',
          },
        ],
        processFlows: [
          {
            id: 'FLOW-001',
            name: 'Test',
            steps: ['Step 1'],
            gateChecks: [],
          },
        ],
        authorityBoundaries: [], // Empty!
      };

      expect(() => validateExtractedInvariants(invalidInvariants)).toThrow(
        /No human authority boundary extracted/
      );
    });
  });

  // ========================================================================
  // POC Test 4: Compression Report Generation (No LLM Dependencies)
  // ========================================================================
  // This validates that report generation can be tested without LLM calls.

  describe('POC-4: Compression Report Generation', () => {
    it('should generate compression report with metrics', () => {
      const sourceDoc = 'This is a source document with about 100 characters to test token estimation functionality.';
      const compressedDoc = 'Compressed version.';

      const report = generateCompressionReport(
        sourceDoc,
        compressedDoc,
        'invariants.json',
        'config.json'
      );

      expect(report.compressionTimestamp).toBeDefined();
      expect(report.sourceTokenCount).toBeGreaterThan(0);
      expect(report.compressedTokenCount).toBeGreaterThan(0);
      expect(report.reductionPercentage).toBeGreaterThan(0);
      expect(report.reductionPercentage).toBeLessThan(100);
      expect(report.invariantsUsed).toBe('invariants.json');
      expect(report.configUsed).toBe('config.json');
    });

    it('should calculate reduction percentage correctly', () => {
      const sourceDoc = 'A'.repeat(400); // ~100 tokens
      const compressedDoc = 'A'.repeat(200); // ~50 tokens

      const report = generateCompressionReport(
        sourceDoc,
        compressedDoc,
        'test.json',
        'test.json'
      );

      // Should be approximately 50% reduction
      expect(report.reductionPercentage).toBeGreaterThan(40);
      expect(report.reductionPercentage).toBeLessThan(60);
    });
  });

  // ========================================================================
  // IMPORTANT NOTE: LLM-Dependent Functions NOT Tested in Spike
  // ========================================================================
  //
  // The following functions require LLM API calls and are NOT tested in this spike:
  // - compressDocument() - calls generateText() with Anthropic
  // - extractSemanticInvariants() - calls generateObject() with Anthropic
  // - validateCompression() - calls generateObject() with Anthropic
  //
  // RATIONALE:
  // 1. These require API keys (ANTHROPIC_API_KEY environment variable)
  // 2. API calls are slow (~5-30 seconds each)
  // 3. API calls cost money
  // 4. LLM responses are non-deterministic, making assertions difficult
  //
  // TESTING APPROACH FOR FULL SPRINT:
  // Option A: Mock the `ai` SDK (generateText, generateObject)
  //   - Pros: Fast, deterministic, no API costs
  //   - Cons: Violates Sprint 10 learning (avoid mocking when possible)
  //
  // Option B: Skip testing LLM-calling functions
  //   - Pros: Follows integration test pattern
  //   - Cons: Leaves gaps in coverage
  //
  // Option C: Conditional tests (skip if no API key)
  //   - Pros: Can test when API key available
  //   - Cons: CI won't run these tests without secrets
  //
  // RECOMMENDATION: Hybrid approach
  //   - Test all helper/validation functions (no LLM) with integration tests
  //   - Test config module fully with integration tests
  //   - Document that LLM-calling functions require manual/E2E testing
  //   - This achieves ~60-70% coverage without mocking or API costs
});
