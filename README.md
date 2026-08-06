# Anomalia CLI

Command-line client for [Anomalia](https://anomalia.so) — the social media AI autopilot.

> **You need an Anomalia account.** This is a client, not a standalone tool: every command talks to
> the Anomalia API over HTTPS. Without an account there is nothing to drive. (Same shape as the
> Vercel or Stripe CLIs.)

Plan and approve posts, edit a carousel slide by slide, turn a post into a video, run SEO and GEO
audits, manage the blog — all from the terminal, and all scriptable by an AI agent.

```bash
anomalia brands                                    # List your brands
anomalia dashboard my-brand                        # Full brand overview
anomalia content my-brand --status pending_user    # Posts waiting for approval
anomalia approve my-brand --all                    # Approve them
anomalia seo my-brand                              # SEO grade + initiatives
anomalia web my-brand generate --topic "..."       # Write a blog article
```

## Install

```bash
curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash
anomalia login
```

The installer downloads a standalone binary — no runtime required. Prebuilt for macOS
(arm64/x64) and Linux (arm64/x64).

### From source

Requires [Bun](https://bun.sh).

```bash
git clone https://github.com/andreabuttarelli/anomalia-cli.git
cd anomalia-cli
bun install
bun run index.ts --help
```

## Usage

Every command takes the brand slug as its first argument. `anomalia --help` lists them all;
`anomalia <command> --help` details one.

| Area | Commands |
|------|----------|
| Posts | `content`, `approve`, `post <id> [show\|edit\|regenerate\|slide\|reorder\|video\|publish]` |
| Planning | `plan`, `weekly-plan`, `calendar`, `gtm` |
| Brand | `studio`, `voice`, `people`, `products` |
| Web | `seo`, `geo`, `keywords`, `web` |
| Insight | `dashboard`, `status`, `analytics` |
| AI | `ai --message "..."` — natural language, full read/write access |

Where a table prints a short id, the matching `--id` flag accepts that prefix. An ambiguous
prefix is an error, never a guess.

Full docs: [`docs/`](docs/) · Agent-oriented summary: [`llms.txt`](llms.txt)

## Use with AI agents

The CLI is built to be driven by coding agents. `llms.txt` is a complete command reference in one
file, and `skills/anomalia-cli.md` installs as a Claude Code skill:

```bash
bash scripts/install-skill.sh
```

`anomalia ai <brand> --message "..."` pipes a natural-language instruction to the same assistant
that runs in the web app; add `--pipe` for raw, unformatted output.

## Configuration

Zero config by default. It points at `https://anomalia.so`, falling back to
`http://localhost:5173` automatically when a local dev server is answering.

| Variable | Purpose |
|----------|---------|
| `PUBLIC_APP_URL` | Point the CLI at a different Anomalia instance |

The session lives in `~/.config/anomalia/session.json` and refreshes itself; `anomalia logout`
removes it. No secrets are embedded in this repo or in the binary — the CLI holds only your own
session token.

## Architecture

A thin HTTP client with no database access and no dependency on the Anomalia server codebase:

```
CLI  ──HTTPS──►  /api/v1/*  ──►  Anomalia
```

Commands live in `commands/`, one file each, registered in `index.ts`. `lib/api.ts` is the only
place that speaks HTTP.

## Development

```bash
bun install
bun run index.ts --help   # run from source
bun run typecheck
bun test
bun run build             # binary for the current platform → dist/
bun run build:all         # all four targets
```

Releases are cut by pushing a `v*` tag: CI typechecks, tests, cross-compiles the four binaries and
attaches them (plus `SHA256SUMS.txt`) to a GitHub Release — which is exactly where `install.sh`
and `anomalia update` look.

## License

Copyright © 2026 Andrea Buttarelli.

Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE). You may use, modify
and redistribute it, but derivative works must stay open source under the same license, must keep
the copyright notice, and must state their changes — including when offered to users over a
network.
