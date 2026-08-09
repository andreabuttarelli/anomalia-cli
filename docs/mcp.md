# Anomalia MCP

Model Context Protocol server for [Anomalia](https://anomalia.so). Same HTTPS client as the CLI
(`lib/api.ts`), same OAuth identity — **no static API tokens**.

```
Local stdio:  MCP host  ──stdio──►  anomalia-mcp
Local/remote: MCP host  ──HTTPS──►  /mcp  ──►  Anomalia /api/v1/*
                         │
                         └── Bearer JWT (OAuth) or ~/.config/anomalia/session.json (local only)
```

## Transports

| Mode | Command / URL | Auth |
|------|----------------|------|
| **stdio** (local) | `bun run mcp` | Browser `login` tool or existing `anomalia login` session file |
| **HTTP** (local) | `bun run mcp:http` → `http://localhost:8787/mcp` | Bearer **or** session file |
| **HTTP** (Vercel / `mcp.anomalia.so`) | `https://mcp.anomalia.so/mcp` | **Bearer required** (`Authorization: Bearer <access_token>`) |

## Auth (OAuth only)

1. **Local:** call `login` (opens browser) or run `anomalia login` — session at `~/.config/anomalia/session.json`.
2. **Remote HTTP:** send the same Supabase access token the CLI stores after OAuth:
   `Authorization: Bearer <access_token>`.
3. `whoami` / `logout` inspect or clear the local session file (logout does not revoke a remote Bearer).

There is intentionally **no** `ANOMALIA_TOKEN` / static API-key path.

Protected resource metadata: `/.well-known/oauth-protected-resource` (points at `PUBLIC_APP_URL` / anomalia.so as authorization server).

## Install / run

```bash
bun install
bun run mcp          # stdio
bun run mcp:http     # Streamable HTTP on :8787
```

### Cursor — stdio

```json
{
  "mcpServers": {
    "anomalia": {
      "command": "bun",
      "args": ["run", "/ABS/PATH/to/anomalia-cli/mcp/index.ts"]
    }
  }
}
```

### Cursor — HTTP (local or mcp.anomalia.so)

```json
{
  "mcpServers": {
    "anomalia": {
      "url": "https://mcp.anomalia.so/mcp"
    }
  }
}
```

If the client cannot send OAuth Bearer yet, use [mcp-remote](https://www.npmjs.com/package/mcp-remote) as a bridge, or run stdio locally.

## Deploy on Vercel (`mcp.anomalia.so`)

Vercel serves the Hono app in `app.ts` (Bun runtime) — **not** the CLI `index.ts`.

1. Import the GitHub repo in Vercel (Root Directory = repo root).
2. Framework: leave auto / Other. `vercel.json` sets `"bunVersion": "1.x"`.
3. Build uses `vercel-build` (skips the CLI binary compile).
4. Attach domain `mcp.anomalia.so`.
5. Optional env: `PUBLIC_APP_URL=https://anomalia.so`, `MCP_PUBLIC_URL=https://mcp.anomalia.so`.
6. On Vercel, `VERCEL=1` forces Bearer auth (no session-file fallback).

```bash
npx vercel --prod
```

Endpoints after deploy: `/mcp`, `/health`, `/.well-known/oauth-protected-resource`.

## Tool map

| Area | Tools |
|------|--------|
| Auth | `login`, `logout`, `whoami` |
| Brands | `list_brands`, `get_dashboard`, `get_status`, `get_analytics`, `get_calendar`, `get_gtm`, `get_voice`, `update_voice`, `list_products` |
| Posts | `list_posts`, `get_post`, `edit_post`, `approve_posts`, `approve_post`, `publish_post`, `reject_post`, `reschedule_post`, `render_post`, `regenerate_post_media`, `regenerate_slide`, `reorder_slides`, `make_video` |
| Plan | `get_plan`, `propose_plan`, `revise_plan`, `approve_plan`, `discard_plan`, `save_brief`, `replan_week`, `get_weekly_plan`, `plan_week`, `produce_week` |
| Studio | `get_studio`, `update_brand_kit`, `set_colors`, `add_note`, `delete_document`, `add_person`, `generate_person`, `delete_person`, `add_competitor`, `delete_competitor`, `research_competitors`, `sync_history` |
| SEO / GEO / Web | `get_seo`, `seo_action`, `get_geo`, `geo_action`, `get_keywords`, `refresh_keywords`, `list_articles`, `generate_article`, `optimize_article`, `publish_article`, `unpublish_article`, `delete_article` |
| Ads / AI | `get_ads`, `ads_action`, `chat` |

Post and article `id` arguments accept the short unambiguous prefixes printed by list tools
(same rule as the CLI).

## Development

```bash
bun run mcp              # stdio
bun run mcp:http         # HTTP
bun test                 # includes mcp helpers
bun run typecheck
npx @modelcontextprotocol/inspector bun run mcp/index.ts
```

Architecture: `mcp/index.ts` (stdio) / `mcp/http.ts` + `app.ts` (HTTP / Vercel) → `mcp/server.ts` → `lib/api.ts` + auth.
