#!/usr/bin/env node
/**
 * CLI Interface for LLM-Powered AGENTS.md Compression System
 *
 * This is the main entry point for the command-line interface.
 * Provides three commands: extract, compress, validate
 *
 * @module compression/cli
 */

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { extractSemanticInvariants, validateExtractedInvariants } from './semantic-extractor.js';
import { compressDocument, generateCompressionReport } from './compression-engine.js';
import { validateCompression } from './validation-engine.js';
import { loadCompressionConfig } from './config.js';
import type { SemanticInvariants } from './types.js';

const program = new Command();

program
  .name('agents-compressor')
  .description('LLM-powered compression for AGENTS.md protocol documents')
  .version('1.0.0');

// ============================================================================
// EXTRACT COMMAND
// ============================================================================

program
  .command('extract')
  .description('Extract semantic invariants from AGENTS-uncompressed.md')
  .option(
    '-i, --input <path>',
    'Input file path',
    'AGENTS-uncompressed.md'
  )
  .option(
    '-o, --output <path>',
    'Output JSON file path',
    'semantic-invariants.json'
  )
  .action(async (options) => {
    try {
      console.log('🔍 Extracting semantic invariants...');
      console.log(`  Input: ${options.input}`);
      console.log(`  Output: ${options.output}\n`);

      // Read source document
      const sourceDocument = await readFile(options.input, 'utf-8');

      // Extract semantic invariants using LLM
      const invariants = await extractSemanticInvariants(sourceDocument);

      // Validate extracted invariants
      validateExtractedInvariants(invariants);

      // Write to output file
      await writeFile(options.output, JSON.stringify(invariants, null, 2));

      console.log(`\n✅ Semantic invariants extracted successfully`);
      console.log(`   Output: ${options.output}`);
      console.log(
        `   Total requirements: ${invariants.semanticRequirements.length}`
      );
      console.log(`   Total flows: ${invariants.processFlows.length}`);

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Extraction failed:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      } else {
        console.error(`   ${error}`);
      }
      process.exit(1);
    }
  });

// ============================================================================
// COMPRESS COMMAND
// ============================================================================

program
  .command('compress')
  .description('Compress AGENTS-uncompressed.md to AGENTS.md')
  .option(
    '-i, --input <path>',
    'Input file path',
    'AGENTS-uncompressed.md'
  )
  .option(
    '-c, --config <path>',
    'Configuration file path',
    'config/compression-config.json'
  )
  .option(
    '-s, --invariants <path>',
    'Semantic invariants JSON path',
    'semantic-invariants.json'
  )
  .option('-o, --output <path>', 'Output file path', 'AGENTS.md')
  .action(async (options) => {
    try {
      console.log('📦 Compressing document...');
      console.log(`  Input: ${options.input}`);
      console.log(`  Config: ${options.config}`);
      console.log(`  Invariants: ${options.invariants}`);
      console.log(`  Output: ${options.output}\n`);

      // Load configuration
      const config = loadCompressionConfig(options.config);

      // Load semantic invariants
      const invariantsContent = await readFile(options.invariants, 'utf-8');
      const invariants: SemanticInvariants = JSON.parse(invariantsContent);

      // Read source document
      const sourceDocument = await readFile(options.input, 'utf-8');

      // Compress document using LLM
      const compressed = await compressDocument(sourceDocument, invariants, config);

      // Generate compression report
      const report = generateCompressionReport(
        sourceDocument,
        compressed,
        options.invariants,
        options.config
      );

      // Write compressed document
      await writeFile(options.output, compressed);

      // Write compression report
      const reportPath = 'compression-report.json';
      await writeFile(reportPath, JSON.stringify(report, null, 2));

      console.log(`\n✅ Compression complete`);
      console.log(`   Compressed document: ${options.output}`);
      console.log(`   Compression report: ${reportPath}`);
      console.log(`   Token reduction: ${report.reductionPercentage}%`);

      process.exit(0);
    } catch (error) {
      console.error('\n❌ Compression failed:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      } else {
        console.error(`   ${error}`);
      }
      process.exit(1);
    }
  });

// ============================================================================
// VALIDATE COMMAND
// ============================================================================

program
  .command('validate')
  .description('Validate compressed version preserves semantic invariants')
  .option('--compressed <path>', 'Compressed file path', 'AGENTS.md')
  .option(
    '--reference <path>',
    'Reference file path',
    'AGENTS-uncompressed.md'
  )
  .option(
    '--invariants <path>',
    'Semantic invariants JSON path',
    'semantic-invariants.json'
  )
  .option(
    '-o, --output <path>',
    'Validation report output path',
    'validation-report.json'
  )
  .action(async (options) => {
    try {
      console.log('✅ Validating compression...');
      console.log(`  Compressed: ${options.compressed}`);
      console.log(`  Reference: ${options.reference}`);
      console.log(`  Invariants: ${options.invariants}`);
      console.log(`  Report output: ${options.output}\n`);

      // Read compressed document
      const compressedDocument = await readFile(options.compressed, 'utf-8');

      // Read reference document
      const referenceDocument = await readFile(options.reference, 'utf-8');

      // Load semantic invariants
      const invariantsContent = await readFile(options.invariants, 'utf-8');
      const invariants: SemanticInvariants = JSON.parse(invariantsContent);

      // Validate compression using LLM
      const report = await validateCompression(
        compressedDocument,
        referenceDocument,
        invariants
      );

      // Write validation report
      await writeFile(options.output, JSON.stringify(report, null, 2));

      console.log(`\n${report.overallResult === 'PASS' ? '✅' : '❌'} Validation ${report.overallResult}`);
      console.log(`   Validation report: ${options.output}`);

      if (report.overallResult === 'FAIL') {
        console.log(`\n   ${report.recommendations.length} recommendations:`);
        report.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      // Exit with code 0 on PASS, code 1 on FAIL
      process.exit(report.overallResult === 'PASS' ? 0 : 1);
    } catch (error) {
      console.error('\n❌ Validation failed:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      } else {
        console.error(`   ${error}`);
      }
      process.exit(1);
    }
  });

// ============================================================================
// PARSE AND EXECUTE
// ============================================================================

program.parse();
