# FinKit

Self-hosted personal finance tooling. Import transactions (CSV/XLSX or bank sync), categorize them, explore your spending, and optionally push monthly totals to your own Google Sheet.

## Privacy

No FinKit cloud, no accounts, no telemetry. Everything runs on your machine or server.

- **Browser**: file imports are parsed locally and never uploaded.
- **Your API** (SQLite on your host): per-user rules, settings, encrypted bank tokens, and synced bank transactions (encrypted at rest). Disconnecting a bank removes its synced data.
- **Optional outbound calls, only if you enable them**: Google Sheets, Enable Banking (`BANKING_PROVIDER=enablebanking`), and Cloudflare Access as the production login gate.

Full copy: [privacy](./web/public/privacy.html) · [terms](./web/public/terms.html)

## Features

- **Import**: FinanzGuru CSV/XLSX, or Open Banking sync
- **Categorize**: rules, recurring detection, merchant rules learned from your edits
- **Review**: inline edits, bulk actions, review queues
- **Analytics**: trends, category breakdowns, top expenses, computed in the browser
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

## Stack

React, Vite, TanStack Router/Query, Tailwind, Recharts · NestJS, SQLite, Zod · Cloudflare Access JWT auth

## License

MIT
