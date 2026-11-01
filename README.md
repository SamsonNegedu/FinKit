# FinKit

**Self-hosted** personal finance tooling: you run the web app and API on your own machine or server. Import transactions (CSV/XLSX or optional bank sync), categorize them, explore spending, and optionally push summary rows to **your** Google Sheet.

There is no FinKit cloud, no vendor account, and **no built-in analytics, telemetry, or data collection**. Nothing is sent to the authors of this software unless **you** configure an optional integration below.

## Privacy & data (short version)

| Where (all on **your** deployment) | What is kept |
|--------|----------------|
| **Your browser** | Parsed transactions from **file import** (never uploaded to the API); optional local session (IndexedDB) if you leave “remember session” on. Optional in-memory anonymization mappings (never persisted). |
| **Your self-hosted API** (SQLite on **your** server or laptop) | Per-user merchant rules, settings, encrypted bank connection tokens, and (if bank sync is on) **synced bank transactions** on the server—scoped by signed-in user, with descriptive fields encrypted at rest. Disconnecting a bank or using **Stored bank data** on the Banks page removes server-side sync data. |
| **Nowhere else by default** | No FinKit-operated cloud, no background uploads, crash reports, usage stats, or third-party trackers in the app. |

**Optional outbound connections (you enable these):**

- **Google Sheets** — only when you configure a service account and export from the app; sends the summary row you choose to a spreadsheet you control.
- **Open Banking (Enable Banking)** — only when `BANKING_PROVIDER=enablebanking`; **your** API talks to Enable Banking and your bank. FinKit never sees your bank password.
- **Cloudflare Access** — in production, the recommended gate in front of the app; the API verifies Access JWTs itself. Cloudflare’s privacy terms apply to that layer.

See [web/public/privacy.html](./web/public/privacy.html) and [web/public/terms.html](./web/public/terms.html) for the full privacy and terms copy shown on the landing site.

## Features

- **Import**: FinanzGuru CSV/XLSX (client-side); optional Open Banking sync when configured
- **Multi-user (allowlist)**: `ALLOWED_USER_EMAILS` — each person sees only their rules, settings, banks, and synced data ([details](./docs/users-and-access.md))
- **Categorization**: Client-side rules, recurring detection, and server-stored merchant rules (learned when you recategorize)
- **Review & edit**: Inline categories, bulk actions, income and review queues
- **Analytics**: Trends, category breakdowns, top expenses (computed in the browser from your data)
- **Export**: Optional push of monthly totals to your Google Sheet
- **Privacy**: Optional in-browser anonymization of names, IBANs, emails, and similar fields

## Prerequisites

- Node.js 20+ (matches Docker images)
- For Sheets export: Google Cloud service account with Sheets API enabled
- For production deploy: [example.env](./example.env) (tunnel, registry, Google credentials, **Cloudflare Access**, **ALLOWED_ORIGIN**, **ALLOWED_USER_EMAILS**)
- For bank sync: [api/.env.example](./api/.env.example) and [Enable Banking setup](./docs/enable-banking-setup.md)

## Local development

From the repo root (`npm install` once installs root tooling only):

```bash
npm run install:all   # api + web dependencies
npm run dev           # API :3003 and web :5173 together
# or: npm run dev:api | npm run dev:web in separate terminals
```

Or per package:

```bash
cd api && npm install && npm run dev    # http://localhost:3003
cd web && npm install && npm run dev    # http://localhost:5173 — proxies /api → :3003
```

Open **http://localhost:5173/app/** for the app (landing page is at `/`).

Copy [api/.env.example](./api/.env.example) to `api/.env`. Defaults are enough for local import, categorization, and merchant rules (SQLite under `api/data`). Locally you are `dev@localhost`; use header `X-Dev-User: other@example.com` to simulate another allowlisted user (ignored in production).

### Tests and quality

```bash
npm test              # api + web
npm run check         # oxlint + oxfmt --check in both packages
npm run lint:fix && npm run format   # auto-fix style (run format after lint:fix)
npm run build         # production build both packages
```

## Documentation

- [Users and access](./docs/users-and-access.md) — Cloudflare Access, allowlist, per-user data, production env requirements
- [Web frontend architecture](./docs/web-architecture.md) — feature layout, AppState, conventions
- [Enable Banking setup](./docs/enable-banking-setup.md) — optional open banking configuration

## Production (Docker)

You host the containers; data stays in volumes you control.

1. Copy [example.env](./example.env) to `.env` and set at least **`ALLOWED_USER_EMAILS`**, **`CF_ACCESS_TEAM_DOMAIN`**, **`CF_ACCESS_AUD`**, and **`ALLOWED_ORIGIN`** (the API **will not start** in production without Cloudflare Access config and a fixed web origin). See [users and access](./docs/users-and-access.md).
2. Deploy:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

API health: `GET /health`. Persistent SQLite data uses the `finkit-api-data` volume on **your** host.

Root [docker-compose.yml](./docker-compose.yml) builds the same web and API images for local or CI use; wire ports or a reverse proxy so the browser can reach the web container and `/api` can reach the API.

## Google Sheets (optional)

Only runs when you set credentials and export from the app:

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the Sheets API and create a service account.
2. Share **only** the spreadsheet FinKit should use with the service account email (Editor). Export calls pass a spreadsheet id from the app; **narrow sharing on the SA** is what limits where it can write ([users and access — Sheets](./docs/users-and-access.md#google-sheets-export)).
3. **Local API**: `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `api/.env`.
4. **Docker production**: `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in root `.env` (see [example.env](./example.env)).
5. In **Settings**, set sheet URL/ID, tab name, and category column mappings.

Tab names and column letters are validated before any Google API call. The export expects a monthly summary layout (month row plus category columns and totals).

## Project layout

```
package.json  Root scripts: dev, build, test, lint, format, check (both packages)
api/          NestJS API — access control, per-user rules/settings, Sheets export, optional banking
web/          React + Vite SPA (see docs/web-architecture.md)
docs/         Architecture and integration guides
example.env   Production compose and secrets template
```

## Tech stack

- **Web**: React 18, Vite, TanStack Router, TanStack Query, TailwindCSS, Recharts
- **API**: NestJS, SQLite (better-sqlite3), Zod, oxlint/oxfmt
- **Export**: Google Sheets API (optional)
- **Auth (production)**: Cloudflare Access JWT verification on the API

## License

MIT
