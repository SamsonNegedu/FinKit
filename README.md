# FinKit

A simple tool to parse and visualize transaction records exported from FinanzGuru.

## Features

- **CSV/XLSX Import**: Parse transaction exports from FinanzGuru
- **Privacy-First**: Anonymizes personal data before processing
- **Smart Categorization**: Rule-based categorization with AI fallback
- **Recurring Detection**: Identifies recurring transactions automatically
- **Interactive Dashboard**: View spending trends, category breakdowns, and top expenses
- **Bulk Editing**: Select and recategorize multiple transactions at once
- **Google Sheets Export**: Export to your existing yearly budget spreadsheet

## Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key (for AI categorization)
- Google Service Account (for Sheets export, optional)

### 1. Setup Environment

Create `.env` file in the `api/` directory:

```env
OPENAI_API_KEY=your-openai-api-key
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account.json
```

### 2. Install & Run with Docker

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

The web app will be available at `http://localhost:5173` (dev) or `http://localhost` (production).

### 3. Manual Setup (without Docker)

```bash
# Install API dependencies
cd api
npm install

# Install Web dependencies
cd ../web
npm install

# Run both (in separate terminals)
cd api && npm run dev      # API runs on :3003
cd web && npm run dev      # Web runs on :5173
```

## Usage

1. **Export from FinanzGuru**: Export your transactions as CSV or XLSX
2. **Upload**: Drag and drop the file into the web interface
3. **Review**: Check auto-categorized transactions, edit as needed
4. **Analyze**: View charts and spending breakdowns
5. **Export**: (Optional) Export to Google Sheets

## Project Structure

```
├── api/                    # Backend API (Hono)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # OpenAI, Sheets integration
│   │   └── lib/            # Anonymization logic
│   └── Dockerfile
│
├── web/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── lib/            # Parsers, categorization
│   │   └── types.ts
│   └── Dockerfile
│
└── docker-compose.yml      # Development setup
```

## Data Privacy

All sensitive data is anonymized before processing:

- **Names**: `Person_ABC`
- **IBANs**: `DE**********5515`
- **Account Numbers**: `Acc_XYZ123`
- **Emails**: `j***@gmail.com`
- **Phone Numbers**: `+*********1234`

Anonymization mappings are kept in memory only and never persisted.

## Google Sheets Setup (Optional)

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Sheets API
3. Create a Service Account and download JSON key
4. Share your Google Sheet with the service account email

### 2. Configure in App

1. Open Settings panel
2. Enter your Google Sheet URL or ID
3. Set the target tab name (e.g., "2026")
4. Map categories to sheet columns

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts
- **Backend**: Hono (Node.js)
- **AI**: OpenAI GPT-4o-mini
- **Export**: Google Sheets API

## License

MIT
