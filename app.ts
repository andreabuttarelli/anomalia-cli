/**
 * Vercel / Bun backend entry for Anomalia MCP (Streamable HTTP).
 *
 * Vercel prefers `app.ts` over `index.ts` (the CLI). Export a Hono app so the
 * backend detector picks this file and serves /mcp, /health, and OAuth metadata.
 */
import { Hono } from 'hono';
import { handleMcpFetch } from './mcp/http-app.ts';

const app = new Hono();

// Delegate every path to the shared MCP fetch handler (CORS, /mcp, /health, well-known).
app.all('*', (c) => handleMcpFetch(c.req.raw));

export default app;
