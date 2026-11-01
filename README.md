# FinKit

**Self-hosted** personal finance tooling: you run the web app and API on your own machine or server. Import transactions (CSV/XLSX or optional bank sync), categorize them, explore spending, and optionally push summary rows to **your** Google Sheet.

There is no FinKit cloud, no vendor account, and **no built-in analytics, telemetry, or data collection**. Nothing is sent to the authors of this software unless **you** configure an optional integration below.

## Privacy & data (short version)

| Where (all on **your** deployment) | What is kept |
|--------|----------------|
| **Your browser** | Parsed transactions while you work; optional local session (IndexedDB) if you leave “remember session” on. Optional in-memory anonymization mappings (never persisted). |
| **Your self-hosted API** (SQLite file on **your** server or laptop) | Merchant→category rules, sheet/settings preferences, encrypted bank connection tokens (if bank sync is on). **Transaction history is not written to this database**—only connection metadata and rules. |
| **Nowhere else by default** | No FinKit-operated cloud, no background uploads, crash reports, usage stats, or third-party trackers in the app. |

**Optional outbound connections (you enable these):**

- **Google Sheets** — only when you configure a service account and click export; sends the summary row you choose to a spreadsheet you control.
- **Open Banking (Enable Banking)** — only when `BANKING_PROVIDER=enablebanking`; **your** self-hosted API calls Enable Banking and your bank; transactions land in **your** browser. FinKit never sees your bank password.
- **Cloudflare Access** — optional gate in front of a production deploy; Cloudflare’s privacy terms apply to that layer.

See [web/public/privacy.html](./web/public/privacy.html) and [web/public/terms.html](./web/public/terms.html) for the full privacy and terms copy shown on the landing site.

## Features

- **Import**: FinanzGuru CSV/XLSX; optional Open Banking sync when configured
- **Categorization**: Client-side rules, recurring detection, and server-stored merchant rules (learned when you recategorize)
- **Review & edit**: Inline categories, bulk actions, income and review queues
- **Analytics**: Trends, category breakdowns, top expenses (computed in your browser from your data)
- **Export**: Optional push of monthly totals to your Google Sheet
- **Privacy**: Optional in-browser anonymization of names, IBANs, emails, and similar fields

## Prerequisites

- Node.js 20+ (matches Docker images)
- For Sheets export: Google Cloud service account with Sheets API enabled
- For production deploy: see [example.env](./example.env) (tunnel, registry, Google credentials)
- For bank sync: see [api/.env.example](./api/.env.example) (`BANKING_PROVIDER`, Enable Banking keys, Cloudflare Access)

## Local development

```bash
cd api && npm install && npm run dev    # http://localhost:3003
cd web && npm install && npm run dev    # http://localhost:5173 — proxies /api → :3003
```

Open **http://localhost:5173/app/** for the app (landing page is at `/`).

Copy [api/.env.example](./api/.env.example) to `api/.env` and adjust optional features. Defaults are enough for import, categorization, and merchant rules (SQLite under `api/data` on your machine).

### Tests

```bash
cd api && npm test
cd web && npm test
```

## Production (Docker)

You host the containers; data stays in volumes you control:

```bash
cp example.env .env   # fill in values
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

API health: `GET /health`. Persistent SQLite data uses the `finkit-api-data` volume on **your** host.

Root [docker-compose.yml](./docker-compose.yml) builds the same web and API images for local or CI use; wire ports or a reverse proxy so the browser can reach the web container and `/api` can reach the API.

## Google Sheets (optional)

Only runs when you set credentials and export from the app:

1. In [Google Cloud Console](https://console.cloud.google.com/), enable the Sheets API and create a service account.
2. Share your spreadsheet with the service account email (Editor).
3. **Local API**: set `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `api/.env` to the JSON key file.
4. **Docker production**: set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` in root `.env` (see [example.env](./example.env)).
5. In the app **Settings**, set sheet URL/ID, tab name (e.g. `2026`), and map categories to columns.

The export expects a monthly summary layout (month row plus category columns and totals). Use Settings to align mappings with your sheet.

## Project layout

```
api/          NestJS API — merchant rules, settings, Sheets export, optional banking
web/          React + Vite — parsing, categorization, UI (/ and /app/)
example.env   Production compose secrets template
```

## Tech stack

- **Web**: React 18, Vite, TanStack Router, TailwindCSS, Recharts
- **API**: NestJS, SQLite (better-sqlite3), Zod
- **Export**: Google Sheets API (optional)

## License

MIT
