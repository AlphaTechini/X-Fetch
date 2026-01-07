# X-Fetch: Developer Tweet Monitor

Browser automation tool that scrapes high-signal developer posts from X using Playwright with persistent sessions.

## Features

- 🔐 **Persistent Sessions**: Log in once via browser, reuse session forever
- 🤖 **Playwright Automation**: Headful browser scraping with anti-detection
- 🔍 **Smart Filtering**: 5000+ followers, developer keywords, no spam
- 📧 **Email Notifications**: Resend API integration for hourly summaries
- 💾 **SQLite Storage**: Local database with deduplication
- ⏰ **Hourly Scheduler**: Automated fetches via node-cron

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd Backend
pnpm install
pnpm run install-browser

# Frontend
cd ../Frontend
pnpm install
```

### 2. Configure Environment

```bash
cd Backend
cp .env.example .env
# Edit .env with your values
```

### 3. First-Time Login

```bash
cd Backend
pnpm run login
# Browser opens → Log in to X manually → Close browser
```

### 4. Run

```bash
# Terminal 1: Backend
cd Backend
pnpm run dev

# Terminal 2: Frontend
cd Frontend
pnpm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check / wake-up ping |
| `/api/session` | GET | Check X login status |
| `/api/tweets` | GET | Get recent tweets |
| `/api/fetch-now` | POST | Trigger manual fetch |
| `/api/status` | GET | Overall status |

## Search Keywords

**Included:**
backend engineer, frontend dev, API design, GraphQL, database performance, React, Next.js, Solidity, smart contracts, debugging, refactoring, scaling systems, shipping code, production bugs, EVM, gas optimization, audit, schema, migration, Svelte, deployed, shipped, broke, fixed, optimizing, vibe coding

**Excluded:**
airdrop, giveaway, whitelist, presale, NFT mint, RT to win, gm, follow back

## Session Recovery

If X logs you out:

1. Stop the server
2. Run `npm run login`
3. Log in via browser
4. Restart server

## Deployment Notes

- Backend on Render: Frontend pings `/health` every 5 min to prevent cold start
- SQLite persists locally; consider external DB for production
- `user-data/` directory must persist between deploys
