/**
 * Configuration Management for LLM-Powered Compression System
 *
 * This module handles loading, validating, and providing default configuration
 * for the compression engine.
 *
 * @module compression/config
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getProjectRoot } from '../common/project-config.js';
import {
  CompressionConfig,
  CompressionConfigSchema,
} from './types.js';

/**
 * Default compression configuration
 *
 * Used when no config file is provided or config file is missing
 */
export const DEFAULT_CONFIG: CompressionConfig = {
  targetTokenReduction: 0.5, // 50% reduction target
  preserveStructure: true,
  templateReferencePatterns: [
    {
      pattern: 'detailed inline example',
      replacement: 'Before implementing, read the referenced template',
    },
  ],
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

/**
 * Load compression configuration from JSON file
 *
 * @param configPath - Path to configuration file (relative or absolute)
 * @returns Validated compression configuration
 * @throws Error if config file is invalid JSON or fails schema validation
 *
 * @example
 * ```typescript
 * const config = loadCompressionConfig('config/compression-config.json');
 * console.log(config.targetTokenReduction); // 0.6
 * ```
 */
export function loadCompressionConfig(
  configPath: string = 'config/compression-config.json'
): CompressionConfig {
  // Resolve path relative to project root
  const resolvedPath = configPath.startsWith('/')
    ? configPath
    : join(getProjectRoot(), configPath);

  // Check if config file exists
  if (!existsSync(resolvedPath)) {
    console.warn(
      `Config file not found at ${resolvedPath}, using default configuration`
    );
    return DEFAULT_CONFIG;
  }

  try {
    // Read and parse JSON file
    const configContent = readFileSync(resolvedPath, 'utf-8');
    const rawConfig = JSON.parse(configContent);

    // Validate against schema
    const validatedConfig = CompressionConfigSchema.parse(rawConfig);

    console.log(`Loaded compression configuration from ${resolvedPath}`);
    return validatedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in config file ${resolvedPath}: ${error.message}`
      );
    }

    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      const zodError = error as { issues: Array<{ message: string; path: string[] }> };
      const issues = zodError.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Config validation failed: ${issues}`);
    }

    throw new Error(
      `Failed to load config from ${resolvedPath}: ${error}`
    );
  }
}

/**
 * Get default compression configuration
 *
 * @returns Default compression configuration
 *
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * ```
 */
export function getDefaultConfig(): CompressionConfig {
  return DEFAULT_CONFIG;
}

/**
 * Merge custom configuration with defaults
 *
 * Allows partial configuration overrides while maintaining defaults for
 * unspecified fields.
 *
 * @param customConfig - Partial configuration to override defaults
 * @returns Complete configuration with overrides applied
 *
 * @example
 * ```typescript
 * const config = mergeWithDefaults({ targetTokenReduction: 0.7 });
 * // Returns config with 0.7 reduction target and all other defaults
 * ```
 */
export function mergeWithDefaults(
  customConfig: Partial<CompressionConfig>
): CompressionConfig {
  return {
    ...DEFAULT_CONFIG,
    ...customConfig,
    llmOptimizations: {
      ...DEFAULT_CONFIG.llmOptimizations,
      ...(customConfig.llmOptimizations || {}),
    },
    sectionOmissionRules: {
      ...DEFAULT_CONFIG.sectionOmissionRules,
      ...(customConfig.sectionOmissionRules || {}),
    },
    templateReferencePatterns:
      customConfig.templateReferencePatterns ||
      DEFAULT_CONFIG.templateReferencePatterns,
  };
}

/**
 * Validate a compression configuration object
 *
 * @param config - Configuration to validate
 * @returns True if valid
 * @throws Error with validation details if invalid
 *
 * @example
 * ```typescript
 * try {
 *   validateConfig(myConfig);
 *   console.log('Config is valid');
 * } catch (error) {
 *   console.error('Invalid config:', error.message);
 * }
 * ```
 */
export function validateConfig(config: unknown): config is CompressionConfig {
  try {
    CompressionConfigSchema.parse(config);
    return true;
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string; path: string[] }> };
      const issues = zodError.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}
