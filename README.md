# FinKit

Self-hosted personal finance for you and the people you share a server with. Sync your banks, categorize and review transactions, set budgets, track trips and recurring contracts, and optionally push monthly totals to your own Google Sheet.

## Privacy

No FinKit cloud, no accounts, no telemetry. Everything runs on your machine or server.

- **Browser**: analytics, budget progress and trip suggestions are computed locally from your transactions.
- **Your API** (SQLite on your host): per-user rules, settings, budgets, trips, contracts, bank tokens and synced bank transactions. Bank and trip details are encrypted at rest. Disconnecting a bank removes its synced data.
- **Optional outbound calls, only if you enable them**: Google Sheets, Enable Banking (`BANKING_PROVIDER=enablebanking`), and Cloudflare Access as the production login gate.

Full copy: [privacy](./web/public/privacy.html) · [terms](./web/public/terms.html)

## Features

- **Bank sync**: connect banks through Open Banking (Enable Banking), with several accounts per person, balances and back-filled history
- **Transactions**: one table with inline edits, bulk actions, merchant pages and categories picked from a popover
- **Review**: queues for transactions that need a category or a second look
- **Categorize**: rules, recurring detection and merchant rules learned from your edits
- **Budgets**: monthly limit per category with rollover, an overall monthly cap and a month switcher
- **Trips**: group flights, stays and other spending, split costs between travelers, and compare against a trip budget
- **Contracts**: detects recurring payments and lets you add your own
- **Income and analytics**: trends, category breakdowns and top expenses, computed in the browser
- **Multi-user**: allowlist via `ALLOWED_USER_EMAILS`, each person sees only their own data
- **Anonymize**: optionally mask names, IBANs and emails in the UI
- **Export**: monthly totals to Google Sheets

## Quick start

Needs Node.js 26.13+ (see `.nvmrc`).

```bash
npm run install:all   # api + web dependencies
cp api/.env.example api/.env
npm run dev           # API :3003, web :5173
```

Open http://localhost:5173/app/. Locally you are `dev@localhost`; send `X-Dev-User: other@example.com` to act as another allowlisted user (ignored in production).

```bash
npm test              # api + web
npm run check         # lint + format check
npm run lint:fix && npm run format
npm run build
```

## Production

Copy [.env.example](./.env.example) to `.env`, set `ALLOWED_USER_EMAILS`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` and `ALLOWED_ORIGIN`, then:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The API won't start in production without Cloudflare Access config. Details, including key files: [deployment](./docs/deployment.md).

## Docs

- [Deployment](./docs/deployment.md): Docker, secrets, key generation
- [Users and access](./docs/users-and-access.md): Cloudflare Access, allowlist, per-user data
- [Enable Banking setup](./docs/enable-banking-setup.md): bank sync
- [Google Sheets](./docs/google-sheets.md): export setup
- [Web architecture](./docs/web-architecture.md): frontend layout and conventions
- [Budgets](./docs/budgets.md): monthly limits per category
- [Trips](./docs/trips.md): getting transactions into a trip

## Stack

React, Vite, TanStack Router/Query, Tailwind, Recharts · NestJS, SQLite, Zod · Cloudflare Access JWT auth

## License

MIT
