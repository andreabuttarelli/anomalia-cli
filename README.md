# Anomalia CLI — Social Media AI Automation CLI, MCP Server & Agent Skill

**Automate your social media from the terminal.** [Anomalia](https://anomalia.so) is the social
media AI autopilot that plans, writes, designs and publishes posts, blog articles and SEO/GEO
audits on autopilot. This repository is its command-line client, [MCP server](docs/mcp.md)
(Model Context Protocol — `stdio` + HTTP) and agent skill: everything you need to run social
media automation, content generation and approval workflows from a terminal or an AI agent.

This repository ships **three ways** to drive the same product (same OAuth, same API, **no static tokens**):

| | What | Who it’s for |
|---|------|----------------|
| **CLI** | `anomalia` terminal commands | Humans & scripts |
| **MCP** | Model Context Protocol server (`stdio` + HTTP) | Cursor, Claude, other MCP hosts |
| **Skill** | Agent Skill (`skills/anomalia/`) | Coding agents / skills.sh / `npx skills` |

> **You need an Anomalia account.** This is a client, not a standalone tool: every call talks to
> the Anomalia API over HTTPS. Without an account there is nothing to drive.

With the Anomalia CLI you can automate social media posting, approve AI-generated content in one
tap, edit a carousel slide by slide, turn a post into a video, run SEO and GEO audits, and manage
your blog — from the terminal **or** from an AI agent like Cursor or Claude.

```text
┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
│  anomalia   │   │  MCP host   │   │  Agent + Skill   │
│    CLI      │   │ (Cursor…)   │   │  (npx skills)    │
└──────┬──────┘   └──────┬──────┘   └────────┬─────────┘
       │                 │                   │
       │    lib/api.ts + OAuth session       │
       └─────────────────┼───────────────────┘
                         ▼
                 Anomalia /api/v1/*
```

---

## 1. CLI

```bash
curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash
anomalia login
```

Standalone binary for macOS (arm64/x64) and Linux (arm64/x64) — no runtime required.

```bash
anomalia brands
anomalia dashboard my-brand
anomalia content my-brand --status pending_user
anomalia approve my-brand --all
anomalia seo my-brand
anomalia web my-brand generate --topic "..."
anomalia ads my-brand --remix
anomalia ai my-brand --message "..." --pipe
```

Every command takes the brand slug as its first argument. `anomalia --help` lists them all;
`anomalia <command> --help` details one. Short id prefixes from tables are accepted; ambiguous
prefixes error instead of guessing.

| Area | Commands |
|------|----------|
| Posts | `content`, `approve`, `post <id> [show\|edit\|regenerate\|slide\|reorder\|video\|publish]` |
| Planning | `plan`, `weekly-plan`, `calendar`, `gtm` |
| Brand | `studio`, `voice`, `people`, `products` |
| Web | `seo`, `geo`, `keywords`, `web`, `ads` |
| Insight | `dashboard`, `status`, `analytics` |
| AI | `ai --message "..."` — natural language, full read/write access |

Full command dump: [`llms.txt`](llms.txt) · more docs: [`docs/`](docs/)

### From source

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/andreabuttarelli/anomalia-cli.git
cd anomalia-cli
bun install
bun run cli.ts --help
```

---

## 2. MCP server

Same tools and OAuth as the CLI. Docs: **[`docs/mcp.md`](docs/mcp.md)**.

```bash
bun run mcp          # stdio (local hosts)
bun run mcp:http     # http://localhost:8787/mcp
```

Remote: `https://mcp.anomalia.so/mcp` (Bearer JWT required). Health: `GET /health`.

**Cursor — stdio**

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

**Cursor — HTTP**

```json
{
  "mcpServers": {
    "anomalia": { "url": "https://mcp.anomalia.so/mcp" }
  }
}
```

- Local stdio: `login` tool or existing `anomalia login` → `~/.config/anomalia/session.json`
- Remote HTTP: `Authorization: Bearer <access_token>` (401 without it is expected)

---

## 3. Agent Skill

Publishable [Agent Skill](https://agentskills.io) for Cursor, Claude, skills.sh, and friends:

```bash
npx skills add andreabuttarelli/anomalia-cli --skill anomalia
# or
bash scripts/install-skill.sh --project
```

Package: [`skills/anomalia/`](skills/anomalia/) (`SKILL.md` + `references/` for MCP setup, tool map, CLI).

When the skill is active, agents prefer **MCP tools** if connected, otherwise the **CLI**.

---

## Configuration

Zero config by default → `https://anomalia.so`, with automatic fallback to
`http://localhost:5173` when a local app is answering.

| Variable | Purpose |
|----------|---------|
| `PUBLIC_APP_URL` | Point CLI/MCP at another Anomalia instance |
| `SENTRY_DSN` | (MCP HTTP / Vercel) Errors → Sentry |
| `SUPABASE_SERVICE_ROLE_KEY` | (MCP HTTP / Vercel) Rows in `mcp_logs` |
| `MCP_PUBLIC_URL` | Public MCP base URL for OAuth metadata |

Session: `~/.config/anomalia/session.json`. `anomalia logout` clears it. No secrets are embedded
in this repo or the binary.

---

## Architecture

Thin HTTPS client — no DB access, no coupling to the Anomalia server codebase:

```
CLI  ──┐
MCP  ──┼── HTTPS ──►  /api/v1/*  ──►  Anomalia
Skill ─┘   (guides agents to CLI or MCP)
```

- CLI commands: `commands/` + `cli.ts`
- HTTP client: `lib/api.ts` only
- MCP: `mcp/` (reuses `lib/api.ts`, registers tools)
- Skill: `skills/anomalia/`

---

## Development

```bash
bun install
bun run cli.ts --help
bun run mcp
bun run mcp:http
bun run typecheck
bun test
bun run build             # binary → dist/
bun run build:all         # all four targets
bun run vercel-build      # MCP bundles under mcp/api/
```

Releases: push a `v*` tag → CI typechecks, tests, cross-compiles binaries + `SHA256SUMS.txt` on
the GitHub Release (`install.sh` / `anomalia update`).

---

## License

Copyright © 2026 Andrea Buttarelli.

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). You may use, modify
and redistribute it, but derivative works must stay open source under the same license, must keep
the copyright notice, and must state their changes — including when offered to users over a
network.
