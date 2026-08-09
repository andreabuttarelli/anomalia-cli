# Anomalia Skill (MCP + CLI)

Use **Anomalia MCP tools** when connected; otherwise drive the **`anomalia` CLI** from the shell.
Same OAuth session (`~/.config/anomalia/session.json`). No static API tokens.

> Cursor Agent Skill (YAML frontmatter): [`skills/anomalia/SKILL.md`](./anomalia/SKILL.md)

## Prefer MCP, fall back to CLI

| If… | Then… |
|-----|--------|
| Anomalia MCP is available | Call tools (`list_brands`, `list_posts`, `approve_posts`, …) |
| MCP is not connected | Run `anomalia …` after `anomalia login` |
| Vague multi-step ask | MCP `chat` or `anomalia ai <slug> --message "…" --pipe` |

Always resolve **brand slug** first (`list_brands` / `anomalia brands`). Post/article ids accept short unambiguous prefixes from list output.

## MCP setup

**Stdio**

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

**HTTP** (e.g. `https://mcp.anomalia.so/mcp`): Bearer JWT required remotely.
Health: `GET /health` → `{"ok":true,"mcp":"/mcp"}`.

Auth tools: `login`, `logout`, `whoami`, `list_brands`.

## MCP tool map (high level)

- **Brand / posts:** `get_dashboard`, `get_status`, `list_posts`, `approve_posts`, `get_post`, `edit_post`, `approve_post`, `publish_post`, `reject_post`, `reschedule_post`, `render_post`, `regenerate_post_media`, `regenerate_slide`, `reorder_slides`, `make_video`, `get_analytics`, `get_calendar`, `get_gtm`, `get_voice`, `update_voice`, `list_products`
- **Plans:** `get_plan`, `propose_plan`, `revise_plan`, `approve_plan`, `discard_plan`, `save_brief`, `replan_week`, `get_weekly_plan`, `plan_week`, `produce_week`
- **Studio:** `get_studio`, `update_brand_kit`, `set_colors`, `add_note`, `delete_document`, `add_person`, `generate_person`, `delete_person`, `add_competitor`, `delete_competitor`, `research_competitors`, `sync_history`
- **Web:** `get_seo`, `seo_action`, `get_geo`, `geo_action`, `get_keywords`, `refresh_keywords`, `list_articles`, `generate_article`, `optimize_article`, `publish_article`, `unpublish_article`, `delete_article`, `get_ads`, `ads_action`, `chat`

## CLI quick reference

```bash
anomalia login
anomalia brands
anomalia dashboard <slug>
anomalia content <slug> --status pending_user
anomalia approve <slug> --all
anomalia post <slug> <id> edit --caption "..."
anomalia post <slug> <id> regenerate --instruction "..."
anomalia post <slug> <id> slide --index 1 --instruction "..."
anomalia post <slug> <id> approve|publish|reject
anomalia plan <slug> propose|approve|revise --feedback "..."
anomalia weekly-plan <slug> plan --week 0
anomalia weekly-plan <slug> produce --week 0
anomalia studio <slug> add-note --text "..."
anomalia seo <slug> | geo <slug> | keywords <slug>
anomalia web <slug> generate --topic "..."
anomalia ai <slug> --message "..." --pipe
```

## When to use which command

| Task | MCP | CLI |
|------|-----|-----|
| See brand overview | `get_dashboard` | `anomalia dashboard <slug>` |
| Posts needing approval | `list_posts` | `anomalia content <slug> --status pending_user` |
| Approve all pending | `approve_posts` | `anomalia approve <slug> --all` |
| Edit caption / fields | `edit_post` | `anomalia post <slug> <id> edit …` |
| Refine image / one slide | `regenerate_post_media` / `regenerate_slide` | `… regenerate` / `… slide` |
| Editorial plan | `propose_plan` / `approve_plan` | `anomalia plan <slug> …` |
| Seeds → posts | `plan_week` / `produce_week` | `anomalia weekly-plan <slug> …` |
| Blog draft | `generate_article` | `anomalia web <slug> generate --topic "…"` |
| Anything open-ended | `chat` | `anomalia ai <slug> --message "…" --pipe` |

## Tips

- Prefer specific tools over `chat`/`ai` for deterministic edits.
- Confirm before reject/delete/discard unless the user clearly asked.
- Install CLI: `curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash`
- Full CLI dump: [`llms.txt`](../llms.txt) · MCP docs: [`docs/mcp.md`](../docs/mcp.md)
