/**
 * Vercel Node serverless adapter for Anomalia MCP.
 * Avoids Bun-backend detection of a root app.ts / index.ts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeMcpHttp } from '../mcp/http-router.ts';
import { flushObservability, mcpLog } from '../mcp/observability.ts';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

async function readBody(req: VercelRequest): Promise<Uint8Array | undefined> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === 'string') chunks.push(new TextEncoder().encode(chunk));
    else chunks.push(new Uint8Array(chunk));
  }
  if (!chunks.length) return undefined;
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

async function toWebRequest(req: VercelRequest, forcePath?: string): Promise<Request> {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const incoming = req.url ?? '/';
  const rawPath = forcePath ?? incoming.split('?')[0] ?? '/';
  const search = incoming.includes('?') ? incoming.slice(incoming.indexOf('?')) : '';
  const url = `${proto}://${host}${rawPath}${search}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }

  const method = req.method ?? 'GET';
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  const body = await readBody(req);
  const ab =
    body && body.byteLength
      ? (body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer)
      : undefined;
  return new Request(url, { method, headers, body: ab });
}

export function createVercelHandler(forcePath?: string) {
  return async function handler(req: VercelRequest, res: VercelResponse) {
    const started = Date.now();
    const requestId =
      (req.headers['x-vercel-id'] as string | undefined) ??
      (req.headers['x-request-id'] as string | undefined) ??
      crypto.randomUUID();

    try {
      const request = await toWebRequest(req, forcePath);
      mcpLog({
        level: 'info',
        event: 'http.request',
        message: `${req.method ?? 'GET'} ${forcePath ?? req.url ?? '/'}`,
        requestId,
        method: req.method,
        path: forcePath ?? req.url,
      });

      const response = await routeMcpHttp(request);
      res.status(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'transfer-encoding') return;
        res.setHeader(key, value);
      });
      const buf = new Uint8Array(await response.arrayBuffer());
      res.end(Buffer.from(buf));

      mcpLog({
        level: response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info',
        event: 'http.response',
        message: `status ${response.status}`,
        requestId,
        method: req.method,
        path: forcePath ?? req.url,
        statusCode: response.status,
        durationMs: Date.now() - started,
      });
    } catch (e) {
      mcpLog({
        level: 'error',
        event: 'http.unhandled',
        message: e instanceof Error ? e.message : String(e),
        requestId,
        method: req.method,
        path: forcePath ?? req.url,
        statusCode: 500,
        durationMs: Date.now() - started,
        error: e,
      });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: e instanceof Error ? e.message : 'Internal error' },
          id: null,
        });
      }
    } finally {
      await flushObservability();
    }
  };
}
