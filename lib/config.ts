/**
 * Configuration for the Anomalia CLI.
 * All values are public (no secrets) — hardcoded for zero-config installation.
 *
 * The CLI auto-detects if a local dev server is running on localhost:5174.
 * If yes, uses it. Otherwise, uses the production URL.
 *
 * Override with: PUBLIC_APP_URL=http://my-server:3000 anomalia brands
 */

const LOCAL_URL = 'http://localhost:5173';
const PRODUCTION_URL = 'https://anomalia.so';

// Public Supabase keys (safe to embed — anon key, no secrets)
process.env.PUBLIC_SUPABASE_URL ??= 'https://kszazivzwievqixcnanp.supabase.co';
process.env.PUBLIC_SUPABASE_ANON_KEY ??= 'sb_publishable_gXzHd-4PxJ8UJ-US7mO15Q_bgiGGHvB';

let resolved = false;

export async function loadEnv() {
  if (resolved) return;

  // On Vercel / remote MCP, never probe localhost.
  if (process.env.VERCEL || process.env.MCP_REQUIRE_BEARER === '1') {
    process.env.PUBLIC_APP_URL ??= PRODUCTION_URL;
    resolved = true;
    return;
  }

  // If user explicitly set PUBLIC_APP_URL, use it
  if (process.env.PUBLIC_APP_URL && process.env.PUBLIC_APP_URL !== PRODUCTION_URL) {
    resolved = true;
    return;
  }

  // Auto-detect: try localhost first (dev server), fall back to production
  try {
    await fetch(`${LOCAL_URL}/api/v1/brands`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(1000),
    });
    // If we get any response (even 401), the server is running
    process.env.PUBLIC_APP_URL = LOCAL_URL;
  } catch {
    process.env.PUBLIC_APP_URL = PRODUCTION_URL;
  }

  resolved = true;
}

export function assertEnv() {
  // No required vars — everything has defaults.
}
