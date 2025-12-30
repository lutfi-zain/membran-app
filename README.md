# membran.app

> Automated Discord subscription & role management SaaS for server owners

[![TypeScript](https://img.shields.io/badge/TypeScript-000000?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun)](https://bun.sh/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers- orange?style=flat&logo=cloudflare)](https://workers.cloudflare.com/)

---

## 🎯 What is membran.app?

**membran.app** is a SaaS platform that helps Discord server owners automate subscription management and role assignment. Server owners can create pricing tiers, accept payments via **Midtrans** (GoPay, OVO, Dana, Card), and automatically assign Discord roles when members subscribe.

### Core Promise

> **Eliminate manual payment verification and role assignment** - Server owners save 10-30 hours/month while members get instant access after payment.

### Target Audience

- **Primary**: Discord server owners who monetize their communities (5,000+ servers globally)
- **Secondary**: Discord members purchasing premium access

---

## ✨ Key Features

### For Server Owners

- 🔗 **BYOK Model** - Use your own Midtrans account (zero per-transaction fees)
- 💰 **Flat Pricing** - $10/month for 500 members (break even at 10 paying members)
- 🎛️ **Pricing Tiers** - Create 1-5 custom pricing tiers with Discord role mapping
- 📊 **Analytics Dashboard** - Track MRR, churn rate, subscriber trends
- ⏰ **Expiry Management** - Automated grace periods and DM reminders
- 🔔 **Role Automation** - Instant role assignment after payment

### For Members

- ⚡ **Instant Access** - Get your Discord role within 5 seconds of payment
- 💳 **Local Payments** - GoPay, OVO, Dana, Bank Transfer via Midtrans
- 👤 **Member Portal** - View subscription status, expiry date, renewal options
- 📱 **Reminders** - Automatic DM reminders before subscription expires

---

## 🏗️ Architecture

### Monorepo Structure

```
membran-app/
├── apps/
│   ├── api/          # Hono backend (Cloudflare Workers)
│   └── web/          # React frontend (Vite)
├── packages/
│   ├── db/           # Drizzle ORM schemas
│   └── shared/       # Shared Zod schemas + types
└── specs/            # Feature specifications
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun, Turborepo |
| **Frontend** | React 18, Vite, TanStack Router, smoothui.dev, Tailwind CSS |
| **Backend** | Hono, Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite), Drizzle ORM |
| **Auth** | Arctic (Discord OAuth), Oslo (crypto utils) |
| **Payment** | Midtrans SDK |
| **Bot** | Discordeno/discord.js |
| **Hosting** | Cloudflare Pages + Workers + D1 |

---

## 🚀 Quick Start

### Prerequisites

- **Bun** >= 1.0
- **Cloudflare account** (Workers + D1 + Pages)
- **Discord Bot** token & application
- **Midtrans** Server Key & Client Key

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd membran-app

# Install dependencies
bun install

# Run development servers
bun dev
```

### Database Setup

```bash
# Generate database schema
bun run db:generate

# Apply migrations (local)
cd apps/api
npx wrangler d1 migrations apply membran-db --local
```

### Environment Variables

Create `apps/api/.dev.vars`:

```bash
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:8787/auth/discord/callback
DISCORD_BOT_TOKEN=your_discord_bot_token

MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key
MIDTRANS_PRODUCTION=false

SESSION_SECRET=your_session_secret

# Cloudflare D1 (auto-configured by wrangler)
```

---

## 📁 Project Structure

```
apps/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   └── payments.ts      # Payment/Midtrans endpoints
│   │   ├── lib/
│   │   │   ├── auth.ts          # Token utilities
│   │   │   └── email.ts         # Email sending
│   │   └── middleware/
│   │       ├── session.ts       # Session middleware
│   │       └── rate-limit.ts    # Rate limiting
│   └── wrangler.toml            # Cloudflare config

├── web/
    ├── src/
    │   ├── components/
    │   │   ├── auth/            # Auth components (LoginForm, SignupForm, etc.)
    │   │   └── pricing/         # Pricing tier components
    │   ├── hooks/
    │   │   └── useAuth.ts       # Auth hook
    │   ├── pages/
    │   │   ├── login/           # Login page
    │   │   ├── signup/          # Signup page
    │   │   └── settings/        # Settings page
    │   └── main.tsx             # App entry point

packages/
├── db/
│   ├── src/schema/
│   │   ├── users.ts             # ServerOwner, Member tables
│   │   ├── servers.ts           # DiscordServer table
│   │   ├── subscriptions.ts     # Subscription table
│   │   └── pricing_tiers.ts    # PricingTier table
│   └── drizzle/                 # Migrations

└── shared/
    └── src/
        ├── auth.ts              # Auth Zod schemas
        └── payment.ts           # Payment Zod schemas
```

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test apps/api/src/routes/auth.test.ts

# Run tests with coverage
bun test --coverage
```

---

## 📦 Deployment

### Cloudflare Workers (API)

```bash
cd apps/api
npx wrangler deploy
```

### Cloudflare Pages (Web)

```bash
cd apps/web
bun run build
npx wrangler pages deploy dist
```

### D1 Database Migrations (Production)

```bash
cd apps/api
npx wrangler d1 migrations apply membran-db --remote
```

---

## 🎯 Roadmap

### ✅ Level 1 (MVP) - Current Sprint
- [x] Server owner registration + authentication
- [x] Email verification flow
- [x] Discord OAuth integration
- [ ] Discord bot invitation + server connection
- [ ] Pricing tier configuration
- [ ] Midtrans API integration
- [ ] Member checkout flow
- [ ] Instant role assignment
- [ ] Basic dashboard

### 🔜 Level 2 - Power Features
- [ ] Expiry management (cron jobs)
- [ ] Grace period system (5 days)
- [ ] DM reminders (7d, 3d, 1d before expiry)
- [ ] Member portal
- [ ] Analytics dashboard (MRR, churn)
- [ ] Activity logs
- [ ] Multi-tier support

### 🚀 Level 3 - Scale & Polish
- [ ] Unlimited tier ($29/month)
- [ ] Coupon/discount system
- [ ] Free trial management
- [ ] Webhook events
- [ ] Refund handling
- [ ] Data export (CSV/JSON)
- [ ] GDPR compliance
- [ ] Affiliate system
- [ ] Mobile app (React Native)

---

## 📊 Success Metrics

- **T2FV** (Time-to-First-Value): < 30 minutes
- **Activation Rate**: 60% (signups that invite bot)
- **Conversion Rate**: 40% (activated servers with first payment)
- **Monthly Churn**: < 5%
- **NPS Score**: 50+

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see LICENSE file for details.

---

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/yourusername/membran-app/issues)
- **Discord**: Join our community server
- **Email**: support@membran.app

---

**Built with ❤️ using Bun + Cloudflare + Discord**
