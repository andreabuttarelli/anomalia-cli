# AI Coding Tools — skill compatibility

## Publishable Agent Skill (recommended)

Package: [`skills/anomalia/`](./anomalia/) — follows [agentskills.io](https://agentskills.io/specification).

```bash
npx skills add andreabuttarelli/anomalia-cli --skill anomalia
npx skills add andreabuttarelli/anomalia-cli --skill anomalia -g   # global
```

Appears on directories that index public GitHub skills (e.g. skills.sh) via install telemetry — no separate submission.

| File | Role |
|------|------|
| `anomalia/SKILL.md` | Frontmatter + short instructions |
| `anomalia/references/mcp.md` | MCP connect / auth |
| `anomalia/references/tools.md` | Tool ↔ CLI map |
| `anomalia/references/cli.md` | CLI install + commands |

## Legacy / multi-tool installer

[`anomalia-cli.md`](./anomalia-cli.md) + `bash scripts/install-skill.sh` still copies into Claude, `.cursorrules`, `AGENTS.md`, etc.

| Tool | File | Location |
|------|------|----------|
| **Cursor Agent Skills** | `SKILL.md` | `.cursor/skills/anomalia/` |
| **Claude Code** | `anomalia-cli.md` or skill dir | `.claude/skills/` |
| **Cursor rules** | `.cursorrules` | Project root |
| **GitHub Copilot** | `copilot-instructions.md` | `.github/` |
| **AGENTS.md / llms.txt** | project docs | Root |

```bash
bash scripts/install-skill.sh --project
bash scripts/install-skill.sh --global
```
