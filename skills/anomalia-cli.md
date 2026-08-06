# Anomalia CLI Skill

Use the `anomalia` CLI to manage social media brands from the terminal. The CLI is a thin HTTP client that talks to the Anomalia backend API.

## Quick Reference

```bash
# List brands
anomalia brands

# Dashboard overview
anomalia dashboard <slug>

# Posts
anomalia content <slug>                          # List all posts
anomalia content <slug> --status pending_user    # Filter by status
anomalia approve <slug> --all                    # Approve all pending
anomalia post <slug> <id> edit --caption "..."   # Edit post caption
anomalia post <slug> <id> approve                # Approve single post
anomalia post <slug> <id> publish                # Publish immediately
anomalia post <slug> <id> reject                 # Delete pending post

# Editorial Plan
anomalia plan <slug>                             # View plan
anomalia plan <slug> propose                     # Generate first plan
anomalia plan <slug> revise --feedback "..."     # Request revision
anomalia plan <slug> approve                     # Approve proposed plan
anomalia plan <slug> discard                     # Discard proposed plan
anomalia plan <slug> save-brief --week 0 --brief "..."
anomalia plan <slug> replan --week 0 --brief "..."

# Weekly Plan (seeds → posts)
anomalia weekly-plan <slug>                      # View seeds
anomalia weekly-plan <slug> plan --week 0        # Generate seeds
anomalia weekly-plan <slug> produce --week 0     # Produce all seeds into posts

# Strategy
anomalia gtm <slug>                              # View GTM roadmap
anomalia voice <slug>                            # View voice rules

# Studio (knowledge base)
anomalia studio <slug>                           # View everything
anomalia studio <slug> kit-update --about "..."  # Update brand kit
anomalia studio <slug> colors --colors "#hex,#hex"
anomalia studio <slug> add-note --text "..."     # Add knowledge
anomalia studio <slug> add-competitor --name "..." --website "..."
anomalia studio <slug> research                  # AI competitor research
anomalia studio <slug> people-generate --name "..." --gender female
anomalia studio <slug> sync-history              # Sync social posts

# Analytics
anomalia analytics <slug>                        # View analytics
anomalia calendar <slug>                         # View calendar
anomalia calendar <slug> --month 2026-07

# SEO / GEO / Keywords / Blog
anomalia seo <slug>                              # Grade, initiatives, tech audit
anomalia seo <slug> run                          # Run the technical audit
anomalia seo <slug> plan                         # Generate the SEO growth plan
anomalia seo <slug> article --id <initiativeId>  # Initiative -> full article draft
anomalia geo <slug>                              # AI share of voice + citations
anomalia geo <slug> run|fix                      # Citation audit / generate fixes
anomalia keywords <slug> [refresh]               # Keyword strategy
anomalia web <slug> [--status draft]             # Blog articles (drafts included)
anomalia web <slug> generate --topic "..."       # New article draft
anomalia web <slug> optimize|publish --id <id>   # SEO rewrite / publish

# AI Chat (does everything the web chatbot does)
anomalia ai <slug> --message "Analyze my posts"
anomalia ai <slug> --message "Change tone to friendly"
anomalia ai <slug> --message "Add competitor Notion"
echo "..." | anomalia ai <slug>                 # Pipe mode

# System
anomalia update                                  # Update CLI
anomalia upgrade <slug>                          # Open upgrade page
```

## Installation

```bash
curl -sSL https://raw.githubusercontent.com/andreabuttarelli/anomalia-cli/main/scripts/install.sh | bash
```

## When to Use Each Command

| Task | Command |
|------|---------|
| See what's going on with a brand | `anomalia dashboard <slug>` |
| Check what posts need approval | `anomalia content <slug> --status pending_user` |
| Approve all pending posts | `anomalia approve <slug> --all` |
| Edit a specific post | `anomalia post <slug> <id> edit --caption "..."` |
| Fix a link / Reddit post | `anomalia post <slug> <id> edit --title "..." --link "..."` |
| Refine a post's image | `anomalia post <slug> <id> regenerate --instruction "..."` |
| Fix one carousel slide | `anomalia post <slug> <id> slide --index 1 --instruction "..."` |
| Drop / reorder slides | `anomalia post <slug> <id> reorder --order "0,2,1"` |
| Turn a post into a video | `anomalia post <slug> <id> video --duration 6` |
| Generate a content plan | `anomalia plan <slug> propose` |
| Generate weekly seeds | `anomalia weekly-plan <slug> plan --week 0` |
| Produce seeds into posts | `anomalia weekly-plan <slug> produce --week 0` |
| Add brand knowledge | `anomalia studio <slug> add-note --text "..."` |
| Find competitors | `anomalia studio <slug> research` |
| Do anything via natural language | `anomalia ai <slug> --message "..."` |
| Check SEO health / initiatives | `anomalia seo <slug>` |
| Check AI (LLM) visibility | `anomalia geo <slug>` |
| See keyword opportunities | `anomalia keywords <slug>` |
| Write & publish a blog article | `anomalia web <slug> generate --topic "..."` |

## Tips

- Use `anomalia ai <slug> --message "..."` for complex operations — it has full read/write access
- Use `--pipe` for machine-readable output: `anomalia ai <slug> --message "..." --pipe`
- All commands require authentication (run `anomalia login` once)
- The `slug` is the brand's URL slug (e.g., `my-brand`)
- Post IDs come from `anomalia content <slug>`; `--id` accepts the short prefix printed in tables
