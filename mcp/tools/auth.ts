import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { api } from '../../lib/api.ts';
import {
  clearSession,
  loadSession,
  startBrowserLogin,
} from '../../lib/auth.ts';
import { fail, ok, withAuth } from '../util.ts';

export function registerAuthTools(server: McpServer) {
  server.registerTool(
    'login',
    {
      title: 'Login',
      description:
        'Sign in to Anomalia via browser OAuth. Opens the login page, waits for consent, and stores a refreshable session in ~/.config/anomalia/session.json (same file as the CLI). No static API tokens.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const existing = await loadSession();
        if (existing) {
          return ok({
            alreadyAuthenticated: true,
            email: existing.user.email,
            expiresAt: existing.expires_at,
            hint: 'Already signed in. Call logout first if you need to switch accounts.',
          });
        }

        const session = await startBrowserLogin((msg: string) => {
          // stdout is the MCP JSON-RPC channel — log only to stderr
          console.error(`[anomalia-mcp] ${msg}`);
        });

        return ok({
          authenticated: true,
          email: session.user.email,
          expiresAt: session.expires_at,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    },
  );

  server.registerTool(
    'logout',
    {
      title: 'Logout',
      description: 'Clear the local Anomalia OAuth session (CLI + MCP share the same session file).',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async () => {
      clearSession();
      return ok({ loggedOut: true });
    },
  );

  server.registerTool(
    'whoami',
    {
      title: 'Who am I',
      description: 'Show the currently authenticated Anomalia user, if any.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => {
      const session = await loadSession();
      if (!session) {
        return ok({ authenticated: false, hint: 'Call login to authenticate via browser OAuth.' });
      }
      return ok({
        authenticated: true,
        email: session.user.email,
        userId: session.user.id,
        expiresAt: session.expires_at,
      });
    },
  );

  server.registerTool(
    'list_brands',
    {
      title: 'List brands',
      description: 'List all Anomalia brands for the signed-in user (slug, plan, pending posts, autopilot).',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () => withAuth(async (token) => api.listBrands(token)),
  );
}
