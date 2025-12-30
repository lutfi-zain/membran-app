## GitHub Repository Description

**Name**: membran-app

**Description**:
Automated Discord subscription & role management SaaS. Server owners can create pricing tiers, accept payments via Midtrans (GoPay, OVO, Dana), and automatically assign Discord roles when members subscribe. Built with Bun, Hono, React, Cloudflare Workers + D1.

**Topics**:
discord, discord-bot, subscription-management, midtrans, payment-gateway, saas, cloudflare-workers, bun, typescript, react, vite

**About** (Detailed):
membran.app helps Discord server owners monetize their communities through automated subscription management. Key features:

- 💰 BYOK payment model (use your own Midtrans account)
- ⚡ Instant role assignment after payment
- 🎛️ Custom pricing tiers with Discord role mapping
- 📊 Analytics dashboard (MRR, churn tracking)
- ⏰ Automated expiry management & reminders
- 🇮🇩 Southeast Asia focused (Midtrans integration)

Tech stack: Bun, Hono, React, TanStack Router, Drizzle ORM, Cloudflare Workers + D1, Arctic OAuth

**Homepage**: https://membran.app

---

## GitHub Setup Commands

# Option 1: Using GitHub CLI (gh)
gh repo create membran-app --public --description "Automated Discord subscription & role management SaaS" --source=. --remote=origin --push

# Option 2: Manual setup
# 1. Create repository at https://github.com/new
# 2. Run these commands:
git remote add origin https://github.com/YOUR_USERNAME/membran-app.git
git branch -M master
git push -u origin master
