/**
 * Pure helpers for the `connections` surface (CLI + MCP).
 *
 * Kept free of session/HTTP so they can be unit-tested, and free of the underlying
 * connector vendor: the CLI only ever sees provider slugs, never tokens. Which vendor
 * brokers the OAuth (Nango, Composio, or a native app) is a backend concern —
 * see docs/integrations.md.
 */

import type { ConnectionCatalogItem } from './api.ts';

/** Case-insensitive match on display name or provider slug, like the catalog search box. */
export function filterCatalog(items: ConnectionCatalogItem[], query: string): ConnectionCatalogItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) || item.provider.toLowerCase().includes(needle),
  );
}

/**
 * The connections endpoints ship with the backend, not with the CLI: an older API
 * answers 404. That is a "not available yet", not a crash — the caller prints a hint
 * instead of a stack trace.
 */
export function isConnectionsApiMissing(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /^API 404\b/.test(message) || /^API 501\b/.test(message);
}

/** Provider slugs are normalized upper-snake everywhere (GOOGLE_ANALYTICS, HUBSPOT, …). */
export function normalizeProvider(provider: string): string {
  return provider.trim().toUpperCase().replace(/[\s-]+/g, '_');
}
