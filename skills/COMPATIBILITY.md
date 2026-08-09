# AI Coding Tools — Instruction File Compatibility

Each AI coding tool reads instructions from a specific file. The Anomalia skill
(MCP + CLI) can be installed for all of them.

| Tool | File | Location | Supported |
|------|------|----------|-----------|
| **Cursor Agent Skills** | `SKILL.md` | `.cursor/skills/anomalia/` | ✅ |
| **Claude Code** | `anomalia-cli.md` | `.claude/skills/` | ✅ |
| **Cursor** | `.cursorrules` | Project root | ✅ |
| **GitHub Copilot** | `copilot-instructions.md` | `.github/` | ✅ |
| **Windsurf** (Codeium) | `.windsurfrules` | Project root | ✅ |
| **Cline** (VS Code) | `.clinerules` | Project root | ✅ |
| **Roo Code** | `.roomodes` | Project root | ✅ |
| **Aider** | `.aider.conf.yml` | Project root | ✅ |
| **OpenAI Codex** | `AGENTS.md` | Project root | ✅ |
| **Mimo / Kimi / Antigravity** | `AGENTS.md` | Project root | ✅ |
| **Any AI** | `llms.txt` | Project root | ✅ |

## Repo sources

| File | Purpose |
|------|---------|
| [`skills/anomalia/SKILL.md`](./anomalia/SKILL.md) | Cursor Agent Skill (YAML frontmatter) — MCP-first |
| [`skills/anomalia-cli.md`](./anomalia-cli.md) | Flat skill for Claude / installer / AGENTS.md |
| [`llms.txt`](../llms.txt) | Full CLI command dump |
| [`docs/mcp.md`](../docs/mcp.md) | MCP transports + OAuth |

## Standards

- **Agent Skills** (`SKILL.md`) — Cursor progressive disclosure skills
- **AGENTS.md** — universal agent instructions
- **llms.txt** — machine-readable project docs
- **.claude/skills/** — Claude Code skills

## Install

```bash
# All tools, current project (includes .cursor/skills/anomalia)
bash scripts/install-skill.sh --project

# Global: Claude + Cursor
bash scripts/install-skill.sh --global

# Manual Cursor
mkdir -p .cursor/skills/anomalia
cp skills/anomalia/SKILL.md .cursor/skills/anomalia/SKILL.md
```
