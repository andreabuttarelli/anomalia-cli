# Anomalia MCP

Model Context Protocol server for [Anomalia](https://anomalia.so). Same HTTPS client as the CLI
(`lib/api.ts`), same OAuth session — **no static API tokens**.

```
MCP host  ──stdio──►  anomalia-mcp  ──HTTPS──►  /api/v1/*  ──►  Anomalia
                         │
                         └── OAuth session in ~/.config/anomalia/session.json
                             (shared with `anomalia login`)
```

## Auth (OAuth only)

1. Call the `login` tool — opens the browser, waits for consent, stores a refreshable session.
2. Or run `anomalia login` once in a terminal; the MCP reuses that session automatically.
3. `whoami` / `logout` inspect or clear the session.

There is intentionally **no** `ANOMALIA_TOKEN` / API-key path.

> Remote MCP OAuth (hosted server + MCP Authorization Spec) still needs Authorization Server
> endpoints on Anomalia itself. This stdio server covers local hosts (Cursor, Claude Desktop,
> Codex) with the existing browser OAuth loopback flow.

## Install / run

From this repo (requires [Bun](https://bun.sh)):

```bash
bun install
bun run mcp
```

The process waits on stdin for an MCP host — that is expected.

### Cursor

In Cursor MCP settings (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

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

Optional: set `PUBLIC_APP_URL` in `env` to point at a non-default Anomalia instance.

### Claude Desktop

Same shape under `mcpServers` in Claude's config file — `command` + `args` as above.

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
bun run mcp              # stdio server
bun test mcp             # unit tests for MCP helpers
bun run typecheck
npx @modelcontextprotocol/inspector bun run mcp/index.ts
```

Architecture: `mcp/index.ts` → `mcp/server.ts` registers tools → `lib/api.ts` + `lib/auth.ts`.
