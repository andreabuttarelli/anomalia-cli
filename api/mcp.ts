/**
 * Vercel serverless entry for Streamable HTTP MCP.
 * Maps /api/mcp → used with rewrites so https://mcp.anomalia.so/mcp works.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMcpFetch } from '../mcp/http-app.ts';

export const config = {
  api: {
    bodyParser: false,
  },
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

async function toWebRequest(req: VercelRequest): Promise<Request> {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  // Present /api/mcp as /mcp to the shared handler (pathname checks).
  const incoming = req.url ?? '/api/mcp';
  const path = incoming.replace(/^\/api\/mcp/, '/mcp').split('?')[0] || '/mcp';
  const search = incoming.includes('?') ? incoming.slice(incoming.indexOf('?')) : '';
  const url = `${proto}://${host}${path}${search}`;

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
  return new Request(url, {
    method,
    headers,
    body: body && body.byteLength ? body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer : undefined,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const request = await toWebRequest(req);
    const response = await handleMcpFetch(request);

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const buf = new Uint8Array(await response.arrayBuffer());
    res.end(Buffer.from(buf));
  } catch (e) {
    console.error('[anomalia-mcp]', e);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: e instanceof Error ? e.message : 'Internal error' },
        id: null,
      });
    }
  }
}
