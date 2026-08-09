#!/usr/bin/env bun
/**
 * Anomalia MCP server (Streamable HTTP).
 *
 * Local:
 *   bun run mcp:http
 *   → http://localhost:8787/mcp
 *
 * Auth:
 *   - Authorization: Bearer <supabase access_token> (same JWT as CLI OAuth session)
 *   - Or local session file from `anomalia login` / MCP `login` tool (when MCP_REQUIRE_BEARER is unset)
 *
 * Cursor (remote URL):
 * {
 *   "mcpServers": {
 *     "anomalia": { "url": "https://mcp.anomalia.so/mcp" }
 *   }
 * }
 */

import { loadEnv } from '../lib/config.ts';
import { handleMcpFetch } from './http-app.ts';

await loadEnv();

const port = Number(process.env.MCP_PORT ?? process.env.PORT ?? 8787);

const server = Bun.serve({
  port,
  fetch: handleMcpFetch,
});

console.error(`Anomalia MCP (HTTP) on http://localhost:${server.port}/mcp`);
console.error(`Health: http://localhost:${server.port}/health`);
