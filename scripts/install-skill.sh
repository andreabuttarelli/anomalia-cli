#!/bin/bash
#
# Install Anomalia CLI skill for ALL AI coding assistants
#
# Supported tools:
#   Claude Code, Cursor, GitHub Copilot, Windsurf, Cline,
#   Roo Code, Aider, OpenAI Codex, Mimo Code, Kimi Code,
#   Antigravity CLI, and any tool that reads AGENTS.md or llms.txt
#
# Usage:
#   curl -sSL https://anomalia.so/install-skill.sh | bash              # Interactive
#   curl -sSL https://anomalia.so/install-skill.sh | bash -s -- --global   # Global
#   curl -sSL https://anomalia.so/install-skill.sh | bash -s -- --project  # Current project
#

set -euo pipefail

# ── Colors ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC} $1"; }

# ── Skill content ──────────────────────────────────────────────────────

read_skill_content() {
  # Try to download from GitHub, fallback to embedded
  local url="https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/skills/anomalia-cli.md"
  local content
  content=$(curl -sSL "$url" 2>/dev/null) || true

  if [[ -z "$content" ]]; then
    # Embedded fallback
    read -r -d '' content << 'SKILL_EOF' || true
# Anomalia CLI

CLI for managing Anomalia social media AI autopilot brands.

## Quick Reference

```bash
anomalia brands                                    # List brands
anomalia dashboard <slug>                          # Brand overview
anomalia content <slug> [--status pending_user]    # List/filter posts
anomalia approve <slug> --all                      # Approve all pending
anomalia post <slug> <id> edit --caption "..."     # Edit post
anomalia plan <slug>                               # View editorial plan
anomalia plan <slug> propose                       # Generate plan
anomalia weekly-plan <slug> plan --week 0          # Generate seeds
anomalia weekly-plan <slug> produce --week 0       # Produce posts
anomalia studio <slug>                             # View knowledge base
anomalia studio <slug> add-note --text "..."       # Add knowledge
anomalia studio <slug> research                    # AI competitor research
anomalia ai <slug> --message "..."                 # AI chat (full access)
echo "..." | anomalia ai <slug>                    # Pipe mode
```

## Tips

- Use `anomalia ai <slug> --message "..."` for complex operations
- Use `--pipe` for machine-readable output
- Post IDs: `anomalia content <slug>`
- Run `anomalia` once to authenticate via browser
SKILL_EOF
  fi

  echo "$content"
}

# ── Parse args ─────────────────────────────────────────────────────────

MODE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --global)   MODE="global"; shift ;;
    --project)  MODE="project"; shift ;;
    -h|--help)
      echo "Usage: curl -sSL https://anomalia.so/install-skill.sh | bash"
      echo ""
      echo "Options:"
      echo "  --global    Install globally (~/.claude/skills/)"
      echo "  --project   Install in current project (all tools)"
      echo ""
      echo "Supported tools:"
      echo "  Claude Code, Cursor, GitHub Copilot, Windsurf, Cline,"
      echo "  Roo Code, Aider, OpenAI Codex, Mimo Code, Kimi Code,"
      echo "  Antigravity CLI, and any tool that reads AGENTS.md"
      exit 0
      ;;
    *)  shift ;;
  esac
done

# ── Install function ───────────────────────────────────────────────────

install_file() {
  local target="$1"
  local label="$2"
  local dir
  dir=$(dirname "$target")

  mkdir -p "$dir"

  # If file exists and already has our content, skip
  if [[ -f "$target" ]] && grep -q "Anomalia CLI" "$target" 2>/dev/null; then
    info "$label già configurato"
    return
  fi

  # If file exists, append (don't overwrite user content)
  if [[ -f "$target" ]]; then
    echo "" >> "$target"
    echo "$SKILL_CONTENT" >> "$target"
    success "$label aggiornato → $target"
  else
    echo "$SKILL_CONTENT" > "$target"
    success "$label creato → $target"
  fi
}

# ── Main ───────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}Anomalia CLI — AI Skill Installer${NC}"
echo ""

# Ask mode if not specified
if [[ -z "$MODE" ]]; then
  echo "  Dove vuoi installare la skill?"
  echo ""
  echo "  1) Progetto corrente (tutti i tool)"
  echo "  2) Globale (~/.claude/skills/)"
  echo ""
  read -p "  Scelta [1/2]: " choice
  case "$choice" in
    2) MODE="global" ;;
    *) MODE="project" ;;
  esac
  echo ""
fi

# Load skill content
info "Caricamento skill..."
SKILL_CONTENT=$(read_skill_content)

if [[ -z "$SKILL_CONTENT" ]]; then
  echo -e "${RED}✗${NC} Impossibile caricare la skill"
  exit 1
fi

info "Modalità: $MODE"
echo ""

# ── Install ────────────────────────────────────────────────────────────

if [[ "$MODE" == "global" ]]; then
  # Global: only Claude Code
  install_file "$HOME/.claude/skills/anomalia-cli.md" "Claude Code (globale)"
else
  # Project: all tools

  # Claude Code (uses CLAUDE.md which is auto-read)
  install_file "CLAUDE.md" "Claude Code (CLAUDE.md)"

  # Cursor
  install_file ".cursorrules" "Cursor"

  # GitHub Copilot
  install_file ".github/copilot-instructions.md" "GitHub Copilot"

  # Windsurf (Codeium)
  install_file ".windsurfrules" "Windsurf"

  # Cline (VS Code extension)
  install_file ".clinerules" "Cline"

  # Roo Code
  install_file ".roomodes" "Roo Code"

  # Aider
  if [[ -f ".aider.conf.yml" ]]; then
    if ! grep -q "Anomalia CLI" ".aider.conf.yml" 2>/dev/null; then
      echo "" >> ".aider.conf.yml"
      echo "# Anomalia CLI" >> ".aider.conf.yml"
      echo "$SKILL_CONTENT" >> ".aider.conf.yml"
      success "Aider aggiornato → .aider.conf.yml"
    else
      info "Aider già configurato"
    fi
  else
    # Aider uses YAML, create a proper file
    cat > ".aider.conf.yml" << AIDER_EOF
# Anomalia CLI instructions
# See: https://anomalia.so
AIDER_EOF
    echo "$SKILL_CONTENT" >> ".aider.conf.yml"
    success "Aider creato → .aider.conf.yml"
  fi

  # AGENTS.md (OpenAI Codex, Mimo Code, Kimi Code, Antigravity, generic)
  install_file "AGENTS.md" "AGENTS.md (Codex/Mimo/Kimi/Antigravity)"

  # llms.txt (universal standard)
  if [[ ! -f "llms.txt" ]]; then
    curl -sSL "https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/llms.txt" -o "llms.txt" 2>/dev/null && \
      success "llms.txt creato" || true
  else
    info "llms.txt già esistente"
  fi
fi

# ── Summary ────────────────────────────────────────────────────────────

echo ""
success "Skill installata!"
echo ""

if [[ "$MODE" == "project" ]]; then
  echo "  File installati:"
  [[ -f ".claude/skills/anomalia-cli.md" ]] && echo "    • .claude/skills/anomalia-cli.md  (Claude Code)"
  [[ -f ".cursorrules" ]] && echo "    • .cursorrules                (Cursor)"
  [[ -f ".github/copilot-instructions.md" ]] && echo "    • .github/copilot-instructions.md  (Copilot)"
  [[ -f ".windsurfrules" ]] && echo "    • .windsurfrules              (Windsurf)"
  [[ -f ".clinerules" ]] && echo "    • .clinerules                 (Cline)"
  [[ -f ".roomodes" ]] && echo "    • .roomodes                   (Roo Code)"
  [[ -f ".aider.conf.yml" ]] && echo "    • .aider.conf.yml             (Aider)"
  [[ -f "AGENTS.md" ]] && echo "    • AGENTS.md                   (Codex/Mimo/Kimi)"
  [[ -f "llms.txt" ]] && echo "    • llms.txt                    (universal)"
fi

echo ""
echo "  Ora puoi dire alla tua AI:"
  echo "  ${BOLD}\"Usa la CLI Anomalia per mostrarmi i brand\"${NC}"
echo ""
