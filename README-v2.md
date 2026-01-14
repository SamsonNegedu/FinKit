# Transaction Analyser v2

A privacy-first transaction analysis tool that anonymizes your bank data before processing and exports to your Google Sheets yearly breakdown.

## Features

- **Privacy-First**: All personal data is anonymized before any processing
- **Smart Categorization**: Rule-based categorization with AI fallback
- **Recurring Detection**: Automatically identifies recurring transactions
- **Inline Editing**: Click any category to change it
- **Bulk Operations**: Select multiple transactions and recategorize at once
- **Advanced Analytics**: Charts, trends, and spending breakdowns
- **Google Sheets Export**: One-click export to your existing yearly breakdown

## Quick Start

### 1. Install Dependencies

```bash
# Install web dependencies
cd web-v2
npm install

# Install API dependencies
cd ../api-v2
npm install
```

### 2. Configure Environment

Create `.env` file in `api-v2/`:

```env
OPENAI_API_KEY=your-openai-api-key
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
```

### 3. Run Development Servers

In separate terminals:

```bash
# Terminal 1: Run API (runs on port 3003)
cd api-v2
npm run dev

# Terminal 2: Run Web (runs on port 5173, proxies /api to 3003)
cd web-v2
npm run dev
```

Open http://localhost:5173

## Project Structure

```
├── web-v2/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TransactionTable.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── ExportPreview.tsx
│   │   │   └── charts/
│   │   ├── lib/            # Core logic
│   │   │   ├── anonymizer.ts
│   │   │   ├── parser.ts
│   │   │   ├── categorizer.ts
│   │   │   └── recurring.ts
│   │   └── types.ts
│   └── package.json
│
├── api-v2/                 # Hono API server
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── categorize.ts
│   │   │   └── export.ts
│   │   ├── services/
│   │   │   ├── openai.ts
│   │   │   └── sheets.ts
│   │   └── lib/
│   │       └── anonymizer.ts
│   └── package.json
```

## Google Sheets Setup

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheet with the service account email

### 2. Configure Export Settings

In the app:
1. Click "Settings"
2. Paste your Google Sheet URL or ID
3. Set the tab name (e.g., "2026")
4. Map your categories to sheet columns

## Your Sheet Structure

The app is designed for this column layout:

| A | B | C | D | E | ... | R | S | T | U | V | W |
|---|---|---|---|---|-----|---|---|---|---|---|---|
| Month | Rent | Eating Out | Personal Entertainment | Subscriptions | ... | Total Expenditure | Income | Income After Expenditure | Gross Savings | Gross Investment | Net Income |

Configure mappings in Settings to match your exact layout.

## Anonymization

The following data is anonymized:

| Data Type | Anonymization |
|-----------|--------------|
| Names | `Person_ABC` |
| IBANs | `DE**********5515` |
| Account Numbers | `Acc_XYZ123` |
| Emails | `j***@gmail.com` |
| Phone Numbers | `+*********1234` |

Mappings are kept in memory only and never persisted.

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts
- **Backend**: Hono (lightweight Express alternative)
- **AI**: OpenAI GPT-4o-mini
- **Export**: Google Sheets API
