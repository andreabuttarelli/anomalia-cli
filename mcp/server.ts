import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAuthTools } from './tools/auth.ts';
import { registerBrandTools } from './tools/brand-content.ts';
import { registerPlanTools } from './tools/plan.ts';
import { registerStudioTools } from './tools/studio.ts';
import { registerWebTools } from './tools/web.ts';

export function createAnomaliaMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'anomalia',
      version: '0.1.0',
      description:
        'Anomalia social media AI autopilot — manage brands, posts, plans, studio, SEO/GEO, and blog via OAuth.',
    },
    {
      instructions: [
        'Authenticate with the `login` tool (browser OAuth). There is no static API token.',
        'The MCP shares ~/.config/anomalia/session.json with the Anomalia CLI — if `anomalia login` already ran, `whoami` should succeed.',
        'Always start with `list_brands` (or `whoami`) to learn brand slugs.',
        'Post and article ids accept short unambiguous prefixes from list tools.',
        'Prefer specific tools for deterministic actions; use `chat` for open-ended multi-step work.',
      ].join(' '),
    },
  );

  registerAuthTools(server);
  registerBrandTools(server);
  registerPlanTools(server);
  registerStudioTools(server);
  registerWebTools(server);

  return server;
}
