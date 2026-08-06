# AI Coding Tools — Instruction File Compatibility

Each AI coding tool reads instructions from a specific file. The Anomalia CLI skill can be installed for all of them.

| Tool | File | Posizione | Supportato |
|------|------|-----------|------------|
| **Claude Code** | `anomalia-cli.md` | `.claude/skills/` | ✅ |
| **Cursor** | `.cursorrules` | Root progetto | ✅ |
| **GitHub Copilot** | `copilot-instructions.md` | `.github/` | ✅ |
| **Windsurf** (Codeium) | `.windsurfrules` | Root progetto | ✅ |
| **Cline** (VS Code) | `.clinerules` | Root progetto | ✅ |
| **Roo Code** | `.roomodes` | Root progetto | ✅ |
| **Aider** | `.aider.conf.yml` | Root progetto | ✅ |
| **OpenAI Codex** | `AGENTS.md` | Root progetto | ✅ |
| **Mimo Code** | `AGENTS.md` | Root progetto | ✅ |
| **Kimi Code** | `AGENTS.md` | Root progetto | ✅ |
| **Antigravity CLI** | `AGENTS.md` | Root progetto | ✅ |
| **Qualsiasi AI** | `llms.txt` | Root progetto | ✅ |

## Standards

- **AGENTS.md** — Proposto da OpenAI Codex come standard universale. Supportato da molti tool.
- **llms.txt** — Standard per siti web e progetti che vogliono essere leggibili dalle AI.
- **.cursorrules** — Il più vecchio e diffuso (Cursor).
- **.claude/skills/** — Formato Claude Code (file separati per skill).

## Installazione

```bash
# Tutti i tool, progetto corrente
curl -sSL https://anomalia.so/install-skill.sh | bash -s -- --project

# Solo Claude Code, globale
curl -sSL https://anomalia.so/install-skill.sh | bash -s -- --global

# Manuale
cp cli/skills/anomalia-cli.md .claude/skills/anomalia-cli.md
cp cli/skills/anomalia-cli.md .cursorrules
cp cli/skills/anomalia-cli.md AGENTS.md
```
