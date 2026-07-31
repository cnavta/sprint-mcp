#!/usr/bin/env node

/**
 * Sprint MCP Server
 *
 * MCP server providing Sprint Protocol tooling for LLM-driven development workflows.
 * Implements tools for managing sprints according to the protocol defined in AGENTS.md.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './common/logger.js';
import { startSprintTool } from './tools/start-sprint.js';
import { checkSprintStatusTool } from './tools/check-sprint-status.js';
import { regenerateSprintIndexTool } from './tools/regenerate-sprint-index.js';
import { updateSprintStatusTool } from './tools/update-sprint-status.js';

/**
 * Initialize and start the MCP server
 */
async function main() {
  logger.info('Starting Sprint MCP Server...');

  const server = new Server(
    {
      name: 'sprint-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Handling list_tools request');
    return {
      tools: [
        {
          name: 'start-sprint',
          description: 'Initialize a new sprint with manifest and directory structure. Checks for active sprints first.',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Concise sprint title',
              },
              goal: {
                type: 'string',
                description: 'Clear sprint objective',
              },
              owner: {
                type: 'string',
                description: 'GitHub handle or name of sprint owner',
              },
            },
            required: ['title', 'goal', 'owner'],
          },
        },
        {
          name: 'check-sprint-status',
          description: 'Verify current sprint state and check for active sprints. Returns active sprint info or confirms no active sprints.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'regenerate-sprint-index',
          description: 'Rebuild the sprint index (planning/sprint-index.yaml) from scratch by scanning all sprint manifests. Use this to recover from index corruption or sync issues.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'update-sprint-status',
          description: 'Atomically update sprint status in both the manifest and index. Updates status, completion metadata, and PR URL.',
          inputSchema: {
            type: 'object',
            properties: {
              sprintId: {
                type: 'string',
                description: 'Sprint ID (e.g., sprint-1-abc123)',
              },
              status: {
                type: 'string',
                description: 'New sprint status (planning, in-progress, validating, verifying, published, complete)',
              },
              completedAt: {
                type: 'string',
                description: 'ISO 8601 timestamp when sprint was completed (optional)',
              },
              completionMode: {
                type: 'string',
                description: 'Completion mode: normal or forced (optional)',
              },
              pr: {
                type: 'string',
                description: 'GitHub Pull Request URL (optional)',
              },
            },
            required: ['sprintId'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.debug(`Handling call_tool request: ${request.params.name}`);

    try {
      let result;
      switch (request.params.name) {
        case 'start-sprint':
          result = await startSprintTool(request.params.arguments);
          break;
        case 'check-sprint-status':
          result = await checkSprintStatusTool(request.params.arguments);
          break;
        case 'regenerate-sprint-index':
          result = await regenerateSprintIndexTool(request.params.arguments);
          break;
        case 'update-sprint-status':
          result = await updateSprintStatusTool(request.params.arguments);
          break;
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }

      return {
        content: result.content,
        isError: result.isError,
      };
    } catch (error) {
      logger.error(`Error executing tool ${request.params.name}:`, error);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Sprint MCP Server running on stdio');
}

// Start the server
main().catch((error) => {
  logger.error('Fatal error in main:', error);
  process.exit(1);
});
