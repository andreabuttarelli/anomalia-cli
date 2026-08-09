---
name: anomalia
description: >-
  Operate Anomalia (social media AI autopilot) via MCP tools or the `anomalia` CLI —
  brands, posts, editorial/weekly plans, studio, SEO/GEO, blog, and AI chat.
  Use when the user mentions Anomalia, anomalia.so, brand content approval, SEO/GEO
  audits, or asks to manage social posts / plans from an agent.
---

# Anomalia (MCP + CLI)

Anomalia is a hosted product. This skill drives it through either:

1. **MCP tools** (preferred when the Anomalia MCP server is connected)
2. **`anomalia` CLI** (shell) when MCP is unavailable

Same OAuth identity for both. **No static API tokens.**

## Choose transport

| Situation | Use |
|-----------|-----|
| Cursor/Claude has Anomalia MCP connected | **MCP tools** (`list_brands`, `list_posts`, …) |
| MCP missing / remote HTTP auth awkward | **CLI**: `anomalia …` after `anomalia login` |
| One-shot NL instruction | MCP `chat` **or** `anomalia ai <slug> --message "..." --pipe` |

Do **not** invent REST URLs or tokens. Prefer specific tools/commands over free-form guessing.

## Auth

**Local MCP / CLI**

- Session file: `~/.config/anomalia/session.json` (shared)
- MCP: call `login` (browser) or reuse an existing CLI session
- CLI: `anomalia login` once

**Remote MCP** (`https://mcp.anomalia.so/mcp` or deploy URL)

- Requires `Authorization: Bearer <supabase_access_token>` from OAuth / that session file
- Without Bearer → 401 (expected)

Check identity: MCP `whoami` / `list_brands`, or `anomalia brands`.

## Connect MCP (hosts)

**Stdio (local)**

```json
{
  "mcpServers": {
    "anomalia": {
      "command": "bun",
      "args": ["run", "/ABS/PATH/to/anomalia-cli/mcp/stdio.ts"]
    }
  }
}
```

Or after install: `"command": "anomalia-mcp"` if on `PATH`.

**HTTP**

```json
{
  "mcpServers": {
    "anomalia": { "url": "https://mcp.anomalia.so/mcp" }
  }
}
```

Health: `GET /health` → `{"ok":true,"mcp":"/mcp"}`.

## Operating rules

1. Start with `list_brands` / `anomalia brands` to learn **slugs**.
2. Pass `slug` on every brand-scoped call.
3. Ids from list tables accept **short unambiguous prefixes** (never guess if ambiguous).
4. Prefer deterministic tools (`approve_posts`, `edit_post`, …) over `chat` / `ai` for precise edits.
5. Use `chat` / `anomalia ai` for multi-step or vague goals; add `--pipe` on CLI for raw output.
6. Destructive actions (`reject_post`, `delete_article`, `discard_plan`): confirm intent if the user did not clearly ask.

## MCP → CLI cheat sheet

| Goal | MCP | CLI |
|------|-----|-----|
| List brands | `list_brands` | `anomalia brands` |
| Overview | `get_dashboard` | `anomalia dashboard <slug>` |
| Pending posts | `list_posts` (status) | `anomalia content <slug> --status pending_user` |
| Approve all pending | `approve_posts` | `anomalia approve <slug> --all` |
| Show / edit post | `get_post` / `edit_post` | `anomalia post <slug> <id> [edit …]` |
| Approve / publish / reject | `approve_post` / `publish_post` / `reject_post` | `anomalia post <slug> <id> approve\|publish\|reject` |
| Refine image / slide / video | `regenerate_post_media` / `regenerate_slide` / `make_video` | `… regenerate\|slide\|video` |
| Editorial plan | `get_plan` / `propose_plan` / `approve_plan` / … | `anomalia plan <slug> …` |
| Weekly seeds → posts | `get_weekly_plan` / `plan_week` / `produce_week` | `anomalia weekly-plan <slug> …` |
| Studio / voice / GTM | `get_studio` / `get_voice` / `get_gtm` / … | `anomalia studio\|voice\|gtm <slug>` |
| SEO / GEO / keywords / blog | `get_seo` / `seo_action` / `get_geo` / `list_articles` / … | `anomalia seo\|geo\|keywords\|web <slug> …` |
| Open-ended | `chat` | `anomalia ai <slug> --message "…" --pipe` |

Full CLI reference: repo `llms.txt` or `skills/anomalia-cli.md`. MCP details: `docs/mcp.md`.

## Typical workflows

**Approve queue**

1. `list_posts` / `content --status pending_user`
2. Spot-check with `get_post` if needed
3. `approve_posts` / `approve --all` (or per-id approve)

**Fix one carousel slide**

1. `get_post`
2. `regenerate_slide` with `index` + instruction (0 = cover)

**Ship a blog draft**

1. `generate_article` / `web generate --topic "…"`
2. Optional `optimize_article`
3. `publish_article` when asked

## Install CLI (if needed)

```bash
curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash
anomalia login
```

From source: `bun install` then `bun run cli.ts` / `bun run mcp`.
