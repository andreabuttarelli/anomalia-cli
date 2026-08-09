import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'mcp.anomalia.so';
  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https';
  const app = (process.env.PUBLIC_APP_URL ?? 'https://anomalia.so').replace(/\/$/, '');

  res.status(200).json({
    resource: `${proto}://${host}/mcp`,
    authorization_servers: [app],
    scopes_supported: ['anomalia'],
    bearer_methods_supported: ['header'],
  });
}
