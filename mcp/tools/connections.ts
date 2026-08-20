import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api } from '../../lib/api.ts';
import { filterCatalog, normalizeProvider } from '../../lib/connections.ts';
import { resolveByPrefix } from '../../lib/select.ts';
import { withAuth } from '../util.ts';

const slug = z.string().min(1).describe('Brand URL slug');

export function registerConnectionTools(server: McpServer) {
  server.registerTool(
    'list_connections',
    {
      title: 'List connections',
      description: 'Apps connected to the brand (social accounts and external tools) with their status.',
      inputSchema: z.object({ slug }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug }) => withAuth((token) => api.listConnections(token, slug)),
  );

  server.registerTool(
    'connection_catalog',
    {
      title: 'Connection catalog',
      description:
        'Apps available to connect, each flagged as already connected or not. Use `query` to search; never invent provider slugs, take them from here.',
      inputSchema: z.object({ slug, query: z.string().optional() }),
      annotations: { readOnlyHint: true },
    },
    async ({ slug, query }) =>
      withAuth(async (token) => {
        const { apps } = await api.connectionCatalog(token, slug, query);
        return { apps: query ? filterCatalog(apps, query) : apps };
      }),
  );

  server.registerTool(
    'connect_app',
    {
      title: 'Connect an app',
      description:
        'Start connecting an app to the brand. Returns an authorization_url the USER must open in a browser (the agent cannot authorize on their behalf), then poll `complete_connection` with the returned connection_id. A null authorization_url means no user consent is needed.',
      inputSchema: z.object({
        slug,
        provider: z.string().min(1).describe('Provider slug from connection_catalog, e.g. HUBSPOT'),
        display_name: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ slug, provider, display_name }) =>
      withAuth((token) => api.beginConnection(token, slug, normalizeProvider(provider), display_name)),
  );

  server.registerTool(
    'complete_connection',
    {
      title: 'Complete connection',
      description:
        'Check whether the user finished authorizing. Poll after `connect_app`; status stays "pending" until the browser flow completes.',
      inputSchema: z.object({ slug, connection_id: z.string().min(1) }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ slug, connection_id }) =>
      withAuth((token) => api.completeConnection(token, slug, connection_id)),
  );

  server.registerTool(
    'revoke_connection',
    {
      title: 'Revoke connection',
      description:
        'Disconnect an app from the brand. Accepts a short unambiguous connection id prefix. The brand stops publishing to / reading from that app.',
      inputSchema: z.object({ slug, connection_id: z.string().min(1) }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ slug, connection_id }) =>
      withAuth(async (token) => {
        const { connections } = await api.listConnections(token, slug);
        const match = resolveByPrefix(connections, connection_id);
        if (!match.ok) {
          throw new Error(
            match.reason === 'ambiguous'
              ? `Ambiguous connection id prefix "${connection_id}" (${match.count} matches). Use a longer prefix.`
              : `No connection found for id/prefix "${connection_id}". Call list_connections first.`,
          );
        }
        await api.revokeConnection(token, slug, match.item.id);
        return { ok: true, revoked: { id: match.item.id, provider: match.item.provider } };
      }),
  );
}
