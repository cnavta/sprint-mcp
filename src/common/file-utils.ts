/**
 * File system utilities for sprint operations
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { logger } from './logger.js';

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    logger.debug(`Ensured directory exists: ${dirPath}`);
  } catch (error) {
    logger.error(`Failed to ensure directory: ${dirPath}`, error);
    throw error;
  }
}

/**
 * Write content to a file, creating parent directories if needed
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    await ensureDir(dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
    logger.debug(`Wrote file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Read content from a file
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    logger.debug(`Read file: ${filePath}`);
    return content;
  } catch (error) {
    logger.debug(`Failed to read file: ${filePath}`, error);
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all files in a directory
 */
export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(dirPath, entry.name));
  } catch (error) {
    logger.debug(`Failed to list files in directory: ${dirPath}`, error);
    return [];
  }
}

/**
 * List all directories in a directory
 */
export async function listDirectories(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(dirPath, entry.name));
  } catch (error) {
    logger.debug(`Failed to list directories in: ${dirPath}`, error);
    return [];
  }
}
