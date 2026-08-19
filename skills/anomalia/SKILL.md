---
name: anomalia
description: >-
  Operate Anomalia (social media AI autopilot) via MCP tools or the anomalia CLI:
  brands, posts, plans, studio, SEO/GEO, blog, ads diagnostics, and AI chat. Use
  when the user mentions Anomalia, anomalia.so, approving social posts, editorial
  plans, SEO/GEO or AI-citability audits, paid-campaign fatigue, or managing brand
  content from an agent.
license: AGPL-3.0-or-later
compatibility: >-
  Requires network access to anomalia.so (or PUBLIC_APP_URL). Prefer Anomalia MCP
  when connected; otherwise the anomalia CLI (Bun or installed binary) after OAuth login.
metadata:
  author: andreabuttarelli
  version: "1.1.0"
  homepage: https://anomalia.so
  repository: https://github.com/andreabuttarelli/anomalia-cli
  mcp: https://mcp.anomalia.so/mcp
---

# Anomalia

Drive [Anomalia](https://anomalia.so) — social media AI autopilot — through **MCP tools**
(preferred) or the **`anomalia` CLI**. Same OAuth identity. **No static API tokens.**

## Choose interface

| Situation | Action |
|-----------|--------|
| Anomalia MCP is connected | Call MCP tools (`list_brands`, `list_posts`, …) |
| MCP not available | Shell: `anomalia …` after `anomalia login` |
| Vague / multi-step ask | MCP `chat` or `anomalia ai <slug> --message "…" --pipe` |

Never invent REST endpoints or API keys.

## Auth (always OAuth)

1. **Local MCP / CLI:** shared session at `~/.config/anomalia/session.json`. MCP tool `login` opens the browser, or run `anomalia login`.
2. **Remote MCP** (`https://mcp.anomalia.so/mcp`): send `Authorization: Bearer <access_token>` (same JWT the CLI stores). Missing Bearer → 401.
3. Verify with `whoami` / `list_brands` or `anomalia brands`.

Setup details: [references/mcp.md](references/mcp.md).

## Operating rules

1. Start with `list_brands` (or `anomalia brands`) to learn **slugs**.
2. Pass `slug` on every brand-scoped call.
3. Post/article ids accept **short unambiguous prefixes** from list output — never guess if ambiguous.
4. Prefer specific tools (`approve_posts`, `edit_post`, …) over `chat` for precise edits.
5. Confirm before reject / delete / discard unless the user clearly asked.
6. **Read the result's own honesty fields before summarising it.** Scores carry a `coverage` and a
   `tier`; a `score` of `null` means the evidence was too thin to grade and must be reported as
   that, never replaced with another number. Campaigns carry a `fatigue` diagnosis whose branches
   call for opposite actions. Analyses state what they cannot support. See
   [references/reading-results.md](references/reading-results.md).
7. **Never delete a `[NEED: …]` marker from a caption.** It is the system saying a figure was never
   supplied; it blocks publishing on purpose. Ask the user for the fact, or rewrite so the claim is
   not needed. Removing the marker turns an honest gap into an unsupported claim.
8. **Never declare a winner the sample cannot support.** "Not enough signal to rank these, here is
   what to run to get it" is a real answer.

## Quick workflows

**Approve pending posts** → `list_posts` (status pending) → optional `get_post` → `approve_posts`.

**Fix one carousel slide** → `get_post` → `regenerate_slide` (`index`, instruction; 0 = cover).

**Blog draft** → `generate_article` → optional `optimize_article` → `publish_article` when asked.

**AI visibility** → `get_geo` → lead with `citability.score` and `citability.bindingConstraint`, not
`tech_score` (that is 10% of the answer) → `geo_action` with `fix` to generate artifacts.

**Why is this campaign dying?** → `get_ads` → read `fatigue` BEFORE proposing anything: new creative
is the wrong answer for four of its nine branches, and actively wasteful for `tracking_failure`.

## References (load on demand)

- [references/mcp.md](references/mcp.md) — connect MCP (stdio / HTTP), Cursor config, auth
- [references/tools.md](references/tools.md) — full MCP tool catalog + CLI equivalents
- [references/cli.md](references/cli.md) — install CLI and common commands
- [references/reading-results.md](references/reading-results.md) — **read before summarising any
  audit, recap or campaign**: coverage vs score, citability vs tech score, the fatigue diagnosis
  table, sample-size discipline, and why `[NEED: …]` must never be deleted

## Install this skill

```bash
npx skills add andreabuttarelli/anomalia-cli --skill anomalia
```

Or install the marketplace plugin (skill + remote MCP):

```bash
# Claude Code
/plugin marketplace add andreabuttarelli/anomalia-cli
/plugin install anomalia@anomalia

# Codex
codex plugin marketplace add andreabuttarelli/anomalia-cli
```

Or copy this folder into `.cursor/skills/anomalia/` / `~/.claude/skills/anomalia/`.  
Submit / packaging details: [`docs/plugins.md`](../../../../docs/plugins.md).
