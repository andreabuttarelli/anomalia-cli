/**
 * Vercel / Bun backend entry for Anomalia MCP (Streamable HTTP).
 *
 * Keep this file light: heavy MCP SDK imports are loaded lazily so /health
 * still works if the tool graph fails to boot (and so cold starts stay smaller).
 *
 * Vercel prefers `app.ts` over `index.ts` (the CLI).
 */
import { Hono } from 'hono';

const app = new Hono();

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, mcp-session-id, Last-Event-ID, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

app.options('*', (c) => {
  const res = new Response(null, { status: 204, headers: CORS });
  return res;
});

app.get('/health', (c) =>
  json({
    ok: true,
    name: 'anomalia-mcp',
    transport: 'streamable-http',
    mcp: '/mcp',
  }),
);

app.get('/', (c) =>
  json({
    ok: true,
    name: 'anomalia-mcp',
    transport: 'streamable-http',
    mcp: '/mcp',
  }),
);

app.get('/.well-known/oauth-protected-resource', (c) => {
  const appUrl = (process.env.PUBLIC_APP_URL ?? 'https://anomalia.so').replace(/\/$/, '');
  const publicUrl = (process.env.MCP_PUBLIC_URL ?? new URL(c.req.url).origin).replace(/\/$/, '');
  return json({
    resource: `${publicUrl}/mcp`,
    authorization_servers: [appUrl],
    scopes_supported: ['anomalia'],
    bearer_methods_supported: ['header'],
  });
});

app.all('/mcp', async (c) => {
  try {
    const { handleMcpFetch } = await import('./mcp/http-app.ts');
    return await handleMcpFetch(c.req.raw);
  } catch (e) {
    console.error('[anomalia-mcp] failed to load/handle MCP:', e);
    return json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: e instanceof Error ? e.message : String(e),
        },
        id: null,
      },
      500,
    );
  }
});

app.all('*', (c) => json({ error: 'Not found', hint: 'Use /mcp or /health' }, 404));

export default app;
